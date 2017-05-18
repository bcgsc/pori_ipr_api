"use strict";

let express = require('express'),
  router = express.Router({mergeParams: true}),
  db = require(process.cwd() + '/app/models'),
  logger = require(process.cwd() + '/app/libs/logger'),
  moment = require('moment');

// Middleware for Analyst Comments
router.use('/', (req,res,next) => {

  // Get Patient Information for this POG
  db.models.probe_signature.scope('public').findOne({ where: {pog_report_id: req.report.id}}).then(
    (result) => {
      // Not found is allowed!
      req.signature = result;
      next();
    },
    (error) => {
      console.log('Unable to query Analyst Comments', error);
      res.status(500).json({error: {message: 'Unable to lookup the analyst comments for ' + req.POG.POGID + '.', code: 'failedAnalystCommentsQuery'}});
      res.end();
    }
  );

});

router.route('/')
  .get((req,res) => {
    res.json(req.signature);
  });

router.route('/:role(ready|reviewer)')
  .put((req,res,next) => {

    // Get the role
    let role;
    if(req.params.role === 'ready') role = 'readySigned';
    if(req.params.role === 'reviewer') role = 'reviewerSigned';

    if(!role) return res.status(401).json({error: {message: 'A valid signing role must be specified.', code: 'invalidSignRole'}});

    // Update Comments
    let data= {};
    data[`${role}By_id`] = req.user.id;
    data[`${role}At`] = moment().toISOString();

    // Is there a signature entry yet? If not, create one.
    let checkCreate = () => {
      return new Promise((resolve, reject) => {
        if(!req.signature) {
          db.models.probe_signature.create({pog_id: req.POG.id, pog_report_id: req.report.id}).then(
            (result) => {
              req.signature = result;
              resolve(result);
            },
            (err) => {
              console.log('Create Signature Error', err);
              reject({error: {message: 'Unable to create probe signature'}, code: 'failedProbeSignatureCreate'});
            }
          )
        } else {
          resolve(req.signature);
        }
      });
    };

    let update = (signature) => {
      return db.models.probe_signature.update(data, {where: {ident: req.signature.ident}, options: {returning: true}});
    };

    let get = () => {
      return db.models.probe_signature.scope('public').findOne({where: {ident: req.signature.ident}});
    };

    checkCreate(data)
      .then(update)
      .then(get)
      .then(
        (result) => {
          res.json(result);
        },
        (err) => {
          console.log('Unable to sign comments', err);
          res.status(500).json({error: {message: 'Unable to sign comments', code: 'failedSignCommentsQuery'}});
        }
      );


  });

router.route('/revoke/:role(ready|reviewer)')
  .put((req,res,next) => {

    // Get the role
    let role;
    if(req.params.role === 'ready') role = 'readySigned';
    if(req.params.role === 'reviewer') role = 'reviewerSigned';

    if(!role) return res.status(401).json({error: {message: 'A valid signing role must be specified.', code: 'invalidCommentSignRole'}});

    // Update Comments
    let data= {};
    data[`${role}By_id`] = null;
    data[`${role}At`] = null;



    let update = (signature) => {
      return db.models.probe_signature.update(data, {where: {ident: signature.ident}, options: {returning: true}});
    };

    let get = () => {
      return db.models.probe_signature.scope('public').findOne({where: {ident: req.signature.ident}});
    };

    update(req.signature)
      .then(get)
      .then(
        (result) => {
          res.json(result);
        },
        (err) => {
          console.log('Unable to sign comments', err);
          res.status(500).json({error: {message: 'Unable to sign comments', code: 'failedSignCommentsQuery'}});
        }
      );


  });

module.exports = router;
