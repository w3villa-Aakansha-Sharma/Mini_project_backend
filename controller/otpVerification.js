const crypto = require('crypto');
const db = require('../config/dbConnection');

const verifyOtp = (req, res) => {
    const token = req.body.token;
    const userOtp = req.body.otp;

    const verificationHash = token;
    console.log(verificationHash);

    db.query(`SELECT * FROM user_verification_table WHERE verification_hash = ?`, [verificationHash], (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ msg: 'Database query error' });
        }

        if (!result || !result.length) {
            return res.status(400).json({ msg: 'Invalid OTP or token' });
        }

        const verificationRecord = result[0];
        const currentTime = new Date();

        // Check if the OTP matches
        if (userOtp !== verificationRecord.mobile_otp) {
            return res.status(400).json({ msg: 'Invalid OTP' });
        }
        db.query(`UPDATE user_verification_table SET is_mobile_verified=true WHERE verification_hash = ?`, [verificationHash], (err, updateResult) => {
            if (err) {
                console.error('Database update error:', err);
                return res.status(500).json({ msg: 'Database update error' });
            }

           
        });

        

        db.query(`UPDATE user_verification_table SET mobile_verified_at = NOW() WHERE verification_hash = ?`, [verificationHash], (err, updateResult) => {
            if (err) {
                console.error('Database update error:', err);
                return res.status(500).json({ msg: 'Database update error' });
            }

            return res.status(200).json({ msg: 'OTP verified successfully' });
        });
       
    });
};

module.exports = { verifyOtp };
