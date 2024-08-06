const { validationResult } = require("express-validator");
const db = require("../config/dbConnection");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const otplib = require('otplib');
const sendOtp = require("../helper/sendOtp");

const sendotp = async (req, res) => {
    console.log(req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { token, mobileNumber } = req.body;

    // Fetch the user based on the token
    db.query(`SELECT * FROM user_verification_table WHERE verification_hash = ?`, [token], (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).send({ msg: 'Database query error' });
        }

        if (!result || !result.length) {
            return res.status(400).send({ msg: 'Invalid token' });
        }

        const user = result[0];

        if (user.is_email_verified) {
            // Generate OTP
            otplib.authenticator.options = { digits: 6, step: 600 }; // 10 minutes validity
            const secret = otplib.authenticator.generateSecret(); // Generate a unique secret for the user
            const mobileOtp = otplib.authenticator.generate(secret);
            console.log(mobileOtp);

            // Update the database with the new OTP, mobile number, and its expiry
            const query = `
                UPDATE user_verification_table
                SET mobile_otp = ?, otp_expire_at = DATE_ADD(NOW(), INTERVAL 2 MINUTE), mobile_number = ?
                WHERE verification_hash = ?
            `;

            db.query(query, [mobileOtp, mobileNumber, token], async (err, result) => {
                if (err) {
                    console.error('Database update error:', err);
                    return res.status(500).send({ msg: 'Database update error' });
                }

                // Send OTP to the mobile number
                await sendOtp(mobileNumber, mobileOtp);

                return res.status(200).send({ msg: 'OTP sent successfully' });
            });
        } else {
            return res.status(400).send({ msg: 'Email not verified' });
        }
    });
};

module.exports = { sendotp };
