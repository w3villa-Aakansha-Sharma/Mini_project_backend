const crypto = require('crypto');
const db = require('../config/dbConnection');
const queries = require('../helper/queries');
const jwt = require('jsonwebtoken');

const verifyOtp = (req, res) => {
    const token = req.body.token;
    const userOtp = req.body.otp;

    const verificationHash = token;
    console.log('Verification Hash:', verificationHash);

    db.query(queries.selectVerificationRecordByHash, [verificationHash], (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ msg: 'Database query error' });
        }

        if (!result || result.length === 0) {
            return res.status(400).json({ msg: 'Invalid OTP or token' });
        }

        const verificationRecord = result[0];
        const currentTime = new Date();

        if (currentTime > new Date(verificationRecord.otp_expire_at)) {
            return res.status(400).json({ msg: 'OTP has expired. Please resend OTP.' });
        }

        if (userOtp !== verificationRecord.mobile_otp) {
            return res.status(400).json({ msg: 'Invalid OTP' });
        }

        // Update the verification status
        db.query(queries.updateMobileVerificationStatus, [verificationHash], (err, updateResult) => {
            if (err) {
                console.error('Database update error:', err);
                return res.status(500).json({ msg: 'Database update error' });
            }

            // Update next_action in user_table to null
            db.query(queries.updateNextActionToNull, [verificationHash], (err, userUpdateResult) => {
                if (err) {
                    console.error('Database update error:', err);
                    return res.status(500).json({ msg: 'Database update error' });
                }

                // Generate a JWT token
                const userId = verificationRecord.user_id; // Assuming you have a `user_id` field in the verificationRecord
                const email = verificationRecord.email; // Assuming you have an `email` field in the verificationRecord
                const userData = JSON.parse(verificationRecord.user_data);
                const jwtSecret = process.env.JWT_SECRET || 'your-secret-key'; // Replace with your secret key
                const token = jwt.sign({ name:userData.username , email: userData.email }, jwtSecret, { expiresIn: '2min' });

                // Send the JWT token to the frontend
                return res.status(200).json({ msg: 'OTP verified successfully', token: token });
            });
        });
    });
};

module.exports = { verifyOtp };
