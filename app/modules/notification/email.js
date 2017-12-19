"use strict";

const _                 = require('lodash');
const moment            = require('moment');
const db                = require('../../models/');
const nodemailer        = require('nodemailer');
const util              = require('util');
const pug               = require('pug');
const logger            = process.logger;

module.exports = class Email {

  /**
   * Initialize Notification object
   *
   * @param {object} options - Options object
   */
  constructor(options={}) {

    this.force = (options.force) ? options.force : false;

    this.transport = nodemailer.createTransport({
      sendMail: true,
      newline: 'unix',
      path: '/usr/sbin/sendmail',
      port: 25
    })

  }

  /**
   * Set Recipient
   *
   * @param {string|array} address - Email message recpient(s)
   * @returns {object} - Return self object for chaining
   */
  setRecipient(address) {
    this.to = address;

    return this;
  }

  /**
   * Set Subject
   *
   * @param {string} subject - Email message subjectA
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
   * @returns {object} - Return self for chaining
   */
  setBody(body) {
    this.body = body;

    return this;
  }

  /**
   * Send Email Message
   *
   */
  send() {
    return new Promise((resolve, reject) => {

      let locals = {
        subject: this.subject,
        body: this.body
      };

      this.htmlBody = pug.renderFile(process.cwd() + '/app/modules/notification/templates/email.pug', locals);

      let message = {
        from: 'No Reply <ipr@bcgsc.ca>',
        to: this.to,
        subject: this.subject,
        text: this.body,
        html: this.htmlBody
      };

      if(process.env.NODE_ENV === 'development' && this.force !== true) {
        logger.info('Mocked email generated: ');
        console.log(message);
        return resolve({env: 'development', message: 'success', mock: true});
      }

      this.transport.sendMail(message, (err, result) => {
        if(!err) return resolve(result);
        reject(err);
      });


    });
  }

};