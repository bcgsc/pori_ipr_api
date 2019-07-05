const util = require('util');
const pyconf = util.promisify(require('pyconf').parse);
const _ = require('lodash');
const express = require('express');
const moment = require('moment');
const fs = require('fs');
const d3 = require('d3-dsv');
const nconf = require('nconf').file(`./config/${process.env.NODE_ENV}.json`);

const db = require('../models');
const ReportLib = require('../libs/structures/analysis_report');
const Patient = require('../libs/patient/patient.library');
const Analysis = require('../libs/patient/analysis.library');

const GenomicLoader = require('../loaders');
const ProbeLoader = require('../loaders/probing');
const logger = require('../../lib/log');

const router = express.Router({mergeParams: true});

// Loader config
const loaderConf = nconf.get('loader');

// Static loader settings
const allowProbeStates = ['uploaded', 'nonproduction'];
const allowGenomicStates = ['ready', 'archived', 'nonproduction'];

const getLibraries = async (conf) => {
  // Get Libraries from config
  const libraries = [];

  const firstLibraryKey = conf.__keys.libraries;
  // Check if following two rows are libraries
  const secondLibraryKey = firstLibraryKey + 1;
  const thirdLibraryKey = firstLibraryKey + 2;

  if (conf.__lines[firstLibraryKey].match(/[A-Z]{1}[0-9]{5,}/g)) {
    libraries.push(conf.__lines[firstLibraryKey].match(/[A-Z]{1}[0-9]{5,}/g)[0]);
  }
  if (conf.__lines[secondLibraryKey].match(/[A-Z]{1}[0-9]{5,}/g)) {
    libraries.push(conf.__lines[secondLibraryKey].match(/[A-Z]{1}[0-9]{5,}/g)[0]);
  }
  if (conf.__lines[thirdLibraryKey].match(/[A-Z]{1}[0-9]{5,}/g)) {
    libraries.push(conf.__lines[thirdLibraryKey].match(/[A-Z]{1}[0-9]{5,}/g)[0]);
  }

  return libraries;
};

/**
 * Get Report Config File
 *
 * @param {string} directory - Path to directory containing report configuration file
 *
 * @returns {Promise.<object>} - Returns parsed patient config file
 */
const getConfig = async (directory) => {
  // From the base directory read in the Report_Tracking.cfg file
  const output = fs.readFileSync(`${directory}/Report_tracking.cfg`, {encoding: 'utf-8'});

  // Parse config file with pyconf
  this.config = await pyconf(output);

  return this.config;
};

/**
 * Retrieve patient flatile
 *
 * @param {string} path - Directory to flatfile
 *
 * @returns {object} - Returns parsed TSV file
 */
const getFlatFile = (path) => {
  // Read in TSV file
  const output = fs.readFileSync(path, {encoding: 'utf-8'});

  // Parse TSV file
  const parsedFlatFile = d3.tsvParse(output);

  return parsedFlatFile;
};

/**
 * Load Genomic Report Endpoint
 *
 */
router.route('/:type(genomic|probe)')
  .post(async (req, res) => {
    // Check for required fields
    if (!req.body.project) {
      logger.error('Project name is required in POST body');
      return res.status(400).json({message: 'Project name is required in POST body.'});
    }
    if (!req.body.directory && !req.body.baseDir) {
      logger.error('Report root folder is required in POST body');
      return res.status(400).json({message: 'Report root folder is required in POST body.'});
    }

    // Setup Patient Detection
    const patient = req.params.POGID;
    let patientObj;
    const reportType = req.params.type;
    let analysisObj;

    const {project} = req.body;
    const directory = req.body.directory || req.body.baseDir;
    const loaderConfig = req.body.loader_config || `${project}_${reportType}`; // Build standard form loader config

    logger.info(`Load report request: ${reportType} report for ${project}, patient ${patient} from ${directory} using ${loaderConfig} loader config`);

    let conf;
    try {
      // Read in Config File
      conf = await getConfig(directory);
    } catch (error) {
      logger.error(`Unable to get config ${error}`);
      return res.status(500).json({error: {message: 'Unable to get config'}});
    }

    // Save Config
    const reportConfig = conf;

    let libraries;
    try {
      // Get libraries from config
      libraries = await getLibraries(conf);
    } catch (error) {
      logger.error(`Unable to get libraries ${error}`);
      return res.status(500).json({error: {message: 'Unable to get libraries'}});
    }

    const opts = {
      where: {
        $and: {
          'libraries.normal': {$in: libraries}, 'libraries.tumour': {$in: libraries}, 'libraries.transcriptome': {$in: libraries},
        },
        '$pog.POGID$': patient,
      },
      include: [{model: db.models.POG, as: 'pog'}],
    };

    let pogAnalysis;
    try {
      pogAnalysis = await db.models.pog_analysis.findOne(opts);
    } catch (error) {
      logger.error(`SQL Error unable to get POG analysis ${error}`);
      return res.status(500).json({error: {message: 'Unable to get POG analysis'}});
    }

    // If a result is found, set to analysis and pog
    if (pogAnalysis) {
      analysisObj = pogAnalysis;
      patientObj = analysisObj.pog;
    } else {
      const promises = [];

      // Add flatfile retrieval to promises if flatfile is specified
      if (reportConfig.flatfile) {
        promises.push(getFlatFile(reportConfig.flatfile)); // Load flatfile and check libraries for type
      }

      // Setting up analysis for creation
      const createAnalysis = {
        libraries: {},
        analysis_biopsy: null,
        comparator_disease: {},
        comparator_normal: {},
        disease: null,
        biopsy_notes: null,
      };

      let flatFile;
      try {
        // Wait for all promises to be resolved
        flatFile = await Promise.all(promises);
      } catch (error) {
        logger.error(`Error resolving array of flatline files ${error}`);
        return res.status(500).json({error: {message: 'Unable to resolve all flatline files'}});
      }

      if (flatFile) {
        // Parse libraries
        libraries.forEach((library) => {
          const row = _.find(_.flattenDepth(flatFile, 2), {library_name: library});

          if (!row) {
            return;
          }

          // If Normal
          if (row.diseased_status === 'Normal') {
            createAnalysis.libraries.normal = library;
          } else if (row.diseased_status === 'Diseased') {
            // if transcriptome
            if (row.protocol.includes('RNA')) {
              createAnalysis.libraries.transcriptome = library;
            } else {
              // if Tumour
              createAnalysis.libraries.tumour = library;
              createAnalysis.analysis_biopsy = row.sample_prefix;
              createAnalysis.biopsy_site = row.biopsy_site;
              createAnalysis.disease = row.diagnosis;
              createAnalysis.biopsy_date = moment(row.sample_collection_time).toISOString();
              createAnalysis.comparator_disease = {
                tcga: _.filter(row.tcga_comp.split(';'), (r) => { return (r); }),
                gtex_bioposy_site: row.gtex_comp.split(';')[1],
                gtex_primary_site: row.gtex_comp.split(';')[0],
              };
              createAnalysis.comparator_normal = {
                normal_comparator_biopsy_site: row.normal_comp.split(';')[1],
                normal_comparator_primary_site: row.normal_comp.split(';')[0],
              };
            }
          }
        }); // End looping libraries
      }

      try {
        patientObj = await Patient.retrieveOrCreate(patient, project);
      } catch (error) {
        logger.error(`SQL Error unable to retrieve or create patient ${patient} in project ${project} ${error}`);
        return res.status(500).json({error: {message: 'Unable to retrieve or create a patient'}});
      }

      try {
        analysisObj = await Analysis.create(patientObj.id, createAnalysis);
      } catch (error) {
        logger.error(`SQL Error unable to create analysis. Patient id ${patientObj.id} analysis ${createAnalysis} ${error}`);
        return res.status(500).json({error: {message: 'Unable to create analysis'}});
      }
    }

    // Create report
    // Prepare Loaders
    const report = new ReportLib();

    const reportOpts = {};

    // Default starting state for a report based on type
    if (req.params.type === 'genomic') {
      reportOpts.state = 'ready';
      if (req.body.state && allowGenomicStates.includes(req.body.state)) {
        reportOpts.state = req.body.state;
      }
    } else if (req.params.type === 'probe') {
      reportOpts.state = 'uploaded';
      if (req.body.state && allowProbeStates.includes(req.body.state)) {
        reportOpts.state = req.body.state;
      }
    }

    // Get Report Matrix Value
    if (reportConfig.ExpressionMatrixVersion) {
      reportOpts.expression_matrix = reportConfig.ExpressionMatrixVersion.toLowerCase() || 'v8';
    }

    let reportObj;
    try {
      reportObj = await report.create(patientObj, analysisObj, req.user, req.params.type, reportOpts);
      reportObj.pog = patientObj;
    } catch (error) {
      logger.error(`SQL Error unable to create report ${error}`);
      return res.status(500).json({error: {message: 'Unable to create report'}});
    }

    // Setup up loader configuration
    const loaderOptions = {
      profile: `${req.body.project}_${req.params.type}`,
      baseDir: directory,
    };

    // If loader set is specified by request
    if (req.body.loaders) {
      loaderOptions.load = req.body.loaders;
    }

    // -- Possible Loader Scenarios to run -- //
    // -------------------------------------- //
    const Loader = () => {
      // POG Genomic Report
      if (loaderOptions.profile.toLowerCase() === 'pog_genomic') {
        if (!reportConfig.flatfile) {
          loaderOptions.profile = 'pog_genomic_no_flat';
        }

        return new GenomicLoader(patientObj, reportObj, loaderOptions);
      }

      // POG Probe Report
      if (loaderOptions.profile.toLowerCase() === 'pog_probe') {
        if (!reportConfig.flatfile) {
          loaderOptions.profile = 'pog_probe_no_flat';
        }
        return new ProbeLoader(patientObj, reportObj, loaderOptions);
      }

      // Non-POG Probe Report
      if (req.body.project.toLowerCase() !== 'pog' && req.params.type.toLowerCase() === 'probe') {
        if (reportConfig.flatfile) {
          loaderOptions.load = (loaderConf.defaults[req.body.profile] === undefined) ? loaderConf.defaults.default_probe.loaders : loaderConf.defaults[req.body.profile].loaders;
        } else {
          const loaderProfile = `${req.body.profile}_no_flat`;
          loaderOptions.load = (loaderConf.defaults[loaderProfile] === undefined) ? loaderConf.defaults.default_probe_no_flat.loaders : loaderConf.defaults[loaderProfile].loaders;
        }

        loaderOptions.profile = 'nonPOG';
        return new ProbeLoader(patientObj, reportObj, loaderOptions);
      }

      // Non-POG Genomic Report
      if (req.body.project.toLowerCase() !== 'pog' && req.params.type.toLowerCase() === 'genomic') {
        // Non-POG options
        loaderOptions.nonPOG = true;
        if (reportConfig.flatfile) {
          loaderOptions.load = (loaderConf.defaults[req.body.profile] === undefined) ? loaderConf.defaults.default_genomic.loaders : loaderConf.defaults[req.body.profile].loaders;
        } else {
          const loaderProfile = `${req.body.profile}_no_flat`;
          loaderOptions.load = (loaderConf.defaults[loaderProfile] === undefined) ? loaderConf.defaults.default_genomic_no_flat.loaders : loaderConf.defaults[loaderProfile].loaders;
        }

        loaderOptions.baseDir = req.body.baseDir;
        loaderOptions.profile = 'nonPOG';
        loaderOptions.libraries = (loaderConf.defaults[req.body.profile] === undefined) ? {} : loaderConf.defaults[req.body.profile].libraries;
        loaderOptions.moduleOptions = (loaderConf.defaults[req.body.profile] === undefined) ? {} : loaderConf.defaults[req.body.profile].moduleOptions;

        return new GenomicLoader(patientObj, reportObj, loaderOptions);
      }
      return null;
    };

    const loader = Loader();

    if (!loader) {
      // No matching loader scenario found
      logger.error('No loader configuration matched request');
      return res.status(400).json({error: {message: 'Unable to invoke loading mechanism - no loader configuration matched request'}});
    }

    try {
      await loader.load();
    } catch (error) {
      logger.error(`Error unable to load loader ${error}`);
      return res.status(500).json({error: {message: 'Unable to load loader', cause: error}});
    }

    // Retrieve results from loaders, and ask for public report object
    const reportLibrary = new ReportLib(reportObj);
    try {
      // Send public copy of report object
      const publicReport = await reportLibrary.public();
      return res.json(publicReport);
    } catch (error) {
      logger.error(`Error unable to get public interface of report library ${error}`);
      return res.status(500).json({error: {message: 'Unable to get public interface of report library'}});
    }
  });

module.exports = router;
