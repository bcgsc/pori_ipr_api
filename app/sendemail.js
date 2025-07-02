const nodemailer = require('nodemailer');

const CONFIG = require('./config');

const {email, password, domain, ehost} = CONFIG.get('email');

const sendEmail = async (subject, text, toEmail) => {
  const transporter = nodemailer.createTransport({
    host: ehost,
    auth: {
      user: email,
      pass: password,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const mailOptions = {
    from: `${email}${domain}`,
    to: toEmail,
    subject,
    text,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = {sendEmail};
