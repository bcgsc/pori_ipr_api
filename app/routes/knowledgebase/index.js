"use strict";

let _ = require('lodash'),
    router = require('express').Router({mergeParams: true}),
    db = require(process.cwd() + '/app/models'),
    loader = require(process.cwd() + '/app/loaders/knowledgebase');

router.use('/validate', require('./validate'));

router.use('/genevar', require('./genevar'));

router.route('/import')
  .get((req,res,next) => {

    loader({directory: '/home/bpierce/bcgsc_svia/databases/knowledge_base/trunk'}).then(
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

router.use('/events', require('./events'));
router.use('/references', require('./references'));

module.exports = router;