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
      if (!emailList.some((el) => {return el.toEmail === notif.user.email;})
          && notif.user.email.endsWith(domain)
          && notif.user.allowNotifications) {
        emailList.push({toEmail: notif.user.email, notifId: notif.id, eventType: notif.eventType});
      }
    }
    if (notif.userGroup) {
      for (const groupUser of notif.userGroup.users) {
        if (!emailList.some((el) => {return el.toEmail === groupUser.email;})
            && groupUser.email.endsWith(domain)
            && groupUser.allowNotifications) {
          emailList.push({toEmail: groupUser.email, notifId: notif.id, eventType: notif.eventType});
        }
      }
    }
  }

  return emailList;
};

const notifyUsers = async (subject, text, triggers) => {
  const emailList = await getEmailList(triggers);

  for (const emailItem of emailList) {
    const {toEmail, notifId, eventType} = emailItem;
    const mailOptions = {
      from: `${email}${domain}`,
      to: toEmail,
      subject,
      text,
    };
    await addJobToEmailQueue({mailOptions, notifId, eventType});
  }
};

module.exports = {sendEmail, getEmailList, notifyUsers};
