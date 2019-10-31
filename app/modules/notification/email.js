const nodemailer = require('nodemailer');
const pug = require('pug');

const logger = require('../../log');
const nconf = require('../../config');

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
   * Set CC
   *
   * @param {string|array} address - Email message CC(s)
   *
   * @returns {object} - Return self object for chaining
   */
  setCC(address) {
    this.cc = address;

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

    this.htmlBody = pug.renderFile(`${__dirname}/templates/email.pug`, locals);

    const message = {
      from: 'No Reply <ipr@bcgsc.ca>',
      to: this.to,
      cc: this.cc,
      subject: this.subject,
      text: this.body,
      html: this.htmlBody,
    };

    if (nconf.get('env') !== 'production' && this.force !== true) {
      logger.info(`Mocked email generated: ${message}`);
      return {env: nconf.get('env'), message: 'success', mock: true};
    }

    return this.transport.sendMail(message);
  }
}

module.exports = Email;
