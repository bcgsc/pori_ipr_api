"use strict";

const express             = require('express');
const router              = express.Router({mergeParams: true});
const db                  = require(process.cwd() + '/app/models');
const _                   = require('lodash');
const RoutingInterface    = require('../../../routes/routingInterface');
const Ticket_Template     = require('../ticket_template');

module.exports = class TrackingTicketTemplateRoutes extends RoutingInterface {
  
  /**
   * Tracking Ticket Templates Routing
   *
   * POG Tracking Ticket Templates routes
   *
   * @param {object} io - Socket.io instance
   */
  constructor(io) {
    super();
    
    this.io = io;
    
    // Register Middleware
    this.registerMiddleware('template', require('../middleware/ticket_template'));
    this.registerMiddleware('definition', require('../middleware/definition'));
    
    // Register Task endpoint
    this.rootPath();
    
  }
  
  // URL Root
  rootPath() {
    
    this.registerResource('/definition/:definition')
    // Get all state definitions
      .get((req,res,next) => {
        // Get All Definitions
        db.models.tracking_ticket_template.scope('public').findAll({ where: { definition_id: req.definition.id } }).then(
          (templates) => {
            res.json(templates);
          },
          (err) => {
            console.log(err);
            res.status(500).json({error: {message: 'Unable to query definitions'}});
          }
        )
      })
      .post((req, res, next) => {
        
        let template = {
          definition_id: req.definition.id,
          name: req.body.name,
          body: req.body.body,
          project: req.body.project,
          issueType: req.body.issueType,
          priority: req.body.priority,
          components: req.body.components,
          tags: req.body.tags,
          summary: req.body.summary,
          security: req.body.security
        };
        
        db.models.tracking_ticket_template.create(template)
          .then((ticket) => {
            
            let Ticket = new Ticket_Template(ticket);
            
            // Now that ticket template has been created, get public version of it.
            Ticket.getPublic()
              .then((output) => {
                res.json(output);
              })
              .catch((err) => {
                console.log(err);
                res.status(500).json({message: 'Unable to retrieve new ticket template after creating: ' + err.message, cause: err});
              });
          
          })
          .catch((err) => {
            console.log('Failed to create ticket', err);
            res.status(500).json({message: 'Failed to create ticket template: ' + err.message, cause: err});
          });
      
      });
    
    this.registerResource('/definition/:definition/template/:template')
      .put((req, res, next) => {
      
        // New up instance
        let Ticket = new Ticket_Template(req.template);
        
        Ticket.update(req.body)
          .then((ticket) => {
            res.json(ticket);
          })
          .catch((err) => {
            res.status(500).json({message: 'Unable to update ticket template: ' + err.message, cause: err });
          });
      
      })
      .delete((req, res, next) => {
        
        db.models.tracking_ticket_template.destroy({where: { ident: req.template.ident}})
          .then((result) => {
            res.status(204).send();
          })
          .catch((err) => {
            console.log('Failed to remove ticket template', err);
            res.status(500).json({message: 'Unable to remove the ticket template: ' + err.message, cause: err});
          });
      
      });
    
  }
  
};