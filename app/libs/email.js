const nodemailer = require('nodemailer');
const CONFIG = require('../config');
const db = require('../models');
const {addJobToEmailQueue} = require('../queue');

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

const getEmailList = async (triggers) => {
  const notifs = await db.models.notification.scope('extended').findAll({
    where: triggers,
  });

  const emailList = [];
  for (const notif of notifs) {
    if (notif.user) {
      if (!emailList.includes(notif.user.email)
          && notif.user.email.endsWith(domain)
          && notif.user.allowNotifications) {
        emailList.push(notif.user.email);
      }
    } else if (notif.userGroup) {
      for (const groupUser of notif.userGroup.users) {
        if (!emailList.includes(groupUser.email)
            && groupUser.email.endsWith(domain)
            && groupUser.allowNotifications) {
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
      from: `${email}${domain}`,
      to: toEmail,
      subject,
      text,
    };

    addJobToEmailQueue(mailOptions);
  });
};

module.exports = {sendEmail, getEmailList, notifyUsers};
