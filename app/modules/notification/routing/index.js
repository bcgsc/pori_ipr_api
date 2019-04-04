"use strict";

const express             = require('express');
const acl                 = require(process.cwd() + '/app/middleware/acl');
const _                   = require('lodash');
const db                  = require(process.cwd() + '/app/models');
const RoutingInterface    = require('../../../routes/routingInterface');
const AnalysisLib         = require('../../../libs/structures/analysis');
const POGLib              = require('../../../libs/structures/pog');
const Email               = require('../email');
const pug                 = require('pug');

/**
 * Create and bind routes for Notifications
 *
 * @type {NotificationRouter}
 */
module.exports = class NotificationRouter extends RoutingInterface {

  constructor(io) {
    super();

    this.io = io;

    this.registerEndpoint('get', '/test', (req, res, next) => {

      // Create new Email
      let email = new Email({force: true});

      email.setRecipient('bpierce@bcgsc.ca').setSubject('This is a test message').setBody('Hello World.\nThis is a multiline text body.').send().then(
        (result) => {
          res.json({result: 'Message sent.'});
        },
        (err) => {
          console.log('Unable to send message');
          console.log(err);
          res.status(500).json({message: 'Unable to send messages', cause: err});
        }
      )

    });

    this.registerEndpoint('get', '/render', (req, res, next) => {

      res.send(pug.renderFile(process.cwd() + '/app/modules/notification/templates/email.pug', {body: 'Hello World.\nThis is a multiline text body.', subject: 'This is a test subject'}))

    });

  }

};
