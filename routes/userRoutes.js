const express=require("express");
const router=express.Router();
const {signupValidation}=require("../helper/validation");
const userController=require("../controller/userController")
const emailVerification=require("../controller/emailVerification");
const otpVerification=require("../controller/otpVerification")
const login=require("../controller/login");
const resendCredentials = require("../controller/resendCredential");
const resendotp=require("../controller/resendotp")
const auth=require("../controller/auth")
const {protect}=require("../helper/authMiddleware")
// const authenticate=require("../controller/auth")

const sendotp=require("../controller/sendotp")


const db=require("../config/dbConnection")


// const axios =require("axios")











router.post('/register',userController.register);
router.get('/verify-email',emailVerification.verifyEmail);
router.post('/verify-otp',otpVerification.verifyOtp);
router.post('/login',login.login);
router.post('/resend-credentials',resendCredentials.resendCredentials);
router.post('/resend-otp',resendotp.resendOtp);
router.post('/send-otp',sendotp.sendotp);

router.get('/auth/google', auth.authenticate);
router.get('/auth/google/callback', auth.callback);
router.get('/dashboard', auth.dashboard);
router.get('/auth/google/callback', auth.callback);




module.exports=router;