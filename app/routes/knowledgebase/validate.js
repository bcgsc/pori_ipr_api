"use strict";

// app/routes/genomic/detailedGenomicAnalysis.js
let express = require('express'),
  router = express.Router({mergeParams: true}),
  db = require(process.cwd() + '/app/models'),
  _ = require('lodash'),
  acl = require(process.cwd() + '/app/middleware/acl'),
  exec = require('child_process').exec;


// Test python library wrapper
router.route('/events')
  .post((req,res) => {

    // Take input and call child
    exec('/projects/tumour_char/analysis_scripts/python/centos06/anaconda3_v4.3.0/envs/python3.4/bin/python ' + process.cwd() + '/app/libs/kbSanitationWrapper.py --input "' + req.body.events_expression + '"', (err, stdout, stderr) => {
      if(err) return res.status(400).json({error: {message: "Unable to validate the provided input", code: "KBValidationFailed"}});

      let output = JSON.parse(stdout);
      res.json({valid: req.body.events_expression});
    });
  });

module.exports = router;