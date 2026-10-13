const CONFIG = require('../config');
const db = require('../models');
const {sendEmail} = require('./mailer');
const {addJobToEmailQueue} = require('../queue');

const getEmailList = async (triggers) => {
  const {domain} = CONFIG.get('email');
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

const getAdminEmails = async () => {
  const adminGroup = await db.models.userGroup.findOne({
    where: {name: 'admin'},
    include: [{model: db.models.user, as: 'users', through: {attributes: []}}],
  });
  if (!adminGroup) {
    return [];
  }
  return adminGroup.users.map((user) => {return user.email;});
};

const notifyUsers = async (subject, text, triggers) => {
  const {email, domain} = CONFIG.get('email');
  const env = CONFIG.get('env');
  const emailList = await getEmailList(triggers);
  const isProd = env === 'production';

  let recipients = emailList;
  if (!isProd) {
    // Outside production, only notify admin users who are subscribed
    const adminEmails = await getAdminEmails();
    recipients = emailList.filter((emailItem) => {return adminEmails.includes(emailItem.toEmail);});
  }

  for (const emailItem of recipients) {
    const {toEmail, notifId, eventType} = emailItem;
    const mailOptions = {
      from: `${email}${domain}`,
      to: toEmail,
      subject: isProd ? subject : `[NON-PROD IPR][${eventType}] ${subject}`,
      text,
    };
    await addJobToEmailQueue({mailOptions, notifId, eventType});
  }
};

module.exports = {sendEmail, getEmailList, notifyUsers};
