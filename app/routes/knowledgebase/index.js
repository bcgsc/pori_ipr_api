"use strict";

let _ = require('lodash'),
    router = require('express').Router({mergeParams: true}),
    db = require(process.cwd() + '/app/models'),
    kbExport = require(process.cwd() + '/app/exporters/knowledgebase'),
    loader = require(process.cwd() + '/app/loaders/knowledgebase'),
    acl = require(process.cwd() + '/app/middleware/acl');;

router.use('/validate', require('./validate'));

router.use('/genevar', require('./genevar'));

router.route('/import')
  .post((req,res,next) => {
  
    let directory = req.body.directory;
    let references = req.body.references;
    let events = req.body.events;
    
    if(!directory) return res.status(400).json({message: 'A directory value is required to be sent in the body'});
    
    if(!events && !references) return res.status(400).json({message: 'At least one of: an events filename or references filename is required in the body'});
    
    let opts = {directory: directory};
    
    if(events) opts.events = events;
    if(references) opts.references = references;
    
    
    loader(opts).then(
      (result) => {
        res.json({success:true});
      },
      (err) => {
        console.log('Unable to run KB loader', err);
        res.status(500).json({error: {message: 'Unable to run the KB Import/loader.'}});
      }
    )

  });

router.route('/controlled-vocabulary')
  .get((req,res,next) => {

    let vocab = {controlled: require(process.cwd() + '/config/kbControlled.json')};

    // Send JSON values
    res.json(vocab.controlled);

    delete vocab.controlled;

  });

router.route('/disease-ontology')
  .get((req,res) => {

    let data = {};

    // Get Json DB
    data.entries = require(process.cwd() + '/database/disease.json');

    // Add to GenVar list
    data.found = _.filter(data.entries, (e) => {
      if(e.toLowerCase().indexOf(req.query.query.toLowerCase()) > -1) return true;
    });

    res.json(data.found);

    delete data.entries;
    delete data.found;

  });

// History Metrics Query
// select user_id, COUNT(distinct kb_histories.ident) AS "numberOfEntries" from kb_histories GROUP BY user_id;

router.route('/history')
  .get((req,res) => {

  let model;

    // set model from type
    if(req.query.type === 'reference') model = 'kb_references';
    if(req.query.type === 'event') model = 'kb_events';

    // Get Events by ident
    db.models.kb_history.findAll({
      where: { table: model, entry: req.query.entry}, attributes: {exclude: ['id', 'user_id']}, order: '"createdAt" DESC',
      include: [
        {model: db.models.user, as: 'user', attributes: {exclude:['id', 'password', 'jiraXsrf']}}
      ]
    }).then(
      (result) => {
        res.json(result);
      },
      (err) => {
        console.log('Unable to retrieve history entries', err);
        res.status(500).json({error: {message: "Unable to retrieve entry's history."}});
      }
    )

  });
router.route('/metrics')
  .get((req,res) => {

    let access = new acl(req, res);
    access.notGroups('Clinician', 'Collaborator');
    let externalMode = !access.check(true);

    let query  = "select count(kb_references.id) as \"refTotal\", sum(case when kb_references.status = 'REVIEWED' then 1 else 0 end) as \"refReviewed\", ";
        query += "sum(case when kb_references.status = 'NEW' then 1 else 0 end) as \"refNew\", ";
        query += "sum(case when kb_references.status = 'interim' then 1 else 0 end) as \"refInterim\", ";
        query += "sum(case when kb_references.status = 'REQUIRES-REVIEW' then 1 else 0 end) as \"refRequiresReview\", ";
        query += "sum(case when kb_references.status = 'FLAGGED-INCORRECT' then 1 else 0 end) as \"refFlaggedIncorrect\", ";
        query += "count(kb_events.id) as \"evTotal\", ";
        query += "sum(case when kb_events.status = 'APPROVED' then 1 else 0 end) as \"evApproved\", ";
        query += "sum(case when kb_events.status = 'NEW' then 1 else 0 end) as \"evNew\", ";
        query += "sum(case when kb_events.status = 'REQUIRES-REVIEW' then 1 else 0 end) as \"evRequiresReview\", ";
        query += "sum(case when kb_events.status = 'FLAGGED-INCORRECT' then 1 else 0 end) as \"evFlaggedIncorrect\"";
        query += " from kb_references full outer join kb_events on (kb_references.ident = kb_events.ident and kb_events.\"deletedAt\" is null) ";
        query += "where kb_references.\"deletedAt\" is null ";

    if(externalMode) {
      // filter references by source (ref_id) if being accessed by external user
      let filterReferenceSources = ['%archerdx%', '%quiver.archer%', '%foundationone%', '%clearityfoundation%', '%mycancergenome%', '%thermofisher%', 'IBM', '%pct.mdanderson%', '%nccn%'];

      let kbFilter = "";
      for (var i = filterReferenceSources.length - 1; i >= 0; i--) {
        kbFilter += "kb_references.ref_id not ilike '" + filterReferenceSources[i] + "'";
        if(i !== 0) kbFilter += " and ";
      }

      query += "and " + kbFilter;
    }

    query += ";";

    // Get Metrics
    db.query(
      query,
      { type: db.QueryTypes.SELECT }
    )
    .then(
      (metrics) => {
        res.json(metrics[0]);
      },
      (err) => {
        res.status(500).json({error: {message: 'Unable to retrieve Knowledgebase metrics'}});
      }
    )


  });

router.route('/export')
  .get((req,res) => {

    let today = new Date();
    let dd = today.getDate();
    let mm = today.getMonth()+1; //January is 0!
    let yyyy = today.getFullYear();

    if(dd<10) dd = '0'+dd;

    if(mm<10) mm = '0'+mm;

    today = yyyy + '-' + mm + '-' + dd;

    // If no specified export path, export to temp folder in current IPR admin's home directory
    let exportPath = req.query.path || '/home/nmartin/temp/' + today;
    let version = req.query.version;

    // return error if no version specified
    if (!version) return res.status(400).json({error: {message: 'Please specify a KB version for export'}});
    // return error if version format is incorrect (expected 3 numbers delimited by periods e.g. '1.2.3')
    if (!version.match(/^\d+.\d+.\d+$/)) return res.status(400).json({error: {message: 'KB version must be formatted as 3 numbers delimited by periods e.g. "1.2.3"'}});

    // Generate output TSVs
    let exportEvent = new kbExport(version, {output: exportPath});

    exportEvent.export().then(
      (result) => {
        console.log('KB Exported to ' + exportPath);
        console.log('KB Export Result', result);
        res.json({result: 'KB successfully exported to ' + exportPath});
      },
      (err) => {
        res.status(500).json({error: {message: 'Unable to perform export'}});
      }
    )

  });

router.use('/events', require('./events'));
router.use('/references', require('./references'));

module.exports = router;