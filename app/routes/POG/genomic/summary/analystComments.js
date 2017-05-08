"use strict";

// app/routes/genomic/detailedGenomicAnalysis.js
let express = require('express'),
    router = express.Router({mergeParams: true}),
    db = require(process.cwd() + '/app/models'),
    logger = require(process.cwd() + '/app/libs/logger'),
    versionDatum = new require(process.cwd() + '/app/libs/VersionDatum'),
    moment = require('moment');

// Middleware for Analyst Comments
router.use('/', (req,res,next) => {
  
  // Get Patient Information for this POG
  db.models.analystComments.scope('public').findOne({ where: {pog_report_id: req.report.id}}).then(
    (result) => {
    
      // Not found is allowed!
      // Found the patient information
      req.analystComments = result;
      next();
      
    },
    (error) => {
      console.log('Unable to query Analyst Comments', error);
      res.status(500).json({error: {message: 'Unable to lookup the analyst comments for ' + req.POG.POGID + '.', code: 'failedAnalystCommentsQuery'}});
      res.end();
    }
  );
  
});

// Handle requests for alterations
router.route('/')
  .get((req,res,next) => {
    // Get Patient History
    res.json(req.analystComments);
    
  })
  .put((req,res,next) => {

    // First Comments
    if(req.analystComments === null) {

      req.body.dataVersion = 0;
      req.body.pog_id = req.POG.id;
      req.body.pog_report_id = req.report.id;

      // Create new entry
      db.models.analystComments.create(req.body).then(
        (resp) => {
          res.json(resp);
        },
        (error) => {
          console.log(error);
          res.status(500).json({error: {message: 'Unable to version the resource', code: 'failedAnalystCommentCreate'}});
        }
      );

    } else {
      req.analystComments.pog_id = req.POG.id;
      req.analystComments.pog_report_id = req.report.id;
      // Update DB Version for Entry
      versionDatum(db.models.analystComments, req.analystComments, req.body, req.user).then(
        (resp) => {
          res.json(resp.data.create);
        },
        (error) => {
          console.log(error);
          res.status(500).json({error: {message: 'Unable to version the resource', code: 'failedAnalystCommentVersion'}});
        }
      );
    }
    
  });

router.route('/sign/:role(author|reviewer)')
  .put((req,res,next) => {

    // Get the role
    let role;
    if(req.params.role === 'author') role = 'authorSigned';
    if(req.params.role === 'reviewer') role = 'reviewerSigned';

    if(!role) return res.status(401).json({error: {message: 'A valid signing role must be specified.', code: 'invalidCommentSignRole'}});

    // Update Comments
    let data= {};
    data[`${role}By_id`] = req.user.id;
    data[`${role}At`] = moment().toISOString();

    let update = (u) => {
      return db.models.analystComments.update(u, {where: {ident: req.analystComments.ident}, options: {returning: true}});
    };

    let get = () => {
      return db.models.analystComments.scope('public').findOne({where: {ident: req.analystComments.ident}});
    };

    update(data)
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
router.route('/sign/revoke/:role(author|reviewer)')
  .put((req,res,next) => {

    // Get the role
    let role;
    if(req.params.role === 'author') role = 'authorSigned';
    if(req.params.role === 'reviewer') role = 'reviewerSigned';

    if(!role) return res.status(401).json({error: {message: 'A valid signing role must be specified.', code: 'invalidCommentSignRole'}});

    // Update Comments
    let data= {};
    data[`${role}By_id`] = null;
    data[`${role}At`] = null;

    let update = (u) => {
      return db.models.analystComments.update(u, {where: {ident: req.analystComments.ident}, options: {returning: true}});
    };

    let get = () => {
      return db.models.analystComments.scope('public').findOne({where: {ident: req.analystComments.ident}});
    };

    update(data)
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
