"use strict";

const _                       = require('lodash');
const moment                  = require('moment');
const db                      = require('../../models/');
const InvalidStateStatus      = require('./exceptions/InvalidStateStatus');
const FailedCreateQuery       = require('../../models/exceptions/FailedCreateQuery');
const logger                  = require(process.cwd() + '/lib/log');

module.exports = class Ticket_Template {
  
  /**
   * Initialize tracking state object
   *
   * @param {string|object} init - Pass in either ident string or new object
   * @param {object} options - Options object
   */
  constructor(init, options={}) {
    this.instance = null;
    this.model = db.models.tracking_ticket_template;
    
    // Existing instance
    if(typeof init === "object" && typeof init.ident === "string") {
      this.instance = init;
    }
    
    if(init === undefined || this.instance === null) throw new Error('Unable to instantiate State Tracking Ticket Template');
    
  }
  
  /**
   * Create new ticket template
   *
   * A new template that can be invoked when generating a new ticket.
   *
   * @param {string} state - State ID
   * @param {string} name - Name of ticket template
   * @param {string} body - Body of ticket template
   *
   * @returns {Promise} - Resolves with updated instance
   */
  create(state, name, body) {
    
    return new Promise((resolve, reject) => {
      
      // Convert state ident into model object
      db.models.tracking_state_definition.findOne({where: {ident: state}})
        // Handle found state
        .then((state) => {
          return new Promise((resolve, reject) => {
            if(state === null) return reject({message: 'failed to find the requested state'});
            resolve(state);
          });
        })
        .then((state) => {
          // Create new instance
          let template = {
            state_id: state.id,
            name: name,
            body: body
          };
          
          // Return model create promise
          return this.model.create(template);
        })
        .then((template) => {
          // All done, save instance and send template
          this.instance = template;
          resolve(template);
        })
        .catch((err) => {
          console.log('Failed to create new ticket template', err);
          reject({message: 'failed to create new ticket template: ' + err.message, cause: err});
        });
      
    });
    
  }
  
  
  /**
   * Update the current ticket template
   *
   * @param {string} template - Template object
   *
   * @returns {Promise}
   */
  update(template) {
    return new Promise((resolve, reject) => {
  
      if(template.name) this.instance.name = template.name;
      if(template.body) this.instance.body = template.body;
      if(template.summary) this.instance.summary = template.summary;
      if(template.project) this.instance.project = template.project;
      if(template.components) this.instance.components = template.components;
      if(template.tags) this.instance.tags = template.tags;
      if(template.priority) this.instance.priority = template.priority;
      if(template.issueType) this.instance.issueType = template.issueType;
      if(template.security) this.instance.security = template.security;
      
      this.model.update(template, {where: { ident: this.instance.ident}})
        .then((instance) => {
          resolve(this.instance);
        })
        .catch((err) => {
          reject({message: 'Failed to update ticket template: ' + err.message, cause: err});
        });
      
    });
    
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
          exclude: ['deletedAt', 'id', 'definition_id']
        },
        include: [
          {as: 'definition', model: db.models.tracking_state_definition.scope('public')},
        ]
      };
      
      // Get updated public state with nested tasks
      this.model.scope('public').findOne(opts).then(
        (template) => {
          resolve(template);
        },
        (err) => {
          console.log(err);
          reject({message: 'Unable to get updated state.'});
          throw new Error('failed to get updated state.');
        }
      );
      
    });
    
  }
  
  
};