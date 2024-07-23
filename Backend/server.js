
var dotenv=require("dotenv");
dotenv.config();

const userModels=require('./model/userModel')
require('./config/dbConnection')
const userRouter=require("./routes/userRoutes")
const PORT=7000;
const express=require("express");
const cors=require("cors");
const body_parser=require("body-parser");
const app=express();
app.use(express.json());
app.use(body_parser.json());
app.use(body_parser.urlencoded({extended:true}));
app.use(cors());
userModels.createTable();



app.use('/api',userRouter);







//error handling
app.use((err,req,res,next)=>{
    err.statusCode=err.statusCode||500;
    err.message=err.message||"Internal SErver ERror";
    res.status(err.statusCode).json({
        message:err.message,
    })
});
app.listen(PORT,()=>console.log('Server is running on Port'+" "+PORT));