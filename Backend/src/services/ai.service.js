const { GoogleGenAI } = require("@google/genai");
const { z } = require("zod");
const { zodToJsonSchema } = require("zod-to-json-schema");
const puppeteer = require("puppeteer");

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENAI_API_KEY
});

// Zod schema for AI validation
const interviewReportSchema = z.object({
  title: z.string(),
  matchScore: z.number().min(0).max(100),
  technicalQuestions: z.array(z.object({
    question: z.string(),
    intention: z.string(),
    answer: z.string()
  })),
  behavioralQuestions: z.array(z.object({
    question: z.string(),
    intention: z.string(),
    answer: z.string()
  })),
  skillGaps: z.array(z.object({
    skill: z.string(),
    severity: z.enum(["low", "medium", "high"])
  })),
  preparationPlan: z.array(z.object({
    day: z.number(),
    focus: z.string(),
    tasks: z.array(z.string())
  }))
});

/**
 * Sanitize AI output to match Mongoose schema
 */
function sanitizeAIOutput(report) {
  const safeArray = (arr, fallbackItem) => {
    if (!Array.isArray(arr) || arr.length === 0) return [fallbackItem];
    return arr.map(item => {
      if (typeof item === "string") return fallbackItem;
      return item;
    });
  };

  return {
    title: report.title || "Software Engineer",
    matchScore: typeof report.matchScore === "number" ? report.matchScore : 50,
    technicalQuestions: safeArray(report.technicalQuestions, {
      question: "Explain your core project or experience.",
      intention: "To assess your technical understanding",
      answer: "Provide a detailed explanation including technologies, approach, and outcome."
    }),
    behavioralQuestions: safeArray(report.behavioralQuestions, {
      question: "Describe a challenging situation at work.",
      intention: "To assess problem-solving and soft skills",
      answer: "Explain the context, actions you took, and the result."
    }),
    skillGaps: safeArray(report.skillGaps, {
      skill: "Communication",
      severity: "medium"
    }),
    preparationPlan: safeArray(report.preparationPlan, {
      day: 1,
      focus: "General Preparation",
      tasks: ["Review fundamentals", "Practice problem solving", "Read documentation"]
    }).map((p, index) => {
      // Ensure proper object structure
      if (typeof p !== "object" || !p.day || !p.focus || !Array.isArray(p.tasks)) {
        return {
          day: index + 1,
          focus: typeof p === "string" ? p : "Focus TBD",
          tasks: typeof p === "string" ? [p] : ["Task TBD"]
        };
      }
      return p;
    })
  };
}

/**
 * Generate structured interview report using Google GenAI
 */
async function generateInterviewReport({ resume, selfDescription, jobDescription }) {
  const titleMatch = jobDescription?.match(/Job Title:\s*(.*)/i);
  const title = titleMatch?.[1]?.trim() || "Software Engineer";

  const prompt = `
You are an expert interviewer and career coach.

Generate a structured interview report for the following candidate:

Resume:
${resume}

Self Description:
${selfDescription}

Job Description:
${jobDescription}

Return STRICT JSON in this exact format:

{
  "title": "${title}",
  "matchScore": 0-100,
  "technicalQuestions": [
    { "question": "", "intention": "", "answer": "" }
  ],
  "behavioralQuestions": [
    { "question": "", "intention": "", "answer": "" }
  ],
  "skillGaps": [
    { "skill": "", "severity": "low|medium|high" }
  ],
  "preparationPlan": [
    { "day": 1, "focus": "", "tasks": [""] }
  ]
}

Rules:
- Do NOT leave any array empty
- Return at least 3 technical questions, 3 behavioral questions, 2 skill gaps, and 5 preparation plan tasks
- Ensure valid JSON, parsable without errors
- Keep the JSON format exactly as shown
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: zodToJsonSchema(interviewReportSchema)
      }
    });

    const parsed = JSON.parse(response.text);
    return sanitizeAIOutput(parsed);

  } catch (err) {
    console.error("Error generating interview report:", err);
    // Return fallback safe report
    return sanitizeAIOutput({});
  }
}

/**
 * Convert HTML to PDF using puppeteer
 */
async function generatePdfFromHtml(htmlContent) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" }
  });

  await browser.close();
  return pdfBuffer;
}

/**
 * Generate resume PDF using AI
 */
async function generateResumePdf({ resume, selfDescription, jobDescription }) {
  const resumePdfSchema = z.object({
    html: z.string()
  });

  const prompt = `
Generate a professional, ATS-friendly resume in HTML format for the following candidate:

Resume:
${resume}

Self Description:
${selfDescription}

Job Description:
${jobDescription}

Requirements:
- Tailor the resume to highlight strengths relevant to the job
- 1-2 pages in PDF, visually appealing but simple
- Use some color or font styles but maintain professionalism
- Return STRICT JSON with a single field "html"
`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: zodToJsonSchema(resumePdfSchema)
    }
  });

  const jsonContent = JSON.parse(response.text);
  return await generatePdfFromHtml(jsonContent.html);
}

module.exports = {
  generateInterviewReport,
  generateResumePdf
};