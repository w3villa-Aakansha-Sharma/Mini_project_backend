const { validationResult } = require("express-validator");
const db = require("../config/dbConnection");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const otplib = require('otplib');
const sendOtp = require("../helper/sendOtp");
const errorResponse=require("../helper/errorResponse.json")

const successResponse=require("../helper/successResponse.json")
const sendotp = async (req, res) => {
    console.log(req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { token, mobileNumber } = req.body;

    
    db.query(`SELECT * FROM user_verification_table WHERE verification_hash = ?`, [token], (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).send({ msg:errorResponse.databaseErr });
        }
        console.log(result[0])

        if (!result || !result.length) {
            return res.status(400).send({ msg:errorResponse.invalidCredentials });
        }

        const user = result[0];

        if (user.is_email_verified) {
    
            otplib.authenticator.options = { digits: 6, step: 600 }; 
            const secret = otplib.authenticator.generateSecret(); 
            const mobileOtp = otplib.authenticator.generate(secret);
            console.log(mobileOtp);

            
            const query = `
                UPDATE user_verification_table
                SET mobile_otp = ?, otp_expire_at = DATE_ADD(NOW(), INTERVAL 2 MINUTE), mobile_number = ?
                WHERE verification_hash = ?
            `;

            db.query(query, [mobileOtp, mobileNumber, token], async (err, result) => {
                if (err) {
                    console.error('Database update error:', err);
                    return res.status(500).send({ msg:errorResponse.databaseErr });
                }

            
                await sendOtp(mobileNumber, mobileOtp);

                return res.status(200).send({ msg:successResponse.otpsent });
            });
        } else {
            return res.status(400).send({ msg: errorResponse.emailnotverified });
        }
    });
};


module.exports = { sendotp };
