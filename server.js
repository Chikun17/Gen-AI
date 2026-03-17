require("dotenv").config()
const app = require('./src/app.js')
const connectToDB = require('./src/config/database.js')

connectToDB()

app.listen(3000,()=>{
    console.log("server is running on the port 3000")
})