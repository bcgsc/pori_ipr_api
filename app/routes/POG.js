"use strict";

// app/routes/genomic/detailedGenomicAnalysis.js
let express = require('express'),
    router = express.Router({mergeParams: true}),
    db = require(process.cwd() + '/app/models'),
    _ = require('lodash'),
    acl = require(process.cwd() + '/app/middleware/acl'),
    loader = require(process.cwd() + '/app/loaders/detailedGenomicAnalysis/alterations');
  

// Register middleware  
router.param('POG', require(process.cwd() + '/app/middleware/pog'));

/**
 * Retrieve all POGs available
 *
 *
 * @query {string} query - Search string to filter returns
 * @query {bool} all - Defaults to false, only returns POGs the user is bound to
 *
 * @responds {array} - Responds with collection
 */
router.route('/')
  .get((req,res,next) => {

    // Create the getAllPogs query
    let opts = {};
    opts.attributes = {exclude: ['id','deletedAt', 'config', 'seqQC']};
    opts.order = '"POG"."POGID" ASC';
    opts.include = [];
    if(req.query.query ) opts.where = {POGID: {$ilike: '%' + req.query.query + '%'}};
    opts.include.push({model: db.models.patientInformation, as: 'patientInformation', attributes: { exclude: ['id', 'deletedAt', 'pog_id'] } });
    opts.include.push({model: db.models.tumourAnalysis, as: 'tumourAnalysis', attributes: { exclude: ['id', 'deletedAt', 'pog_id'] } });

    // Create the POGUser join object.
    let pogUserInclude = { include: []};
    pogUserInclude.model = db.models.POGUser;
    pogUserInclude.as = 'POGUsers';
    pogUserInclude.attributes = {exclude: ['id', 'pog_id', 'user_id', 'addedBy_id', 'deletedAt']};

    // Are we filtering on POGUser relationship?
    if(req.query.all !== 'true' || req.query.role) {
      pogUserInclude.where = {};
      // Don't search all if the requestee has also asked for role filtering
      if(req.query.all !== 'true' || req.query.role) pogUserInclude.where.user_id = req.user.id;
      if(req.query.role) pogUserInclude.where.role = req.query.role; // Role filtering
    }
    
    pogUserInclude.include.push({as: 'user', model: db.models.user, attributes: {exclude: ['id', 'password', 'deletedAt', 'access', 'jiraToken']}});
    pogUserInclude.include.push({as: 'addedBy', model: db.models.user, attributes: {exclude: ['id', 'password', 'deletedAt', 'access', 'jiraToken']}});

    opts.include.push(pogUserInclude);
    
    // Get All Pogs
    db.models.POG.findAll(opts).then(
        (pogs) => {
          res.json(pogs);
        },
        (error) => {
          console.log(error);
          res.status(500).json({error: {message: "Unable to retrieve the requested resources", code: "failedAllPogsQuery"}});
        }
      );
    })
    .put((req,res,next) => {
    // Add a new Potential Clinical Alteration...
  });

/**
 * Retrieve a specific pog
 *
 */
router.route('/:POG')
  .get((req,res,next) => {

    // Access Control
    let access = new acl(req, res);
    access.isPog();
    if(access.check() === false) return;

    res.json(req.POG);

  });

/**
 * Endpoints for user binding
 *
 */
router.route('/:POG/user')
  // Bind a new user to this POG
  .post((req,res,next) => {

    // Convert user to ID
    db.models.user.findOne({where: {ident: req.body.user}}).then(
      (user) => {
        if(user === null) return res.status(400).json({error: {message: 'invalid user reference', code: 'failedUserLookupBinding'}});

        // Create POGUser entry
        db.models.POGUser.create({user_id: user.id, pog_id: req.POG.id, role: req.body.role, addedBy_id: req.user.id}).then(
          (poguser) => {

            // Get POGUser entry
            db.models.POGUser.findOne({where: {id: poguser.id}, attributes: {exclude: ['id', 'pog_id', 'user_id', 'addedBy_id', 'deletedAt']}, include: [
              {as: 'user', model: db.models.user, attributes: {exclude: ['id', 'password', 'deletedAt', 'access', 'jiraToken']}},
              {as: 'addedBy', model: db.models.user, attributes: {exclude: ['id', 'password', 'deletedAt', 'access', 'jiraToken']}}
            ]}).then(
              (POGUser) => {
                res.json(POGUser);
              },
              (err) => {
                console.log('SQL Error', err);
                res.status(500).json({error: {message: 'Unable to bind new user to this POG', code: 'failedPOGUserBind'}});
              }
            )

          },
          (err) => {
            console.log('SQL Error', err);
            res.status(500).json({error: {message: 'Unable to bind new user to this POG', code: 'failedPOGUserBind'}});
          }
        );

      },
      (err) => {
        console.log('SQL Error', err);
        res.status(500).json({error: {message: 'Unable to bind new user to this POG', code: 'failedPOGUserBind'}});
      }
    )

  })
  .delete((req,res,next) => {
    // Convert user to ID
    db.models.user.findOne({where: {ident: req.body.user}}).then(
      (user) => {
        if(user === null) return res.status(400).json({error: {message: 'invalid user reference', code: 'failedUserLookupBinding'}});

        // Create POGUser entry
        db.models.POGUser.destroy({where: {user_id: user.id, pog_id: req.POG.id, role: req.body.role}}).then(
          (poguser) => {
            if(poguser > 0) res.status(204).send();

            if(poguser === 0) res.status(400).json({error:{message: 'Unable to find a user to remove that fits the provided criteria'}});
          },
          (err) => {
            console.log('SQL Error', err);
            res.status(500).json({error: {message: 'Unable to bind new user to this POG', code: 'failedPOGUserBind'}});
          }
        );

      },
      (err) => {
        console.log('SQL Error', err);
        res.status(500).json({error: {message: 'Unable to bind new user to this POG', code: 'failedPOGUserBind'}});
      }
    )
  });

// NodeJS Module Return
module.exports = router;