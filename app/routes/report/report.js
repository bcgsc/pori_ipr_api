const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const {Op, literal} = require('sequelize');

const email = require('../../libs/email');
const createReport = require('../../libs/createReport');
const {parseReportSortQuery} = require('../../libs/queryOperations');
const db = require('../../models');
const logger = require('../../log');
const {getUserProjects} = require('../../libs/helperFunctions');

const {hasAccessToNonProdReports,
  hasAccessToUnreviewedReports, isAdmin} = require('../../libs/helperFunctions');

const reportMiddleware = require('../../middleware/report');

const router = express.Router({mergeParams: true});

const schemaGenerator = require('../../schemas/schemaGenerator');
const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const {REPORT_UPDATE_BASE_URI, NOTIFICATION_EVENT} = require('../../constants');
const {BASE_EXCLUDE} = require('../../schemas/exclude');

const reportGetSchema = require('../../schemas/report/retrieve/reportGetQueryParamSchema');
// Generate schema's
const reportUploadSchema = require('../../schemas/report/reportUpload')(true);

const updateSchema = schemaGenerator(db.models.report, {
  baseUri: REPORT_UPDATE_BASE_URI,
  exclude: [...BASE_EXCLUDE, 'createdBy_id', 'templateId', 'config'],
  nothingRequired: true,
  properties: {
    template: {
      type: 'string',
      description: 'Template name',
    },
  },
});

const DEFAULT_PAGE_LIMIT = 25;
const DEFAULT_PAGE_OFFSET = 0;

// Register report middleware
router.param('report', reportMiddleware);

router.route('/:report')
  .get((req, res) => {
    return res.json(req.report.view('public'));
  })
  .put(async (req, res) => {
    const {report} = req;
    try {
      // validate against the model
      validateAgainstSchema(updateSchema, req.body, false);
    } catch (err) {
      const message = `There was an error updating the report ${err}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    // Check for switching template
    if (req.body.template) {
      let temp;
      // Try to find template
      try {
        temp = await db.models.template.findOne({where: {name: {[Op.iLike]: req.body.template}}});
      } catch (error) {
        const message = `Error while trying to find ${req.body.template} with error: ${error.message || error}`;
        logger.error(message);
        return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
      }

      if (!temp) {
        const message = `Template ${req.body.template} doesn't currently exist`;
        logger.error(message);
        return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
      }

      // Set new template id
      req.body.templateId = temp.id;
    }

    // Update db entry
    try {
      await report.update(req.body, {userId: req.user.id});
      await report.reload();
      return res.json(report.view('public'));
    } catch (error) {
      logger.error(`Unable to update the report ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update the report'}});
    }
  })
  .delete(async (req, res) => {
    try {
      await req.report.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Error trying to delete report ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error trying to delete report'}});
    }
  });

// Act on all reports
router.route('/')
  .get(async (req, res) => {
    let {
      query: {
        paginated, limit, offset, sort, project, states, role, searchText, keyVariant, matchingThreshold, kbVariant,
      },
    } = req;

    // Parse query parameters
    try {
      limit = (limit) ? parseInt(limit, 10) : DEFAULT_PAGE_LIMIT;
      offset = (offset) ? parseInt(offset, 10) : DEFAULT_PAGE_OFFSET;
      sort = (sort) ? parseReportSortQuery(sort) : undefined;
      states = (states) ? states.toLowerCase().split(',') : undefined;
    } catch (error) {
      logger.error(`Error with query parameters ${error}`);
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: {message: 'Error with one or more query parameters'},
      });
    }

    try {
      // validate request query parameters
      validateAgainstSchema(reportGetSchema, {
        paginated, limit, offset, sort, project, states, role, searchText, keyVariant, matchingThreshold, kbVariant,
      }, false);
    } catch (err) {
      const message = `Error while validating the query params of the report GET request ${err}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    // Get projects the user has access to
    let projects;
    try {
      projects = await getUserProjects(db.models.project, req.user);
      projects = projects.map((proj) => {
        return proj.name;
      });
    } catch (error) {
      const message = `Error while trying to get project access ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message}});
    }

    // Check if they want reports from a specific project
    // and that they have access to that project
    if (project) {
      if (projects.includes(project)) {
        projects = project;
      } else {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          error: {message: 'You do not have access to the selected project'},
        });
      }
    }

    // Generate options for report query
    const opts = {
      where: {
        ...((states) ? {state: states} : {}),
        ...((searchText) ? {
          [Op.or]: [
            {'$patientInformation.diagnosis$': {[Op.iLike]: `%${searchText}%`}},
            {'$patientInformation.biopsySite$': {[Op.iLike]: `%${searchText}%`}},
            {'$patientInformation.physician$': {[Op.iLike]: `%${searchText}%`}},
            {'$patientInformation.caseType$': {[Op.iLike]: `%${searchText}%`}},
            {patientId: {[Op.iLike]: `%${searchText}%`}},
            {alternateIdentifier: {[Op.iLike]: `%${searchText}%`}},
          ],
        } : {}),
        ...((keyVariant && matchingThreshold) ? {
          '$genomicAlterationsIdentified.geneVariant$': {
            [Op.in]: literal(
              `(SELECT "geneVariant"
              FROM (SELECT "geneVariant", word_similarity('${keyVariant}', "geneVariant") FROM reports_summary_genomic_alterations_identified) AS subquery
              WHERE word_similarity >= ${matchingThreshold})`,
            ),
          },
        } : {}),
        ...((kbVariant && matchingThreshold) ? {
          '$kbMatches.kb_variant$': {
            [Op.in]: literal(
              `(SELECT "kb_variant"
              FROM (SELECT "kb_variant", word_similarity('${kbVariant}', "kb_variant") FROM reports_kb_matches) AS subquery
              WHERE word_similarity >= ${matchingThreshold})`,
            ),
          },
        } : {}),
      },
      distinct: 'id',
      // **searchText with paginated with patientInformation set to required: true
      // should work and does for the most part, no errors, console logged query is correct
      // (I tested the generated SQL on the db and it worked fine), the returned
      // count is correct, but Sequelize never returns any rows.
      // Paginated can be added to searchText once this Sequelize bug is fixed.
      // Sequelize version is 6.5.0**
      ...((paginated && !searchText) ? {
        offset,
        limit,
      } : {}),
      order: (!sort) ? [
        ['state', 'desc'],
        ['patientId', 'desc'],
      ] : sort,
      include: [
        {
          model: db.models.patientInformation,
          as: 'patientInformation',
          attributes: {exclude: ['id', 'reportId', 'deletedAt', 'updatedBy']},
        },
        {model: db.models.user.scope('public'), as: 'createdBy'},
        {
          model: db.models.template.scope('minimal'),
          as: 'template',
          required: true,
        },
        {
          // Not using scope due to sequelize bug only returning one result when using scope,
          // update when sequelize has fixed that
          model: db.models.sampleInfo,
          attributes: {exclude: ['id', 'reportId', 'deletedAt', 'updatedBy']},
          as: 'sampleInfo',
        },
        {
          model: db.models.reportUser,
          as: 'users',
          attributes: ['ident', 'role', 'createdAt', 'updatedAt'],
          include: [
            {model: db.models.user.scope('public'), as: 'user'},
          ],
        },
        {
          model: db.models.project,
          as: 'projects',
          ...((isAdmin(req.user) && !project) ? {required: false} : {}),
          where: {
            name: projects,
          },
          attributes: {exclude: ['id', 'deletedAt', 'updatedBy']},
          through: {attributes: ['additionalProject']},
        },
        {
          model: db.models.signatures.scope('public'),
          as: 'signatures',
        },
        ...((role) ? [{
          model: db.models.reportUser,
          as: 'ReportUserFilter',
          where: {
            user_id: req.user.id,
            role,
          },
        }] : []),
        ...((keyVariant && matchingThreshold) ? [{
          model: db.models.genomicAlterationsIdentified.scope('public'),
          as: 'genomicAlterationsIdentified',
        }] : []),
        ...((kbVariant && matchingThreshold) ? [{
          model: db.models.kbMatches.scope('minimal'),
          as: 'kbMatches',
        }] : []),
      ],
    };

    if (!hasAccessToNonProdReports(req.user)) {
      opts.where = {
        ...opts.where,
        [Op.not]: {state: 'nonproduction'},
      };
    }
    if (!hasAccessToUnreviewedReports(req.user)) {
      opts.where = {
        ...opts.where,
        state: ['reviewed', 'completed'],
      };
    }

    try {
      const reports = await db.models.report.scope('public').findAndCountAll(opts);
      const results = {total: reports.count, reports: reports.rows};

      return res.json(results);
    } catch (error) {
      logger.error(`Unable to lookup reports ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to lookup reports'}});
    }
  })
  .post(async (req, res) => {
    const {
      query: {ignore_extra_fields, upload_contents},
    } = req;
    if (req.body.sampleInfo) {
      // Clean sampleInfo input
      const cleanSampleInfo = [];
      for (const sampleInfoObject of req.body.sampleInfo) {
        cleanSampleInfo.push(
          {
            sample: (sampleInfoObject.Sample) ? sampleInfoObject.Sample : sampleInfoObject.sample,
            pathoTc: (sampleInfoObject['Patho TC']) ? sampleInfoObject['Patho TC'] : sampleInfoObject.pathoTc,
            biopsySite: (sampleInfoObject['Biopsy Site']) ? sampleInfoObject['Biopsy Site'] : sampleInfoObject.biopsySite,
            biopsyType: (sampleInfoObject['Biopsy Type']) ? sampleInfoObject['Biopsy Type'] : sampleInfoObject.biopsyType,
            sampleName: (sampleInfoObject['Sample Name']) ? sampleInfoObject['Sample Name'] : sampleInfoObject.sampleName,
            primarySite: (sampleInfoObject['Primary Site']) ? sampleInfoObject['Primary Site'] : sampleInfoObject.primarySite,
            collectionDate: (sampleInfoObject['Collection Date']) ? sampleInfoObject['Collection Date'] : sampleInfoObject.collectionDate,
          },
        );
      }
      req.body.sampleInfo = cleanSampleInfo;
    }

    try {
      // eslint-disable-next-line camelcase
      if (ignore_extra_fields) {
        validateAgainstSchema(reportUploadSchema, req.body, true, ignore_extra_fields);
      } else {
        validateAgainstSchema(reportUploadSchema, req.body);
      }
    } catch (error) {
      const message = `There was an error validating the report content ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    // eslint-disable-next-line camelcase
    if (upload_contents) {
      req.body.uploadContents = JSON.stringify(req.body);
    }

    try {
      req.body.createdBy_id = req.user.id;
      const report = await createReport(req.body);
      const projectIdArray = [];
      report.projects.forEach((project) => {
        projectIdArray.push(project.project_id);
      });

      await db.models.notification.findOrCreate({
        where: {
          userId: req.user.id,
          eventType: NOTIFICATION_EVENT.REPORT_CREATED,
          templateId: report.templateId,
          projectId: report.projects[0].project_id,
        },
      });

      await email.notifyUsers(
        `Report Created: ${req.body.patientId} ${req.body.template}`,
        `New report:
        Ident: ${report.ident}
        Created by: ${req.user.firstName} ${req.user.lastName}
        Project: ${req.body.project}
        Template: ${req.body.template}
        Patient: ${req.body.patientId}`,
        {
          eventType: NOTIFICATION_EVENT.REPORT_CREATED,
          templateId: report.templateId,
          projectId: projectIdArray,
        },
      );

      return res.status(HTTP_STATUS.CREATED).json({message: 'Report upload was successful', ident: report.ident});
    } catch (error) {
      logger.error(error.message || error);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: error.message}});
    }
  });

module.exports = router;
