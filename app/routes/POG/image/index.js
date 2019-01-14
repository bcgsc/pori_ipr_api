'use strict';

const express = require('express');
const _ = require('lodash');

const router = express.Router({mergeParams: true});
const db = require(`${process.cwd()}/app/models`);

// Register middleware

// Route for getting an image
router.route('/retrieve/:key')
  .get((req, res) => {
    let keys = [];
    // Get All Pogs
    if (req.params.key.indexOf(',') === -1) keys.push(req.params.key);
    if (req.params.key.indexOf(',') > -1) {
      keys = req.params.key.split(',');
    }

    const opts = {
      where: {
        key: {
          in: keys,
        },
        pog_report_id: req.report.id,
      },
      attributes: {exclude: ['id', 'deletedAt', 'pog_id', 'pog_report_id']},
    };

    db.models.imageData.findAll(opts).then(
      (result) => {
        const output = {};

        _.forEach(result, (v, k) => {
          output[v.key] = v;
        });

        res.json(output);
      },
      (error) => {
        res.status(500).json({error: {message: 'Unable to query image data', code: 'imageQueryFailed'}});
      }
    );
  })
  .put((req, res) => {
    // Add a new Potential Clinical Alteration...
  });
router.route('/expressionDensityGraphs')
  .get((req, res) => {
    db.models.imageData.findAll({
      where: {
        pog_id: req.POG.id,
        pog_report_id: req.report.id,
        key: {
          $like: 'expDensity.%',
        },
      },
      order: [['key', 'ASC']],
      attributes: {exclude: ['id', 'deletedAt', 'pog_id']},
    }).then(
      (result) => {
        const output = {};

        _.forEach(result, (v, k) => {
          output[v.key] = v;
        });

        res.json(output);
      },
      (error) => {
        res.status(500).json({error: {message: 'Unable to query image data', code: 'imageQueryFailed'}});
      }
    );
  });

router.route('/mutationSummary')
  .get((req, res) => {
    const opts = {
      where: {
        pog_report_id: req.report.id,
        key: {
          $or: [
            {$like: 'mutation_summary.%'},
            {$like: 'mutSummary.%'},
          ],
        },
      },
      order: [['key', 'ASC']],
      attributes: {exclude: ['id', 'deletedAt', 'pog_id', 'pog_report_id']}
    };
    db.models.imageData.findAll(opts)
      .then((result) => {
        const output = {};
        _.forEach(result, (v) => {
          output[v.key] = v;
        });
        res.json(output);
      })
      .catch((err) => {
      
      });
  });

router.route('/subtypePlots')
  .get((req, res) => {
    db.models.imageData.findAll({
      where: {
        pog_id: req.POG.id,
        pog_report_id: req.report.id,
        key: {
          $like: 'subtypePlot.%',
        },
      },
      order: [['key', 'ASC']],
      attributes: {exclude: ['id', 'deletedAt', 'pog_id']},
    }).then(
      (result) => {
        const output = {};

        _.forEach(result, (v, k) => {
          output[v.key] = v;
        });

        res.json(output);
      },
      (error) => {
        res.status(500).json({error: {message: 'Unable to query image data', code: 'imageQueryFailed'}});
      }
    );
  });

module.exports = router;
