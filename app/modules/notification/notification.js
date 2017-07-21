"use strict";

const _                       = require('lodash');
const moment                  = require('moment');
const db                      = require('../../models/');
const FailedCreateQuery       = require('../../models/exceptions/FailedCreateQuery');

module.exports = class Notification {

  /**
   * Initialize Notification object
   *
   * @param {string|object} init - Pass in either ident string or new object
   * @param {object} options - Options object
   */
  constructor(init, options={}) {
    this.instance = null;
    this.model = db.models.notification;

    // Existing instance
    if(typeof init === "object" && typeof init.ident === "string") {
      this.instance = init;
    }

  }

  /**
   * Get full public version of this instance
   *
   * @returns {Promise}
   */
  getPublic() {
    return new Promise((resolve, reject) => {

      let opts = {
        where: {
          ident: this.instance.ident,
        },
        attributes: {
          exclude: ['deletedAt']
        },
        include: [
          {as: 'analysis', model: db.models.pog_analysis.scope('public')},
          {
            as: 'tasks',
            model: db.models.tracking_state_task,
            attributes: {exclude: ['id', 'state_id', 'assignedTo_id']},
            order: [['ordinal', 'ASC']],
            include: [
              {as: 'assignedTo', model: db.models.user.scope('public')},
              {
                as: 'checkins',
                model: db.models.tracking_state_task_checkin,
                include: [{as: 'user', model: db.models.user.scope('public')}],
              }
            ]
          }
        ]
      };

      // Get updated public state with nested tasks
      this.model.scope('public').findOne(opts).then(
        (state) => {
          resolve(state);
        },
        (err) => {
          console.log(err);
          reject({error: {message: 'Unable to get updated state.'}});
          throw new Error('failed to get updated state.');
        }
      );

    });

  }


};