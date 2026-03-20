const express = require('express')
const app = express()
const cookieParser = require("cookie-parser")


app.use(express.json())
app.use(cookieParser())

//require all the routes here
const authRouter = require('./routes/auth.routes.js')


//using all the routes
app.use("/api/auth",authRouter)


module.exports=app