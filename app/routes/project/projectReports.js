const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const db = require('../../models');
const logger = require('../../log');

const {isAdmin} = require('../../libs/helperFunctions');

const router = express.Router({mergeParams: true});

// Report-project binding routes
router.route('/')
  .get((req, res) => {
    return res.json(req.project.reports);
  })
  .post(async (req, res) => {
    let report;
    try {
      report = await db.models.report.findOne({
        where: {ident: req.body.report},
        attributes: ['id', 'ident'],
      });
    } catch (error) {
      logger.error(`Error while trying to find report ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while trying to find report'},
      });
    }

    if (!report) {
      logger.error('Unable to find report');
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {message: 'Unable to find the supplied report'},
      });
    }

    if (!isAdmin(req.user) && !(req.user.projects).map((proj) => {return proj.name;}).includes(req.project.name)) {
      const msg = 'User does not have permission to add reports to this group';
      logger.error(msg);
      return res.status(HTTP_STATUS.FORBIDDEN).json({error: {message: msg}});
    }

    // Check for binding
    let binding;
    try {
      binding = await db.models.reportProject.findOne({
        where: {reportId: report.id, project_id: req.project.id},
      });
    } catch (error) {
      logger.error(`Error while trying to find report-project binding ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while trying to find report-project binding'},
      });
    }

    if (binding) {
      logger.error(`Report ${report.ident} is already bound to project ${req.project.name}`);
      return res.status(HTTP_STATUS.CONFLICT).json({
        error: {message: 'Report is already bound to this project'},
      });
    }

    try {
      const reportProject = await db.models.reportProject.create({
        project_id: req.project.id, reportId: report.id,
      });

      const output = {
        report: report.ident,
        project: req.project.name,
        createdAt: reportProject.createdAt,
        updatedAt: reportProject.updatedAt,
      };

      return res.status(HTTP_STATUS.CREATED).json(output);
    } catch (error) {
      logger.error(`Error while binding report to project ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while binding report to project'},
      });
    }
  })
  .delete(async (req, res) => {
    let report;
    try {
      report = await db.models.report.findOne({
        where: {ident: req.body.report},
        attributes: ['id', 'ident'],
      });
    } catch (error) {
      logger.error(`Error while trying to find report ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while trying to find report'},
      });
    }

    if (!report) {
      logger.error(`Unable to find report ${req.body.report}`);
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {message: `Unable to find report ${req.body.report}`},
      });
    }

    if (!isAdmin(req.user) && !(req.user.projects).map((proj) => {return proj.name;}).includes(req.project.name)) {
      const msg = 'User does not have permission to add this project from reports';
      logger.error(msg);
      return res.status(HTTP_STATUS.FORBIDDEN).json({error: {message: msg}});
    }

    let binding;
    try {
      binding = await db.models.reportProject.findOne({
        where: {project_id: req.project.id, reportId: report.id},
      });
    } catch (error) {
      logger.error(`Error while trying to find report-project binding ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while trying to find report-project binding'},
      });
    }

    if (!binding) {
      logger.error(`Report: ${report.ident} is not bound to project: ${req.project.name}`);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: {message: 'Report is not bound to project'},
      });
    }

    try {
      await binding.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Error while trying to remove report from project ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while trying to remove report from project'},
      });
    }
  });

module.exports = router;
