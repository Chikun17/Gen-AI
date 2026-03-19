const {Router} = require('express')
const authRouter = Router()
const authController = require('../controllers/auth.controller')
const authMiddleware = require("../middlewares/auth.middleware")

/**
 * @route POST /api/auth/register
 * @escription Register a new user
 * @access Public
 */
authRouter.post("/register",authController.registerUserController)



/**
 * @route POST /api/auth/login
 * @escription Register user with email and password
 * @access Public
 */
authRouter.post("/login",authController.loginUserController)


/**
 * @route GET /api/auth/logout
 * @escription clear token from user cookie nd add the token in the blacklist
 * @access Public
 */
authRouter.get("/logout", authController.logoutUserController)


/**
 * @route GET /api/auth/get-me
 * @description get the current logged in user details
 * @access Private
 */
authRouter.get("/get-me", authMiddleware.authUser, authController.getMeController)

module.exports=authRouter