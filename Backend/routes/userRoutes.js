const express=require("express");
const router=express.Router();
const {signupValidation}=require("../helper/validation");
const userController=require("../controller/userController")

router.post('/register',signupValidation,userController.register)

module.exports=router;