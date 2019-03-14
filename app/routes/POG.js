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
  .get(async (req, res) => {
    // Create the getAllPogs query
    const opts = {};
    opts.attributes = {exclude: ['id', 'deletedAt', 'config', 'seqQC']};
    opts.order = [['POGID', 'ASC']];
    opts.include = [];
    opts.where = {nonPOG: false};

    // Check user permission and filter by project
    const access = new Acl(req, res);
    try {
      const results = await access.getProjectAccess();
      const projectAccess = _.map(results, 'name');
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

      const pogs = await db.models.POG.findAll(opts);
      res.json(pogs);
    } catch (error) {
      res.status(500).json({error: {message: error.message, code: error.code}});
    }
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
    access.isPog = true;
    if (access.check() === false) return;

    res.json(req.POG);
  })
  .put(async (req, res) => {
    // Access Control
    const access = new Acl(req, res);
    access.isPog = true;
    access.pogEdit = ['analyst', 'reviewer', 'admin', 'superUser', 'Projects'];
    if (access.check() === false) return;

    // Update POG
    const updateBody = {
      alternate_identifier: req.body.alternate_identifier,
      age_of_consent: req.body.age_of_consent,
    };

    try {
      // Attempt POG model update
      const result = await db.models.POG.update(updateBody, {where: {ident: req.body.ident}, limit: 1, returning: true});
      res.json(result[1][0]);
    } catch (error) {
      res.status(500).json({error: {message: 'Unable to update patient. Please try again', code: 'failedPOGUpdateQuery'}});
    }
  });

/**
 * Endpoints for user binding
 *
 */
router.route('/:POG/user')
  // Bind a new user to this POG
  .post(async (req, res) => {
    try {
      // Convert user to ID
      const user = await db.models.user.findOne({where: {ident: req.body.user}});
      if (user === null) {
        res.status(400).json({error: {message: 'invalid user reference', code: 'failedUserLookupBinding'}});
        return;
      }
      // Create POGUser entry
      const pogUser = await db.models.POGUser.create(
        {
          user_id: user.id, pog_id: req.POG.id, role: req.body.role, addedBy_id: req.user.id,
        }
      );
      // Get POGUser entry
      const POGUser = await db.models.POGUser.findOne({
        where: {id: pogUser.id},
        attributes: {exclude: ['id', 'pog_id', 'user_id', 'addedBy_id', 'deletedAt']},
        include: [
          {as: 'user', model: db.models.user, attributes: {exclude: ['id', 'password', 'deletedAt', 'access', 'jiraToken']}},
          {as: 'addedBy', model: db.models.user, attributes: {exclude: ['id', 'password', 'deletedAt', 'access', 'jiraToken']}},
        ],
      });

      res.json(POGUser);
    } catch (error) {
      console.log('SQL Error', error);
      res.status(500).json({error: {message: error.message, code: error.message}});
    }
  })
  .delete(async (req, res) => {
    try {
      // Convert user to ID
      const user = await db.models.user.findOne({where: {ident: req.body.user}});
      if (user === null) {
        return res.status(400).json({error: {message: 'invalid user reference', code: 'failedUserLookupBinding'}});
      }
      // Create POGUser entry
      const poguser = await db.models.POGUser.destroy({where: {user_id: user.id, pog_id: req.POG.id, role: req.body.role}});
      if (poguser > 0) return res.status(204).send();

      if (poguser === 0) return res.status(400).json({error: {message: 'Unable to find a user to remove that fits the provided criteria'}});
    } catch (error) {
      console.log('SQL Error', error);
      return res.status(500).json({error: {message: error.message, code: error.code}});
    }
  });

// Get Reports for this pog
router.route('/:POG/reports')
  .get(async (req, res) => {
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

    try {
      // return all reports
      const reports = await db.models.analysis_report.scope('public').findAll(opts);
      res.json(reports);
    } catch (error) {
      console.log('Unable to lookup analysis reports for POG', error);
      res.status(500).json({error: {message: 'Unable to lookup analysis reports.'}});
    }
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
