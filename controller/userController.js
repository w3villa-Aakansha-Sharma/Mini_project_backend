const { validationResult } = require("express-validator");
const db = require("../config/dbConnection");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const otplib = require('otplib');
const sendMail = require("../helper/sendMail");
const sendOtp = require("../helper/sendOtp");

const register = async (req, res) => {
    console.log(req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const email = db.escape(req.body.email);

    db.query(`SELECT * FROM user_verification_table WHERE LOWER(email) = LOWER(${email});`, (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).send({ msg: 'Database query error' });
        }

        if (result && result.length) {
            return res.status(409).send({ msg: 'The Email already exists' });
        } else {
            bcrypt.hash(req.body.password, 10, async (err, hash) => {
                if (err) {
                    console.error('Error in generating hash password:', err);
                    return res.status(500).send({ msg: 'Error in generating Hash Password' });
                } else {
                    // Generate unique reference ID
                    const uniqueReferenceId = crypto.randomBytes(16).toString('hex');

                    // Generate OTP
                    otplib.authenticator.options = { digits: 6, step: 600 }; // step is 600 seconds (10 minutes)
                    const secret = otplib.authenticator.generateSecret(); // Generate a unique secret for the user
                    const mobileOtp = otplib.authenticator.generate(secret);

                    const verificationToken = crypto.randomBytes(32).toString('hex');
                    const verificationHash = crypto.createHash('sha256').update(verificationToken).digest('hex');

                    const userData = JSON.stringify({
                        username: req.body.username,
                        email: req.body.email,
                        password: hash,
                        mobileNumber: req.body.mobileNumber
                    });

                    const query = `
                        INSERT INTO user_verification_table (
                            unique_reference_id, verification_hash, user_data, expire_at, mobile_otp, email
                        ) VALUES (
                            ?, ?, ?, DATE_ADD(NOW(), INTERVAL 50 MINUTE), ?, ?
                        )`;

                    db.query(query, [uniqueReferenceId, verificationHash, userData, mobileOtp, req.body.email], async (err, result) => {
                        if (err) {
                            console.error('Database insert error:', err);
                            return res.status(500).send({ msg: 'Database insert error', error: err });
                        }

                        // Send verification email
                        const mailSubject = 'Mail Verification';
                        const content = `<p>Please click the link below to verify your email:<br/><a href="http://localhost:3000/verify-email?token=${verificationHash}">Verify</a></p>`;
                        await sendMail(req.body.email, mailSubject, content);

                        // Send OTP via SMS
                        try {
                            await sendOtp(req.body.mobileNumber, mobileOtp);
                            return res.status(201).send({ msg: 'User registered successfully. Please check your email and mobile for verification.', otp: mobileOtp });
                        } catch (error) {
                            console.error('Error sending OTP:', error);
                            return res.status(500).send({ msg: 'User registered, but failed to send OTP', error });
                        }
                    });
                }
            });
        }
    });
};

module.exports = { register };
