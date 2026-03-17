const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    username:{
        type:String,
        unique:[true,"Username is already taken"],
        required:true
    },
    email:{
        type:String,
        unique:[true,"Email address is already taken by some other user"],
        required:true
    },
    password:{
        type:String,
        required:true,

    }
})

const userModel = mongoose.model('users')

module.exports = userModel