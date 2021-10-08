const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const {Op, literal} = require('sequelize');

const db = require('../../models');
const logger = require('../../log');

const router = express.Router({mergeParams: true});

// Get all the therapeutic targets for a project
router.route('/')
  .get(async (req, res) => {
    try {
      const results = await db.models.therapeuticTarget.scope('publicWithoutRank').findAndCountAll({
        where: {
          reportId: {
            [Op.in]: literal(`(SELECT DISTINCT report_id FROM report_projects WHERE project_id = ${req.project.id} AND deleted_at IS NULL)`),
          },
        },
        include: [
          {
            model: db.models.report,
            as: 'report',
            attributes: ['ident', 'patientId'],
          },
        ],
      });
      return res.json(results);
    } catch (error) {
      logger.error(`Error trying to get therapeutic targets for project ${req.project.name} ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: `Error trying to get therapeutic targets for project ${req.project.name}`},
      });
    }
  });

module.exports = router;
