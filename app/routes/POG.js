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
 *
 *
 *
 */
router.route('/')
  .get((req,res,next) => {

    // Get All Pogs
    db.models.POG.findAll({
        attributes: {exclude: ['id','deletedAt', 'config', 'seqQC']},
        include: [
          {model: db.models.patientInformation, as: 'patientInformation', attributes: { exclude: ['id', 'deletedAt', 'pog_id'] } },
          {model: db.models.tumourAnalysis, as: 'tumourAnalysis', attributes: { exclude: ['id', 'deletedAt', 'pog_id'] } },
          {model: db.models.POGUser, as: 'POGUsers', attributes: {exclude: ['id', 'pog_id', 'user_id', 'addedBy_id', 'deletedAt']}, include: [
            {as: 'user', model: db.models.user, attributes: {exclude: ['id', 'password', 'deletedAt', 'access', 'jiraToken']}},
            {as: 'addedBy', model: db.models.user, attributes: {exclude: ['id', 'password', 'deletedAt', 'access', 'jiraToken']}}
          ]}
        ],
        order: '"POG"."POGID" ASC',
      }).then(
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
router.route('/:POG/user')
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

module.exports = router;
