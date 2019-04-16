const _ = require('lodash');
const db = require('../../../models');
const RoutingInterface = require('../../../routes/routingInterface');
const Analysis = require('../analysis.object');
const Generator = require('../../tracking/generate');
const $bioapps = require('../../../api/bioapps');
const $lims = require('../../../api/lims');

const comparators = require('../../../../database/comparators.json');
const comparatorsV9 = require('../../../../database/comparators.v9.json');

const {logger} = process;

const Patient = require('../../../libs/patient/patient.library');
const analysisMiddleware = require('../../../middleware/analysis');

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
    this.registerMiddleware('analysis', analysisMiddleware);
    // Setup analysis endpoint
    this.analysis();
    // Extended Details
    this.extended();
    // Comparators
    this.comparators();
    // Base Biopsy Endpoints
    this.registerResource('/')
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
          opts.where['$pog.POGID$'] = {$ilike: `%${req.query.search}%`};
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

        //??? Might need to add null check here

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

        if (req.body.tracking) {
          let trackingStateDef;
          // Get initial tracking state to generate card for
          try {
            trackingStateDef = await db.models.tracking_state_definition.findOne({where: {ordinal: 1}});
          } catch (error) {
            logger.error(`Error while finding tracking state definition ${error}`);
            return res.status(500).json({message: 'Error while finding tracking state definition'});
          }

          // Initiate Tracking Generator
          const initState = [{
            slug: trackingStateDef.slug,
            status: 'active',
          }];

          new Generator(pogAnalysis, req.user, initState);
        }

        pogAnalysis = pogAnalysis.toJSON();
        pogAnalysis.pog = POG;
        return res.json(pogAnalysis);
      });
  }

  // Single Entry
  analysis() {
    this.registerResource(`/:analysis(${this.UUIDregex})`)
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
        return res.status(420).send();
      });

    this.registerEndpoint('post', '/bioAppsTest', async (req, res) => {
      let patient;
      // Get POG
      try {
        patient = await db.models.POG.findOne({where: {id: 252}});
      } catch (error) {
        logger.error(`There was an error while trying to find a POG ${error}`);
        return res.status(500).json({message: 'There was an error while trying to find a POG'});
      }

      logger.info(`Found patient: ${patient}`);

      let analysis;
      try {
        analysis = await db.models.pog_analysis.findOne({where: {pog_id: patient.id, analysis_biopsy: {$not: null}}});
      } catch (error) {
        logger.error(`There was an error while finding the POG analysis ${error}`);
        return res.status(500).json({message: 'There was an error while finding the POG analysis'});
      }

      logger.info(`Found analysis: ${analysis}`);

      try {
        const updatedPatientAnalysis = await $bioapps.updatePatientAnalysis(patient.POGID, analysis);
        return res.json(updatedPatientAnalysis);
      } catch (error) {
        logger.error(`There was an error while updating the patient analysis ${error}`);
        return res.status(500).json({message: 'There was an error while updating the patient analysis'});
      }
    });

    this.registerEndpoint('get', '/backfillComparators', async (req, res) => {
      let analyses;
      try {
        analyses = await db.models.pog_analysis.scope('public').findAll({where: {analysis_biopsy: {$not: null}}});
      } catch (error) {
        logger.error(`There was an error while finding all POG analyses ${error}`);
        return res.status(500).json({message: 'There was an error while finding all POG analyses'});
      }

      logger.info(`Found ${analyses.length} entries`);

      let bioAppsResults;
      // create promise array with request for data
      try {
        bioAppsResults = await Promise.all(analyses.map((analysis) => {
          return $bioapps.patient(analysis.pog.POGID);
        }));
      } catch (error) {
        logger.error(`There was an error while retrieving BioApps patient data ${error}`);
        return res.status(500).json({message: 'There was an error while retrieving BioApps patient data'});
      }

      const updates = [];

      bioAppsResults.forEach(async (result) => {
        if (result.length === 0) {
          logger.error('No BioApps results found');
          return;
        }
        [result] = result; // Remove array wrapper

        const update = {
          data: {
            comparator_disease: {},
            comparator_normal: {},
          },
          where: {},
        };

        if (result.sources.length < 1) {
          logger.error(`No sources for ${result.id}`);
          return;
        }

        const pogid = result.sources[0].participant_study_identifier;
        const analysis = analyses.find((pogAnalysis) => {
          return pogAnalysis.pog.POGID === pogid;
        });

        if (!analysis) {
          logger.error(`Failed to find an analysis & biosy for ${result.id}`);
          return;
        }

        let source;
        // Pick the sources we're looking for.
        for (const s of result.sources) {
          const found = _.find(s.libraries, {name: analysis.libraries.tumour});
          if (found) {
            source = s;
            return;
          }
        }

        // Check if source was found. If not, move to next entry.
        if (!source) {
          logger.error(`Unable to find source for ${result.id}`);
          return;
        }

        if (source.source_analysis_settings.length === 0) {
          logger.error('No analysis settings for source');
          return;
        }

        let sourceAnalysisSetting;
        try {
          source.source_analysis_settings = _.sortBy(source.source_analysis_settings, 'data_version');
          sourceAnalysisSetting = _.last(source.source_analysis_settings);

          // With a source Found, time to build the update for this case;
          update.data.analysis_biopsy = `biop${sourceAnalysisSetting.biopsy_number}`;
          update.data.bioapps_source_id = source.id;
          update.data.biopsy_site = source.anatomic_site;

          // Three Letter Code
          update.data.threeLetterCode = sourceAnalysisSetting.cancer_group.code;
        } catch (error) {
          logger.error(`BioApps source analysis setting missing required details: ${error}`);
          throw new Error(`BioApps source analysis settings missing required details: ${error.message}`);
        }

        let parsedSettings;
        try {
          parsedSettings = await $bioapps.parseSourceSettings(source);
        } catch (error) {
          logger.error(`There was an error while trying to parse source settings ${error}`);
          throw new Error(`There was an error while trying to parse source settings ${error}`);
        }

        update.analysis = analysis;

        // Compile Disease Comparator
        update.data.comparator_disease = {
          analysis: parsedSettings.disease_comparator_analysis,
          all: parsedSettings.disease_comparators,
          tumour_type_report: parsedSettings.tumour_type_report,
          tumour_type_kb: parsedSettings.tumour_type_kb,
        };

        update.data.comparator_normal = {
          normal_primary: parsedSettings.normal_primary,
          normal_biopsy: parsedSettings.normal_biopsy,
          gtex_primary: parsedSettings.gtex_primary,
          gtex_biopsy: parsedSettings.gtex_biopsy,
        };
        updates.push(update);
      });

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

  // Extended Details
  extended() {
    this.registerEndpoint('get', `/extended/:analysisIdent(${this.UUIDregex})`, async (req, res) => {
      let bioAppsPatient = null;
      const limsIllumina = {};
      let analysis = null;

      const opts = {
        limit: req.query.limit || 15,
        offset: req.query.offset || 0,
        order: [['createdAt', 'DESC']],
        include: [
          {as: 'analysis', model: db.models.analysis_report, separate: true},
        ],
        where: {ident: req.params.analysisIdent},
      };

      const pogInclude = {as: 'pog', model: db.models.POG.scope('public'), where: {}};

      opts.include.push(pogInclude);

      let pogAnalysis;
      let patient;
      try {
        pogAnalysis = await db.models.pog_analysis.findOne(opts);
        patient = await $bioapps.patient(analysis.pog.POGID);
        if (patient.length === 0) {
          return res.status(404).json({message: 'Failed to find patient record in BioApps for unknown reasons.'});
        }
        bioAppsPatient = patient[0];
        const result = await $lims.illuminaRun([analysis.libraries.tumour, analysis.libraries.transcriptome]);
        if (result.length === 0) {
          return res.status(404).json({message: 'Failed to find Illumina Run records in LIMS for unknown reasons.'});
        }
      } catch (error) {
        //
      }
      //Working though below query!!!
      // Execute Query
      db.models.pog_analysis.findOne(opts)
        .then((result) => {
          analysis = result;
        })
        .then(() => {
          return $bioapps.patient(analysis.pog.POGID);
        })
        .then((result) => {
          if (result.length === 0) {
            res.status(404).json({message: 'Failed to find patient record in BioApps for unknown reasons.'});
            return;
          }
          bioAppsPatient = result[0];
        })
        .then(() => {
          return $lims.illuminaRun([analysis.libraries.tumour, analysis.libraries.transcriptome]);
        })
        .then((result) => {
          if (result.length === 0) {
            res.status(404).json({message: 'Failed to find Illumina Run records in LIMS for unknown reasons.'});
            return;
          }
          // Loop over lanes
          _.forEach(result.results, (row) => {
            let tumour = null;
            let rna = null;
            let pool = null;
            
            // Multiplex library
            if (row.multiplex_libraries.length > 0) {
              if (row.multiplex_libraries.indexOf(analysis.libraries.tumour) > -1) pool = tumour = true;
              if (row.multiplex_libraries.indexOf(analysis.libraries.transcriptome) > -1) pool = rna = true;
            }
            
            // Non-multiplex
            if (row.multiplex_libraries.length === 0) {
              if (row.library === analysis.libraries.tumour) tumour = true;
              if (row.library === analysis.libraries.transcriptome) rna = true;
            }
            
            if (tumour) {
              if (analysis.libraries.tumour in limsIllumina) limsIllumina[analysis.libraries.tumour].lanes++;
              if (!(analysis.libraries.tumour in limsIllumina)) limsIllumina[analysis.libraries.tumour] = {sequencer: row.sequencer, lanes: 1, pool: (pool) ? row.library : {max: 1}};
            }
            
            if (rna) {
              if (analysis.libraries.transcriptome in limsIllumina) limsIllumina[analysis.libraries.transcriptome].lanes++;
              if (!(analysis.libraries.transcriptome in limsIllumina)) limsIllumina[analysis.libraries.transcriptome] = {sequencer: row.sequencer, lanes: 1, pool: (pool) ? row.library : {max: 1}};
            }
          });
        })
        .then(() => {
          if (Object.keys(limsIllumina).length === 0) {
            res.status(404).json({message: 'Failed to retrieve LIMS Illumina Run information.'});
            return;
          }
          
          if (!bioAppsPatient.sources) {
            res.status(404).json({message: 'Failed to retrieve patient record for BioApps with sources listed.'});
            return;
          }
        
          // Get Source
          // Find diseased sources
          const sources = _.filter(bioAppsPatient.sources, {pathology: 'Diseased'});
          if (!sources) {
            res.status(404).json({message: 'Failed to find a BioApps record with disease source identified'});
            return;
          }

          // Filter for source that has a matching analysis biopsy
          const biopsyRegex = '([a-z]+)([0-9]+)';
          // splitting analysis biopsy into sample type and biopsy number
          const analysisBiopsy = analysis.analysis_biopsy.match(biopsyRegex);
          let source = null;
          let bioappsSources = '';
          _.forEach(sources, (biospySource) => { // checking each source for matching biopsy
            const sourceAnalysisSettings = biospySource.source_analysis_settings;
            bioappsSources += `${sourceAnalysisSettings.sample_type} and ${sourceAnalysisSettings.biopsy_number}, `;
            const sourceCheck = _.find(sourceAnalysisSettings, {
              sample_type: analysisBiopsy[1], biopsy_number: parseInt(analysisBiopsy[2], 10),
            });
            if (sourceCheck) {
              source = biospySource;
              return false; // must be false to exit Lodash forEach
            }
          });

          if (!source) {
            res.status(404).json({
              message: `Searched Bioapps for sample_type: ${analysisBiopsy[1]} and biopsy_number: ${parseInt(analysisBiopsy[2], 10)} but found ${bioappsSources}`,
            });
            return;
          }

          // get the latest version of analysis settings for the source
          const analysis_settings = _.last(_.orderBy(source.source_analysis_settings, 'data_version'));

          if (!analysis_settings) {
            res.status(404).json({message: 'Failed to find a BioApps record with analysis settings'});
            return;
          }
          
          // Map to variables
          const response = {
            patient: analysis.pog.POGID,
            sex: source.sex,
            age: source.stage,
            threeLetterCode: analysis.threeLetterCode,
            lib_normal: analysis.libraries.normal,
            lib_tumour: analysis.libraries.tumour,
            pool_tumour: limsIllumina[analysis.libraries.tumour].pool,
            lib_rna: analysis.libraries.transcriptome,
            pool_rna: limsIllumina[analysis.libraries.transcriptome].pool,
            disease: analysis.disease,
            biopsy_notes: analysis.biopsy_notes,
            biop: analysis_settings.sample_type + analysis_settings.biopsy_number,
            num_lanes_rna: limsIllumina[analysis.libraries.transcriptome].lanes,
            num_lanes_tumour: limsIllumina[analysis.libraries.tumour].lanes,
            sequencer_rna: limsIllumina[analysis.libraries.transcriptome].sequencer,
            sequencer_tumour: limsIllumina[analysis.libraries.tumour].sequencer,
            priority: analysis.priority,
            biofxician: null,
            analysis_due: analysis.date_analysis,
          };
      
          res.json(response);
        })
        .catch((err) => {
          console.log('Error', err);
          res.status(500).json({message: 'Failed to query extended details'});
        });
    });
  }
  
  // Comparator Endpoints
  comparators() {
    this.registerEndpoint('get', '/comparators', (req, res) => {
      return res.json({v8: comparators, v9: comparatorsV9});
    });
  }
}

module.exports = TrackingRouter;
