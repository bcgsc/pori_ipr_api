const nodemailer = require('nodemailer');
const pug = require('pug');

const {logger} = process;

class Email {
  /**
   * Initialize Notification object
   *
   * @param {object} options - Options object
   */
  constructor(options = {}) {
    this.force = (options.force) ? options.force : false;

    this.transport = nodemailer.createTransport({
      sendMail: true,
      newline: 'unix',
      path: '/usr/sbin/sendmail',
      port: 25,
    });
  }

  /**
   * Set Recipient
   *
   * @param {string|array} address - Email message recpient(s)
   *
   * @returns {object} - Return self object for chaining
   */
  setRecipient(address) {
    this.to = address;

    return this;
  }

  /**
   * Set Subject
   *
   * @param {string} subject - Email message subject
   *
   * @returns {object} - Return self object for chaining
   */
  setSubject(subject) {
    this.subject = subject;

    return this;
  }

  /**
   * Set email body
   *
   * @param {string|object} body - Set Email Body
   *
   * @returns {object} - Return self for chaining
   */
  setBody(body) {
    this.body = body;

    return this;
  }

  /**
   * Send Email Message
   *
   * @returns {Promise.<object>} - Returns the sent email with the message info
   */
  async send() {
    const locals = {
      subject: this.subject,
      body: this.body,
    };

    this.htmlBody = pug.renderFile(`${process.cwd()}/app/modules/notification/templates/email.pug`, locals);

    const message = {
      from: 'No Reply <ipr@bcgsc.ca>',
      to: this.to,
      subject: this.subject,
      text: this.body,
      html: this.htmlBody,
    };

    if (process.env.NODE_ENV !== 'production' && this.force !== true) {
      logger.info(`Mocked email generated: ${message}`);
      return {env: process.env.NODE_ENV, message: 'success', mock: true};
    }

    return this.transport.sendMail(message);
  }
}

module.exports = Email;
