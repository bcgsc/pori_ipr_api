const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});
const db = require('../../models');
const logger = require('../../log');

const tcgaV8 = require('../../../database/exp_matrix.v8.json');
const tcgaV9 = require('../../../database/exp_matrix.v9.json');

router.route('/')
  .get(async (req, res) => {
    try {
      const result = await db.models.analysis_report.findOne({
        where: {ident: req.report.ident},
        attributes: ['sampleInfo', 'seqQC', 'config'],
      });
      return res.json(result);
    } catch (error) {
      logger.error(`Unable to find report ${error}`);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'Unable to find report'}});
    }
  });

router.route('/tcga')
  .get((req, res) => {
    if (req.report.expression_matrix === 'v8') {
      return res.json(tcgaV8);
    }
    if (req.report.expression_matrix === 'v9') {
      return res.json(tcgaV9);
    }
    return res.json([]);
  });

module.exports = router;
