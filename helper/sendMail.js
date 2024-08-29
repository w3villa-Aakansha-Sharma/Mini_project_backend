const nodemailer = require('nodemailer');
const { SMTP_MAIL, SMTP_PASSWORD } = process.env;

const sendMail = async (email, mailSubject, content) => {
  try {
    
    const transporter = nodemailer.createTransport({
     service:'gmail',
      auth: {
        user: SMTP_MAIL,
        pass: SMTP_PASSWORD
      }
    });
    console.log(SMTP_MAIL);
    console.log(SMTP_PASSWORD);

    
    const mailOptions = {
      from: SMTP_MAIL,
      to: email,
      subject: mailSubject,
      html: content
    };

    
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.log('Error occurred:', err);
      } else {
        console.log('Email Sent Successfully:', info.response);
      }
    });
  } catch (err) {
    console.log('Error occurred:', err);
  }
};

module.exports = sendMail;
