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
      const result = await db.models.report.findOne({
        where: {ident: req.report.ident},
        attributes: ['seqQC', 'config'],
      });
      return res.json(result);
    } catch (error) {
      logger.error(`Error while getting report ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while getting report'},
      });
    }
  });

router.route('/tcga')
  .get((req, res) => {
    switch (req.report.expression_matrix) {
      case 'v8':
        return res.json(tcgaV8);
      case 'v9':
        return res.json(tcgaV9);
      default:
        return res.json([]);
    }
  });

module.exports = router;
