const twilio = require('twilio');
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

const sendOtp = async (phoneNumber, otp) => {
    try {
        // Ensure phone number is in E.164 format
        const formattedNumber = `+91${phoneNumber}`; // Assuming Indian phone numbers; change this as needed

        const message = await client.messages.create({
            body: `Your OTP code is ${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: formattedNumber
        });

        console.log('OTP sent successfully:', message.sid);
    } catch (error) {
        console.error('Error sending OTP:', error);
        throw error;
    }
};

module.exports = sendOtp;
