const crypto = require('crypto');
const db = require('../config/dbConnection');
const jwt = require('jsonwebtoken');
const errorResponse = require("../helper/errorResponse.json");
const successResponse = require("../helper/successResponse.json");

const verifyOtp = (req, res) => {
    const token = req.body.token; // OTP token passed from the frontend
    const userOtp = req.body.otp; // OTP entered by the user

    const verificationHash = token; // Assuming token is the verification hash
    console.log('Verification Hash:', verificationHash);

    // Query to get verification record by verification hash
    db.query(
        `SELECT * FROM user_verification_table WHERE verification_hash = ?`, 
        [verificationHash], 
        (err, result) => {
            if (err) {
                console.error('Database query error:', err);
                return res.status(500).json({ msg: errorResponse.databaseErr });
            }

            if (!result || result.length === 0) {
                return res.status(400).json({ msg: errorResponse.invalidCredentials });
            }

            const verificationRecord = result[0];
            const currentTime = new Date();

            // Check if OTP has expired
            if (currentTime > new Date(verificationRecord.otp_expire_at)) {
                return res.status(400).json({ msg: errorResponse.otptimeexpired });
            }

            // Check if the provided OTP matches the one stored in the database
            if (userOtp !== verificationRecord.mobile_otp) {
                return res.status(400).json({ msg: errorResponse.invalidCredentials });
            }

            // OTP is valid, update the verification status in `user_verification_table`
            db.query(
                `UPDATE user_verification_table SET mobile_verified_at = NOW() WHERE verification_hash = ?`, 
                [verificationHash], 
                (err, updateResult) => {
                    if (err) {
                        console.error('Database update error:', err);
                        return res.status(500).json({ msg: errorResponse.databaseErr });
                    }

                    // Retrieve user_id from verificationRecord to update the `user_table`
                    const userId = verificationRecord.verification_hash;

                    // Update is_mobile_verified to true in `user_table`
                    db.query(
                        `UPDATE user_table SET is_mobile_verified = ? WHERE verification_hash = ?`, 
                        [true, userId], 
                        (err, mobileUpdateResult) => {
                            if (err) {
                                console.error('Database update error for is_mobile_verified:', err);
                                return res.status(500).json({ msg: errorResponse.databaseErr });
                            }

                            // Update next_action in `user_table` to null
                            db.query(
                                `UPDATE user_table SET next_action = NULL, mobile_number = ? WHERE verification_hash = ?`, 
                                [verificationRecord.mobile_number, userId], 
                                (err, userUpdateResult) => {
                                    if (err) {
                                        console.error('Database update error:', err);
                                        return res.status(500).json({ msg: errorResponse.databaseErr });
                                    }

                                    // Fetch role from user_verification_table
                                    db.query(
                                        `SELECT role FROM user_verification_table WHERE verification_hash = ?`,
                                        [verificationHash],
                                        (err, roleResult) => {
                                            if (err) {
                                                console.error('Database query error for role:', err);
                                                return res.status(500).json({ msg: errorResponse.databaseErr });
                                            }

                                            if (!roleResult || roleResult.length === 0) {
                                                return res.status(500).json({ msg: errorResponse.invalidCredentials });
                                            }

                                            // Extract the role from the result
                                            const userRole = roleResult[0].role;
                                            const userData = JSON.parse(verificationRecord.user_data);
                                            const jwtSecret = process.env.JWT_SECRET || 'your-secret-key'; // Replace with your secret key
                                            const token = jwt.sign(
                                                { 
                                                    name: userData.username, 
                                                    email: userData.email,
                                                    role: userRole // Include role in the token payload
                                                },
                                                jwtSecret,
                                                { expiresIn: '24h' }
                                            );

                                            // Send success response with JWT token
                                            return res.status(200).json({ msg: successResponse.otpverified, token: token });
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        }
    );
};

module.exports = { verifyOtp };
