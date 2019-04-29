const express = require('express');
const genevar = require('../../../database/genevar.json');

const router = express.Router({mergeParams: true});


// Test python library wrapper
router.route('/')
  .get((req, res) => {
    // Add to GenVar list
    const data = genevar.filter((entry) => {
      return entry.toLowerCase().includes(req.query.query.toLowerCase());
    });

    return res.json(data);
  });

module.exports = router;
