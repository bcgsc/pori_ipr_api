const pug = require('pug');
const RoutingInterface = require('../../../routes/routingInterface');
const Email = require('../email');

const {logger} = process;

/**
 * Create and bind routes for Notifications
 *
 * @type {NotificationRouter}
 */
class NotificationRouter extends RoutingInterface {
  constructor(io) {
    super();
    this.io = io;

    this.registerEndpoint('get', '/test', async (req, res) => {
      // Create new Email
      const email = new Email({force: true});

      try {
        await email.setRecipient('bpierce@bcgsc.ca').setSubject('This is a test message')
          .setBody('Hello World.\nThis is a multiline text body.').send();
        return res.json({result: 'Message sent.'});
      } catch (error) {
        logger.error(`There was an error while trying to send messages ${error}`);
        return res.status(500).json({message: 'Error while trying to send messages', cause: error});
      }
    });

    this.registerEndpoint('get', '/render', async (req, res) => {
      return res.send(pug.renderFile('../templates/email.pug',
        {
          body: 'Hello World.\nThis is a multiline text body.',
          subject: 'This is a test subject',
        }));
    });
  }
}

module.exports = NotificationRouter;
