'use strict';

// app/routes/genomic/detailedGenomicAnalysis.js
const _ = require('lodash');

const db = require(`${process.cwd()}/app/models`);
const RoutingInterface = require('../../../routes/routingInterface');
const Analysis = require('../analysis.object');
const Generator = require('../../tracking/generate');
const $bioapps = require('../../../api/bioapps');
const $lims = require('../../../api/lims');

const comparators = require(`${process.cwd()}/database/comparators.json`);
const comparators_v9 = require(`${process.cwd()}/database/comparators.v9.json`);
const logger = process.logger;

const Patient = require(`${process.cwd()}/app/libs/patient/patient.library`);


/**
 * Create and bind routes for Tracking
 *
 * @type {TrackingRouter}
 */
module.exports = class TrackingRouter extends RoutingInterface {
  constructor(io) {
    super();
    this.io = io;
    // Register Middleware
    this.registerMiddleware('analysis', require('../../../middleware/analysis'));
    // Setup analysis endpoint
    this.analysis();
    // Extended Details
    this.extended();
    // Comparators
    this.comparators();
    // Base Biopsy Endpoints
    this.registerResource('/')
      .get((req, res) => {
        const opts = {
          order: [['createdAt', 'DESC']],
          include: [
            {as: 'analysis', model: db.models.analysis_report, separate: true},
          ],
          where: {},
        };
        const pog_include = {
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
        if (req.query.search) opts.where['$pog.POGID$'] = {$ilike: `%${req.query.search}%`};

        const project_include = {
          as: 'projects',
          model: db.models.project,
          attributes: {exclude: ['id', 'createdAt', 'updatedAt', 'deletedAt']},
          where: {},
        };
        if (req.query.project) {
          project_include.where = {name: req.query.project};
        }
        pog_include.include.push(project_include);
        opts.include.push(pog_include);
        // Execute Query
        db.models.pog_analysis.findAndCountAll(opts)
          .then((result) => {
            let rows = result.rows;

            // Need to take care of limits and offsets outside of query to support natural sorting
            if (req.query.paginated) {
              const limit = parseInt(req.query.limit) || 25; // Gotta parse those ints because javascript is javascript!
              const offset = parseInt(req.query.offset) || 0;

              const analysis = result.rows;

              // Reverse natural sort by POGID
              analysis.sort((a, b) => {
                return b.pog.POGID.localeCompare(a.pog.POGID, undefined, {numeric: true, sensitivity: 'base'});
              });

              // apply limit and offset to results
              const start = offset;
              const finish = offset + limit;
              rows = analysis.slice(start, finish);
            }

            res.json({total: result.count, analysis: rows});
          })
          .catch((err) => {
            console.log(err);
            res.status(500).json({message: 'Unable to fulfill the request for biopsies/analyses'});
          });
      })
      // Add Biopsy/Analysis entry
      .post((req, res) => {
        // Gather and verify information
        const analysis = {};
        let POG;
        const validation_err = [];
        // Require Fields
        if (!req.body.POGID) {
          validation_err.push('A valid POGID is required');
        }
        if (!req.body.clinical_biopsy) {
          validation_err.push('A clinical biopsy value is required');
        }
        if (!req.body.disease) {
          validation_err.push('A valid disease type is required');
        }
        if (!req.body.threeLetterCode || req.body.threeLetterCode.trim().length !== 3) {
          validation_err.push('A valid cancer group (three letter code) is required');
        }
        if (!req.body.biopsy_date) {
          validation_err.push('A valid biopsy date is required');
        }
        if (req.body.physician.length < 1) {
          validation_err.push('At least one physician is required');
        }
        if (validation_err.length > 0) {
          res.status(400).json({message: 'Invalid inputs supplied', cause: validation_err});
          return;
        }
        const pogFields = {
          alternate_identifier: req.body.alternate_identifier,
          age_of_consent: req.body.age_of_consent,
        };

        Patient.retrieveOrCreate(req.body.POGID, req.body.project, pogFields)
          .then((pog) => {
            POG = pog;
            analysis.pog_id = pog.id;
            analysis.clinical_biopsy = req.body.clinical_biopsy;
            analysis.disease = req.body.disease;
            analysis.threeLetterCode = req.body.threeLetterCode;
            analysis.biopsy_notes = req.body.biopsy_notes;
            analysis.biopsy_date = req.body.biopsy_date;
            analysis.notes = req.body.notes;
            analysis.physician = req.body.physician;
            analysis.pediatric_id = req.body.pediatric_id;
            if (req.body.libraries && (req.body.libraries.tumour || req.body.libraries.transcriptome || req.body.libraries.normal)) {
              analysis.libraries = req.body.libraries;
            }
            if (req.body.analysis_biopsy) analysis.analysis_biopsy = req.body.analysis_biopsy;
            return db.models.pog_analysis.create(analysis);
          })
          .then((analysis) => {
            // Generate Tracking if selected.
            if (req.body.tracking) {
              // Get initial tracking state to generate card for
              db.models.tracking_state_definition.findOne({where: {ordinal: 1}})
                .then((stateDefinition) => {
                // Initiate Tracking Generator
                  const initState = [{
                    slug: stateDefinition.slug,
                    status: 'active',
                  }];
                  return new Generator(analysis, req.user, initState);
                })
                .then((results) => {
                  analysis = analysis.toJSON();
                  analysis.pog = POG;
                  res.json(analysis);
                })
                .catch((err) => {
                  console.log(err);
                  res.status(400).json(err);
                });
            } else {
              analysis = analysis.toJSON();
              analysis.pog = POG;
              res.json(analysis);
            }
          })
          .catch((err) => {
            res.status(500).json({message: `Something went wrong, we were unable to add the biopsy: ${err.message}`});
            console.log(err);
          });
      });
  }

  // Single Entry
  analysis() {
    this.registerResource(`/:analysis(${this.UUIDregex})`)
      .put((req, res) => {
        const analysis = new Analysis(req.analysis);
        analysis.update(req.body)
          .then((result) => {
            res.json(result);
          })
          .catch((err) => {
            console.log(err);
            res.status(500).json({message: `Failed to update analysis settings: ${err.message}`});
          });
      })
      .get((req, res) => {
        res.json(req.analysis);
      })
      .delete((req, res) => {
        res.status(420).send();
      });
    this.registerEndpoint('post', '/bioAppsTest', (req, res) => {
      let patient;
      // Get POG
      db.models.POG.findOne({where: {id: 252}})
        .then((result) => {
          patient = result;
          console.log('Found patient: ', (patient));
          return db.models.pog_analysis.findOne({where: {pog_id: patient.id, analysis_biopsy: {$not: null}}});
          // return db.models.pog_analysis.findOne({where: {pog_id: patient.id}});
        })
        .then((analysis) => {
          console.log('Found analysis: ', (analysis));
          // return analysis;
          // Time to call BioApps!
          return $bioapps.updatePatientAnalysis(patient.POGID, analysis);
        })
        .then((response) => {
          res.json(response);
        })
        .catch((e) => {
          let message = '';
          if (e.statusCode === 500) message = 'BioApps was unable to fulfill the update request sent.';
          if (e.statusCode === 404) message = `The provided patient (${patient.POGID}) does not exist in BioApps`;
          res.status(500).json({message});
          console.log('Failed to update BioApps', e);
        });
    });
    this.registerEndpoint('get', '/backfillComparators', (req, res) => {
      let anlys;
      db.models.pog_analysis.scope('public').findAll({where: {analysis_biopsy: {$not: null}}})
        .then((analyses) => {
          anlys = analyses;
          console.log(`Found ${analyses.length} entries`);
          // create promise array with request for data
          return Promise.all(_.map(analyses, (a) => {
            return $bioapps.patient(a.pog.POGID);
          }));
        })
        .then((bioAppsResults) => {
          const updates = [];
          let source;
          _.forEach(bioAppsResults, (p) => {
            if (p.length === 0) return;
            p = p[0]; // Remove array wrapper
            let source_analysis_setting = null;
            const update = {
              data: {
                comparator_disease: {},
                comparator_normal: {},
              },
              where: {},
            };
            if (p.sources.length < 1) {
              console.log('No sources for', p.id);
              return;
            }
            const pogid = p.sources[0].participant_study_identifier;
            let analysis;
            _.forEach(anlys, (a) => {
              if (a.pog.POGID === pogid) analysis = a;
            });
            if (!analysis) {
              console.log('Failed to find an analysis & biosy for', p.id);
              return;
            }
            // Pick the sources we're looking for.
            _.forEach(p.sources, (s) => {
              const search = _.find(s.libraries, {name: analysis.libraries.tumour});
              if (search) source = s;
            });
            // Check if source was found. If not, move to next entry.
            if (!source) {
              logger.error(`Unable to find source for ${p.id}`);
              return;
            }
            if (source.source_analysis_settings.length === 0) return;
            try {
              source.source_analysis_settings = _.sortBy(source.source_analysis_settings, 'data_version');
              source_analysis_setting = _.last(source.source_analysis_settings);

              // With a source Found, time to build the update for this case;
              update.data.analysis_biopsy = 'biop'.concat(source_analysis_setting.biopsy_number);
              update.data.bioapps_source_id = source.id;
              update.data.biopsy_site = source.anatomic_site;
    
              // Three Letter Code
              update.data.threeLetterCode = source_analysis_setting.cancer_group.code;
            }
            catch (e) {
              reject({message: `BioApps source analysis settings missing required details: ${e.message}`});
            }

            const parsedSettings = $bioapps.parseSourceSettings(source);
            
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
          
          return Promise.all(_.map(updates, (u) => {
            return db.models.pog_analysis.update(u.data, {where: {ident: u.analysis.ident}});
          }));
        })
        .then((result) => {
          res.json(result);
        })
        .catch((err) => {
          res.status(500).json({message: `Failed to backfill biopsy data: ${err.message}`});
          console.log(err);
        });
    });
  }
  
  // Extended Details
  extended() {
    this.registerEndpoint('get', `/extended/:analysisIdent(${this.UUIDregex})`, (req, res) => {
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
  
      const pog_include = {as: 'pog', model: db.models.POG.scope('public'), where: {}};
  
      opts.include.push(pog_include);
      
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
      res.json({v8: comparators, v9: comparators_v9});
    });
  }
};
