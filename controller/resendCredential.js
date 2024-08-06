const { validationResult } = require("express-validator");
const db = require("../config/dbConnection");
const crypto = require("crypto");
const otplib = require('otplib');
const sendMail = require("../helper/sendMail");
const sendOtp = require("../helper/sendOtp");
const queries = require("../helper/queries");

const resendCredentials = async (req, res) => {
    console.log("Request body:", req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error("Validation errors:", errors.array());
        return res.status(400).json({ errors: errors.array() });
    }

    const email = req.body.email;
  

    console.log("Checking if user exists for email:", email);
    db.query(queries.checkUsersExists, [email], async (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).send({ msg: 'Database query error' });
        }

        console.log('Query result:', result);
        if (result.length === 0) {
            console.log('User not found for email:', email);
            return res.status(404).send({ msg: 'User not found' });
        } else {
            console.log('User found:', result[0]);

            // Generate new verification hash and OTP
            const verificationToken = crypto.randomBytes(32).toString('hex');
            const verificationHash = crypto.createHash('sha256').update(verificationToken).digest('hex');

            

            console.log('Generated verification hash ', verificationHash);

            // Update verification record
            db.query(queries.updateVerificationCredentials, [verificationHash, email], async (err, result) => {
                if (err) {
                    console.error('Database update error:', err);
                    return res.status(500).send({ msg: 'Database update error', error: err });
                }

                console.log('Verification record updated successfully:', result);

                // Send verification email
                const mailSubject = 'New Verification Credentials';
                const content = `<p>Your new verification link is: <br/><a href="http://localhost:3000/verify-email?token=${verificationHash}">Verify</a></p>`;
                try {
                    await sendMail(email, mailSubject, content);
                    console.log('Verification email sent to:', email);

                   

                    return res.status(200).send({ msg: 'Credentials resent successfully. Please check your email for verification.'});
                } catch (error) {
                    console.error('Error sending credentials:', error);
                    return res.status(500).send({ msg: 'Failed to send OTP or email', error });
                }
            });
        }
    });
};

module.exports = { resendCredentials };
