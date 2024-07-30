const express=require("express");
const router=express.Router();
const {signupValidation}=require("../helper/validation");
const userController=require("../controller/userController")
const emailVerification=require("../controller/emailVerification");
const otpVerification=require("../controller/otpVerification")
const login=require("../controller/login");
const resendCredentials = require("../controller/resendCredential");

router.post('/register',signupValidation,userController.register);
router.get('/verify-email',emailVerification.verifyEmail);
router.post('/verify-otp',otpVerification.verifyOtp);
router.post('/login',login.login);
router.post('/resend-credentials',resendCredentials.resendCredentials);
module.exports=router;