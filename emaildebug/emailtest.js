const nodemailer = require('nodemailer');
const Queue = require('bull');

const emailQueue = new Queue('emails');

const email = 'rpletz';
const password = 'Tree$Bi6M4k';

const transporter = nodemailer.createTransport({
  host: 'webmail.bcgsc.ca',
  auth: {
    user: email,
    pass: password,
  },
  tls: {
    rejectUnauthorized: false,
  },
  pool: true,
});

const mail = {
  to: `${email}@bcgsc.ca`,
  subject: 'subject',
  body: 'body',
};

emailQueue.process(async (job) => {
  const {to, subject, body} = job.data;
  const mailOptions = {
    from: `${email}@bcgsc.ca`,
    to,
    subject,
    text: body,
  };
  await transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log(`Email sent: ${info.response}`);
    }
  });
});

emailQueue.add(mail);
emailQueue.add(mail);
emailQueue.add(mail);
emailQueue.add(mail);
emailQueue.add(mail);
emailQueue.add(mail);
emailQueue.add(mail);
emailQueue.add(mail);
emailQueue.add(mail);
emailQueue.add(mail);
