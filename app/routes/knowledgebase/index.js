"use strict";

let _ = require('lodash'),
    router = require('express').Router({mergeParams: true}),
    db = require(process.cwd() + '/app/models'),
    kbExport = require(process.cwd() + '/app/exporters/knowledgebase'),
    loader = require(process.cwd() + '/app/loaders/knowledgebase');

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

    // Get Metrics
    db.query(
      "select count(kb_references.id) as \"refTotal\", sum(case when kb_references.status = 'REVIEWED' then 1 else 0 end) as \"refReviewed\", sum(case when kb_references.status = 'NEW' then 1 else 0 end) as \"refNew\", sum(case when kb_references.status = 'interim' then 1 else 0 end) as \"refInterim\", sum(case when kb_references.status = 'REQUIRES-REVIEW' then 1 else 0 end) as \"refRequiresReview\", sum(case when kb_references.status = 'FLAGGED-INCORRECT' then 1 else 0 end) as \"refFlaggedIncorrect\", count(kb_events.id) as \"evTotal\", sum(case when kb_events.status = 'APPROVED' then 1 else 0 end) as \"evApproved\", sum(case when kb_events.status = 'NEW' then 1 else 0 end) as \"evNew\", sum(case when kb_events.status = 'REQUIRES-REVIEW' then 1 else 0 end) as \"evRequiresReview\", sum(case when kb_events.status = 'FLAGGED-INCORRECT' then 1 else 0 end) as \"evFlaggedIncorrect\" from kb_references full outer join kb_events on kb_references.ident = kb_events.ident;",
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

    // Generate output TSVs
    let exportEvent = new kbExport('v2.4.3', {output: '/home/bpierce/tmp/20-11-2017'});

    exportEvent.export().then(
      (result) => {
        console.log('KB Export Result', result);
        res.json({result: true});
      },
      (err) => {
        res.status(500).json({error: {message: 'Unable to perform export'}});
      }
    )

  });

router.use('/events', require('./events'));
router.use('/references', require('./references'));

module.exports = router;