const {Op} = require('sequelize');
const db = require('../../../models');
const RoutingInterface = require('../../../routes/routingInterface');
const Analysis = require('../analysis.object');

const comparators = require('../../../../database/comparators.json');
const comparatorsV9 = require('../../../../database/comparators.v9.json');

const logger = require('../../../log');

const Patient = require('../../../libs/patient/patient.library');
const analysisMiddleware = require('../../../middleware/analysis');
const {UUIDregex} = require('../../../constants');

const DEFAULT_PAGE_LIMIT = 25;
const DEFAULT_PAGE_OFFSET = 0;


/**
 * Create and bind routes for Tracking
 *
 * @type {TrackingRouter}
 */
class TrackingRouter extends RoutingInterface {
  constructor(io) {
    super();
    this.io = io;
    // Register Middleware
    this.router.param('analysis', analysisMiddleware);
    // Setup analysis endpoint
    this.analysis();
    // Comparators
    this.comparators();
    // Base Biopsy Endpoints
    this.router.route('/')
      .get(async (req, res) => {
        const opts = {
          order: [['createdAt', 'DESC']],
          include: [
            {as: 'analysis', model: db.models.analysis_report, separate: true},
          ],
          where: {},
        };

        const pogInclude = {
          as: 'pog',
          model: db.models.POG,
          where: {},
          include: [
            {
              as: 'patientInformation',
              model: db.models.patientInformation,
              where: {},
              required: false,
            },
          ],
        };

        if (req.query.search) {
          opts.where['$pog.POGID$'] = {[Op.iLike]: `%${req.query.search}%`};
        }

        const projectInclude = {
          as: 'projects',
          model: db.models.project,
          attributes: {exclude: ['id', 'createdAt', 'updatedAt', 'deletedAt']},
          where: {},
        };

        if (req.query.project) {
          projectInclude.where = {name: req.query.project};
        }

        pogInclude.include.push(projectInclude);
        opts.include.push(pogInclude);

        let pogAnalyses;
        try {
          pogAnalyses = await db.models.pog_analysis.findAndCountAll(opts);
        } catch (error) {
          logger.error(`Error while trying to find all pog analyses ${error}`);
          return res.status(500).json({message: 'Error while trying to find all pog analyses'});
        }

        let {rows, count} = pogAnalyses;

        // Need to take care of limits and offsets outside of query to support natural sorting
        if (req.query.paginated) {
          const limit = parseInt(req.query.limit, 10) || DEFAULT_PAGE_LIMIT;
          const offset = parseInt(req.query.offset, 10) || DEFAULT_PAGE_OFFSET;

          // Reverse natural sort by POGID
          rows.sort((a, b) => {
            return b.pog.POGID.localeCompare(a.pog.POGID, undefined, {numeric: true, sensitivity: 'base'});
          });

          // apply limit and offset to results
          const start = offset;
          const finish = offset + limit;
          rows = rows.slice(start, finish);
        }

        return res.json({total: count, analysis: rows});
      })

      // Add Biopsy/Analysis entry
      .post(async (req, res) => {
        const validationErr = [];

        // Require Fields
        if (!req.body.POGID) {
          validationErr.push('A valid POGID is required');
        }
        if (!req.body.clinical_biopsy) {
          validationErr.push('A clinical biopsy value is required');
        }
        if (!req.body.disease) {
          validationErr.push('A valid disease type is required');
        }
        if (!req.body.threeLetterCode || req.body.threeLetterCode.trim().length !== 3) {
          validationErr.push('A valid cancer group (three letter code) is required');
        }
        if (!req.body.biopsy_date) {
          validationErr.push('A valid biopsy date is required');
        }
        if (req.body.physician.length < 1) {
          validationErr.push('At least one physician is required');
        }
        if (validationErr.length > 0) {
          return res.status(400).json({message: 'Invalid inputs supplied', cause: validationErr});
        }

        const pogFields = {
          alternate_identifier: req.body.alternate_identifier,
          age_of_consent: req.body.age_of_consent,
        };

        let POG;
        try {
          POG = await Patient.retrieveOrCreate(req.body.POGID, req.body.project, pogFields);
        } catch (error) {
          logger.error(`Error will trying to retrieve/create patient ${error}`);
          return res.status(500).json({message: 'Error while trying to retrieve/create patient'});
        }

        const analysis = {
          pog_id: POG.id,
          clinical_biopsy: req.body.clinical_biopsy,
          disease: req.body.disease,
          threeLetterCode: req.body.threeLetterCode,
          biopsy_notes: req.body.biopsy_notes,
          biopsy_date: req.body.biopsy_date,
          notes: req.body.notes,
          physician: req.body.physician,
          pediatric_id: req.body.pediatric_id,
        };

        if (req.body.libraries && (req.body.libraries.tumour || req.body.libraries.transcriptome || req.body.libraries.normal)) {
          analysis.libraries = req.body.libraries;
        }

        if (req.body.analysis_biopsy) {
          analysis.analysis_biopsy = req.body.analysis_biopsy;
        }

        let pogAnalysis;
        try {
          pogAnalysis = await db.models.pog_analysis.create(analysis);
        } catch (error) {
          logger.error(`Error while trying to create POG analysis ${error}`);
          return res.status(500).json({message: 'Error while trying to create POG analysis'});
        }

        pogAnalysis = pogAnalysis.toJSON();
        pogAnalysis.pog = POG;
        return res.json(pogAnalysis);
      });
  }

  // Single Entry
  analysis() {
    this.router.route(`/:analysis(${UUIDregex})`)
      .put(async (req, res) => {
        const analysis = new Analysis(req.analysis);
        try {
          const updatedAnalysis = await analysis.update(req.body);
          return res.json(updatedAnalysis);
        } catch (error) {
          logger.error(`Error while updating analysis settings ${error}`);
          return res.status(500).json({message: `Error while updating analysis settings ${error}`});
        }
      })
      .get((req, res) => {
        return res.json(req.analysis);
      })
      .delete((req, res) => {
        return res.status(204).send();
      });

    this.router.get('/backfillComparators', async (req, res) => {
      let analyses;
      try {
        analyses = await db.models.pog_analysis.scope('public').findAll({where: {analysis_biopsy: {[Op.ne]: null}}});
      } catch (error) {
        logger.error(`There was an error while finding all POG analyses ${error}`);
        return res.status(500).json({message: 'There was an error while finding all POG analyses'});
      }

      logger.info(`Found ${analyses.length} entries`);

      const updates = [];

      try {
        const result = await Promise.all(updates.map((update) => {
          return db.models.pog_analysis.update(update.data, {where: {ident: update.analysis.ident}});
        }));
        return res.json(result);
      } catch (error) {
        logger.error(`Error while trying to backfill biopsy data ${error}`);
        return res.status(500).json({message: `Failed to backfill biopsy data: ${error.message}`});
      }
    });
  }

  // Comparator Endpoints
  comparators() {
    this.router.get('/comparators', (req, res) => {
      return res.json({v8: comparators, v9: comparatorsV9});
    });
  }
}

module.exports = TrackingRouter;
