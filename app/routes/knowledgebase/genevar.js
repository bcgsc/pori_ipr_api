"use strict";

// app/routes/genomic/detailedGenomicAnalysis.js
let express = require('express'),
  router = express.Router({mergeParams: true}),
  db = require(process.cwd() + '/app/models'),
  _ = require('lodash'),
  acl = require(process.cwd() + '/app/middleware/acl'),
  exec = require('child_process').exec;


// Test python library wrapper
router.route('/')
  .get((req,res) => {

    let data = {};

    // Get Json DB
    data.entries = require(process.cwd() + '/database/genevar.json');

    // Add to GenVar list
    data.found = _.filter(data.entries, (e) => {
      if(e.toLowerCase().indexOf(req.query.query.toLowerCase()) > -1) return true;
    });

    res.json(data.found);

    delete data.entries;
    delete data.found;


  });

module.exports = router;