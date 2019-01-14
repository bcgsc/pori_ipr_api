'use strict';

// app/routes/genomic/detailedGenomicAnalysis.js
const express = require('express');

const router = express.Router({mergeParams: true});
const db = require(`${process.cwd()}/app/models`);
const _ = require('lodash');

const Acl = require(`${process.cwd()}/app/middleware/acl`);

// Register middleware
router.param('POG', require(`${process.cwd()}/app/middleware/pog`));
router.param('report', require(`${process.cwd()}/app/middleware/analysis_report`));

/**
 * Retrieve all POGs available
 *
 *
 * @query {string} query - Search string to filter returns
 * @query {bool} all - Defaults to false, only returns POGs the user is bound to
 *
 * @responds {array} - Responds with collection
 */
router.route('/')
  .get((req, res) => {
    // Create the getAllPogs query
    const opts = {};
    opts.attributes = {exclude: ['id', 'deletedAt', 'config', 'seqQC']};
    opts.order = [['POGID', 'ASC']];
    opts.include = [];
    opts.where = {nonPOG: false};

    // Check user permission and filter by project
    const access = new Acl(req, res);
    access.getProjectAccess().then(
      (projects) => {
        const projectAccess = _.map(projects, 'name');
        const projectOpts = {
          as: 'projects', model: db.models.project, attributes: {exclude: ['id', 'deletedAt', 'updatedAt', 'createdAt']}, where: {name: {$in: projectAccess}},
        };
        opts.include.push(projectOpts);

        if (req.query.query) opts.where.POGID = {$ilike: `%${req.query.query}%`};
        if (req.query.nonPOG === 'true') opts.where.nonPOG = true;

        opts.include.push({model: db.models.patientInformation, as: 'patientInformation'});

        const reportInclude = {
          as: 'analysis_reports', model: db.models.analysis_report, separate: true, include: [],
        };
        reportInclude.include.push({model: db.models.tumourAnalysis.scope('public'), as: 'tumourAnalysis'});
        reportInclude.where = {};

        // Check for types
        if (req.query.report_type === 'probe') reportInclude.where.type = 'probe';
        if (req.query.report_type === 'genomic') reportInclude.where.type = 'genomic';

        // Optional States
        if (!req.query.archived || !req.query.nonproduction) {
          reportInclude.where.state = {$not: []};
          if (!req.query.archived) reportInclude.where.state.$not.push('archived');
          if (!req.query.nonproduction) reportInclude.where.state.$not.push('nonproduction');
        }
        opts.include.push(reportInclude);

        // Get All Pogs
        db.models.POG.findAll(opts).then(
          (pogs) => {
            res.json(pogs);
          },
          (error) => {
            console.log(error);
            res.status(500).json({error: {message: 'Unable to retrieve the requested resources', code: 'failedAllPogsQuery'}});
          }
        );
      }
    );
  },
  (err) => {
    res.status(500).json({error: {message: err.message, code: err.code}});
  })
  .put((req,res) => {
    // Add a new Potential Clinical Alteration...
  });

/**
 * Retrieve a specific pog
 *
 */
router.route('/:POG')
  .get((req, res) => {
    // Access Control
    const access = new Acl(req, res);
    access.isPog();
    if (access.check() === false) return;

    res.json(req.POG);
  })
  .put((req, res) => {
    // Access Control
    const access = new Acl(req, res);
    access.isPog();
    access.pogEdit('analyst', 'reviewer', 'admin', 'superUser', 'Projects');
    if (access.check() === false) return;

    // Update POG
    const updateBody = {
      alternate_identifier: req.body.alternate_identifier,
      age_of_consent: req.body.age_of_consent,
    };

    // Attempt POG model update
    db.models.POG.update(updateBody, {where: {ident: req.body.ident}, limit: 1, returning: true}).then(
      (result) => {
        return res.json(result[1][0]);
      },
      (error) => {
        return res.status(500).json({error: {message: 'Unable to update patient. Please try again', code: 'failedPOGUpdateQuery'}});
      }
    );
  });

/**
 * Endpoints for user binding
 *
 */
router.route('/:POG/user')
  // Bind a new user to this POG
  .post((req, res) => {
    // Convert user to ID
    db.models.user.findOne({where: {ident: req.body.user}}).then(
      (user) => {
        if (user === null) return res.status(400).json({error: {message: 'invalid user reference', code: 'failedUserLookupBinding'}});

        // Create POGUser entry
        db.models.POGUser.create(
          {
            user_id: user.id, pog_id: req.POG.id, role: req.body.role, addedBy_id: req.user.id,
          }
        ).then(
          (poguser) => {
            // Get POGUser entry
            db.models.POGUser.findOne({
              where: {id: poguser.id},
              attributes: {exclude: ['id', 'pog_id', 'user_id', 'addedBy_id', 'deletedAt']},
              include: [
                {as: 'user', model: db.models.user, attributes: {exclude: ['id', 'password', 'deletedAt', 'access', 'jiraToken']}},
                {as: 'addedBy', model: db.models.user, attributes: {exclude: ['id', 'password', 'deletedAt', 'access', 'jiraToken']}},
              ],
            }).then(
              (POGUser) => {
                res.json(POGUser);
              },
              (err) => {
                console.log('SQL Error', err);
                res.status(500).json({error: {message: 'Unable to bind new user to this POG', code: 'failedPOGUserBind'}});
              }
            );
          },
          (err) => {
            console.log('SQL Error', err);
            res.status(500).json({error: {message: 'Unable to bind new user to this POG', code: 'failedPOGUserBind'}});
          }
        );
      },
      (err) => {
        console.log('SQL Error', err);
        res.status(500).json({error: {message: 'Unable to bind new user to this POG', code: 'failedPOGUserBind'}});
      }
    );
  })
  .delete((req, res) => {
    // Convert user to ID
    db.models.user.findOne({where: {ident: req.body.user}}).then(
      (user) => {
        if (user === null) return res.status(400).json({error: {message: 'invalid user reference', code: 'failedUserLookupBinding'}});

        // Create POGUser entry
        db.models.POGUser.destroy({where: {user_id: user.id, pog_id: req.POG.id, role: req.body.role}}).then(
          (poguser) => {
            if (poguser > 0) res.status(204).send();

            if (poguser === 0) res.status(400).json({error:{message: 'Unable to find a user to remove that fits the provided criteria'}});
          },
          (err) => {
            console.log('SQL Error', err);
            res.status(500).json({error: {message: 'Unable to bind new user to this POG', code: 'failedPOGUserBind'}});
          }
        );
      },
      (err) => {
        console.log('SQL Error', err);
        res.status(500).json({error: {message: 'Unable to bind new user to this POG', code: 'failedPOGUserBind'}});
      }
    );
  });

// Get Reports for this pog
router.route('/:POG/reports')
  .get((req, res) => {
    const opts = {
      where: {pog_id: req.POG.id},
      include: [
        {model: db.models.patientInformation, as: 'patientInformation', attributes: {exclude: ['id', 'deletedAt', 'pog_id']}},
        {model: db.models.tumourAnalysis.scope('public'), as: 'tumourAnalysis'},
        {model: db.models.user.scope('public'), as: 'createdBy'},
        {model: db.models.POG.scope('public'), as: 'pog'},
      ],
    };

    // States
    if (req.query.state) {
      const state = req.query.state.split(',');
      opts.where.state = {$in: state};
    }

    // return all reports
    db.models.analysis_report.scope('public').findAll(opts).then(
      (reports) => {
        res.json(reports);
      }
    )
      .catch((err) => {
        console.log('Unable to lookup analysis reports for POG', err);
        res.status(500).json({error: {message: 'Unable to lookup analysis reports.'}});
      });
  });

// Get Reports for this pog
router.route('/:POG/reports/:report')
  .get((req, res) => {
    const report = req.report.get();
    delete report.id;
    delete report.pog_id;
    delete report.createdBy_id;
    delete report.deletedAt;

    res.json(req.report);
  });

// NodeJS Module Return
module.exports = router;
