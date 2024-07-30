const crypto = require('crypto');
const db = require('../config/dbConnection');
const queries = require('../helper/queries');

const verifyOtp = (req, res) => {
    const token = req.body.token;
    console.log(token);
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

        // Check if the OTP matches
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

                return res.status(200).json({ msg: 'OTP verified successfully' });
            });
        });
    });
};

module.exports = { verifyOtp };
