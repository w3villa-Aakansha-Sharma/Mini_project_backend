const db = require("../config/dbConnection");
const crypto = require("crypto");
const otplib = require('otplib');
const sendOtp = require("../helper/sendOtp");
const errorResponse=require("../helper/errorResponse.json")
const successResponse=require("../helper/successResponse.json")

const resendOtp = async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).send({ msg:errorResponse.invalidCredentials });
    }

    const hashedToken = token;

    try {

        db.query(`SELECT * FROM user_verification_table WHERE verification_hash = ?`, [hashedToken], async (err, results) => {
            if (err) {
                console.error('Database query error:', err);
                return res.status(500).send({ msg:errorResponse.databaseErr });
            }

            if (!results || results.length === 0) {
                return res.status(404).send({ msg:errorResponse.notFoundUser });
            }

            const userVerification = results[0];
            console.log(userVerification)
            const mobileNumber = userVerification.mobile_number;
            console.log("mobile number is",mobileNumber)

            
            otplib.authenticator.options = { digits: 6, step: 600 }; 
            const secret = otplib.authenticator.generateSecret();
            const newOtp = otplib.authenticator.generate(secret);
            const currentTime = new Date();
            
            db.query(`UPDATE user_verification_table SET mobile_otp = ? ,otp_expire_at= DATE_ADD(NOW(), INTERVAL 2 MINUTE) WHERE verification_hash = ?`, [newOtp, hashedToken], async (updateErr) => {
                if (updateErr) {
                    console.error('Database update error:', updateErr);
                    return res.status(500).send({ msg:errorResponse.databaseErr });
                }

            
                try {
                    await sendOtp(mobileNumber, newOtp);
                    return res.status(200).send({ msg:successResponse.otpSent });
                } catch (otpError) {
                    console.error('Error sending OTP:', otpError);
                    return res.status(500).send({ msg:errorResponse.sendFail, error: otpError });
                }
            });
        });
    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).send({ msg:errorResponse.serverErr, error });
    }
};

module.exports = { resendOtp };
