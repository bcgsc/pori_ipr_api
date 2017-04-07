"use strict";

let _ = require('lodash'),
    router = require('express').Router({mergeParams: true}),
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

    // Send JSON values
    res.json(require(process.cwd() + '/config/kbControlled.json'));

  });

router.use('/events', require('./events'));
router.use('/references', require('./references'));

module.exports = router;