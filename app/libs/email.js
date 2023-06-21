const nodemailer = require('nodemailer');
const CONFIG = require('../config');

const {email, password} = CONFIG.get('email');

const sendEmail = () => {
  const transporter = nodemailer.createTransport({
    host: 'webmail.bcgsc.ca',
    auth: {
      user: email,
      pass: password,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const mailOptions = {
    from: 'rpletz@bcgsc.ca',
    to: 'rpletz@bcgsc.ca',
    subject: 'Sending Email using Node.js',
    text: 'That was easy!',
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log(`Email sent: ${info.response}`);
    }
  });
};

module.exports = sendEmail;
