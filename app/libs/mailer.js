const nodemailer = require('nodemailer');
const CONFIG = require('../config');

const {email, password, domain, ehost} = CONFIG.get('email');

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

const sendEmail = async ({to, subject, text}) => {
  return transporter.sendMail({
    from: `${email}${domain}`,
    to,
    subject,
    text,
  });
};

module.exports = {sendEmail};
