const nodemailer = require('nodemailer');
const CONFIG = require('../config');
const db = require('../models');
const {addJobToQueue} = require('../queue');


const {email, password} = CONFIG.get('email');

const sendEmail = (subject, text, toEmail) => {
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
    from: `${email}@bcgsc.ca`,
    to: toEmail,
    subject,
    text,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log(`Email sent: ${info.response}`);
    }
  });
};

const getEmailList = async (triggers) => {
  const notifs = await db.models.notification.scope('extended').findAll({
    where: triggers,
  });

  const emailList = [];
  for (const notif of notifs) {
    if (notif.user) {
      if (!emailList.includes(notif.user.email) && notif.user.email.endsWith('@bcgsc.ca')) {
        emailList.push(notif.user.email);
      }
    } else if (notif.userGroup) {
      for (const groupUser of notif.userGroup.users) {
        if (!emailList.includes(groupUser.email) && groupUser.email.endsWith('@bcgsc.ca')) {
          emailList.push(groupUser.email);
        }
      }
    }
  }

  return emailList;
};

const notifyUsers = async (subject, text, triggers) => {
  const emailList = await getEmailList(triggers);

  emailList.forEach((toEmail) => {
    const mailOptions = {
      from: `${email}@bcgsc.ca`,
      to: toEmail,
      subject,
      text,
    };

    addJobToQueue(mailOptions);
  });
};

module.exports = {sendEmail, getEmailList, notifyUsers};