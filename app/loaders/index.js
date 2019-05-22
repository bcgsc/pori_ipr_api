const util = require('util');
const fs = require('fs');
const glob = require('glob');
const pyParse = util.promisify(require('pyconf').parse);
const nconf = require('nconf').file({file: `./config/${process.env.NODE_ENV}.json`});

const logger = require('../../lib/log');

// Loader requires

// meta
const meta = require('./POG');
const image = require('./image');

// summary
const summaryPatientInformation = require('./summary/patientInformation');
const summaryTumourAnalysis = require('./summary/tumourAnalysis');
const summaryMutationSummary = require('./summary/mutationSummary');
const summaryVariantCounts = require('./summary/variantCounts');
const summaryGenomicAlterationsIdentified = require('./summary/genomicAlterationsIdentified');
const summaryGenomicEventsTherapeutic = require('./summary/genomicEventsTherapeutic');
const summaryProbeTarget = require('./summary/probeTarget');
const summaryMicrobial = require('./summary/microbial');

// detailed genomic analysis
const detailedAlterations = require('./detailedGenomicAnalysis/alterations');
const detailedApprovedThisCancer = require('./detailedGenomicAnalysis/approvedThisCancer');
const detailedApprovedOtherCancer = require('./detailedGenomicAnalysis/approvedOtherCancer');
const detailedTargetedGenes = require('./detailedGenomicAnalysis/targetedGenes');

// somatic mutations
const somaticSmallMutations = require('./somaticMutations/smallMutations');
const somaticMutationSignature = require('./somaticMutations/mutationSignature');

// copy number analysis
const copyNumberCNV = require('./copyNumberAnalysis/cnv');

// structural variation
const structuralSV = require('./structuralVariation/sv');

// expression analysis
const expressionOutlier = require('./expressionAnalysis/outlier');
const expressionProtein = require('./expressionAnalysis/proteinExpression');
const expressionDrugTarget = require('./expressionAnalysis/drugTarget');

// Load config into memory
const config = nconf.get('paths:data');

// Map of Available Loaders
const loaders = [
  // Meta
  {name: 'meta', required: true, location: meta},
  {name: 'image', required: true, location: image},

  // Summary
  {name: 'summary_patientInformation', required: true, location: summaryPatientInformation, loaderType: 'class'},
  {name: 'summary_tumourAnalysis', required: true, location: summaryTumourAnalysis},
  {name: 'summary_mutationSummary', required: true, location: summaryMutationSummary, loaderType: 'class'},
  {name: 'summary_variantCounts', required: false, location: summaryVariantCounts},
  {name: 'summary_genomicAlterationsIdentified', required: true, location: summaryGenomicAlterationsIdentified},
  {name: 'summary_genomicEventsTherapeutic', required: true, location: summaryGenomicEventsTherapeutic},
  {name: 'summary_probeTarget', required: false, location: summaryProbeTarget},
  {name: 'summary_microbial', required: false, location: summaryMicrobial, loaderType: 'class'},

  // Detailed Genomic Analysis
  {name: 'detailed_alterations', required: false, location: detailedAlterations},
  {name: 'detailed_approvedThisCancer', required: false, location: detailedApprovedThisCancer},
  {name: 'detailed_approvedOtherCancer', required: false, location: detailedApprovedOtherCancer},
  {name: 'detailed_targetedGenes', required: false, location: detailedTargetedGenes},

  // Somatic Mutations
  {name: 'somatic_smallMutations', required: false, location: somaticSmallMutations},
  {name: 'somatic_mutationSignature', required: false, location: somaticMutationSignature},

  // Copy Number Analyses
  {name: 'copynumber_cnv', required: false, location: copyNumberCNV},

  // Structural Variation
  {name: 'structural_sv', required: false, location: structuralSV},

  // Expression Analysis
  {name: 'expression_outlier', required: false, location: expressionOutlier},
  {name: 'protein_expression', required: false, location: expressionProtein, loaderType: 'class'},
  {name: 'expression_drugTarget', required: false, location: expressionDrugTarget},
];

class GenomicLoader {
  /**
   * Onboards genomic CSV data into SQL databases
   *
   * @param {object} POG - POG report model obeject
   * @param {object} report - Report model object
   * @param {object} options - Options object
   */
  constructor(POG, report, options) {
    this.POG = POG;
    this.report = report;
    this.options = options;
    this.config = {};
    this.libraries = options.libraries || [];
    this.baseDir = options.baseDir || null;
    this.moduleOptions = options.moduleOptions || {};
  }

  /**
   * Run loaders
   *
   * @returns {Promise.<Array.<string>>} - Returns collection of loader results
   */
  async load() {
    logger.info('Starting Genomic Loader');

    // Run default POG Genomic Report loading
    if (this.options.profile === 'pog_genomic'
    || this.options.profile === 'pog_genomic_no_flat'
    ) {
      if (this.options.profile === 'pog_genomic_no_flat') {
        logger.info('Running POG Genomic Loader without flatfile');

        // Skip tumour analysis and patient info loaders if no flatfile is available
        loaders.forEach((val, index) => {
          if (['summary_tumourAnalysis', 'summary_patientInformation'].includes(val.name)) {
            delete loaders[index];
          }
        });
      } else {
        logger.info('Running POG Genomic Loader');
      }

      if (!this.baseDir) {
        logger.info('Running default POG Genomic loader profile');
        // Run Default Loader Scenario
        const libDir = await this.getLibraryFolder();
        await this.getReportFolder(libDir);
      }

      await this.getConfig();
      return this.runLoaders();
    }

    // Loader NonPOG Report
    if (!this.baseDir) {
      logger.error('Non-POG no base directory specified');
      throw new Error('Non-POG no base directory specified');
    }

    // Run Loaders
    await this.getConfig();
    return this.runLoaders();
  }

  /**
   * Get the report folder for a POG
   *
   * @returns {Promise.<string>} - Returns the directory to the latest libraries available
   */
  async getLibraryFolder() {
    logger.info('Attempting to find library directory');

    // Determine which folder/biopsy to go for (grabs oldest by default)
    const files = glob.sync(`${config.POGdata}/${this.POG.POGID}/P*`);

    if (files.length === 0) {
      throw new Error('Unable to find the report library folder(s)');
    }

    // Explode out and get biggest
    files.forEach((file) => {
      this.libraries.push(file.split('/').pop());
    });

    this.libraries.sort().reverse();
    logger.info(`Detected and using libraries: ${this.libraries[0]}`);

    return `${config.POGdata}/${this.POG.POGID}/${this.libraries[0]}`;
  }

  /**
   * Find the reports folder and select latest
   *
   * @param {string} libraryDirectory - The library directory to search for a report directory in
   *
   * @returns {Promise.<string>} - Returns the base string to the report directory
   */
  async getReportFolder(libraryDirectory) {
    logger.info('Attempting to find report directory');

    // Go globbing for the report directory
    const files = glob.sync(`${libraryDirectory}/jreport_genomic_summary_v*`);

    if (files.length === 0) {
      throw new Error('Unable to find the genomic report directory');
    }

    // Explode out and get biggest
    const versionOptions = files.map((file) => {
      return file.split('/').pop();
    });

    // Sort by largest value (newest version)
    versionOptions.sort();

    this.baseDir = `${config.POGdata}/${this.POG.POGID}/${this.libraries[0]}/${versionOptions.pop()}/report`;
    // Log Base Path for Source
    logger.info(`Source path: ${this.baseDir}`);

    return this.baseDir;
  }


  /**
   * Execute the loaders
   *
   * @param {string} baseDir - The base directory the loaders need to work in (report root)
   *
   * @returns {Promise.<Array.<object>>} - Returns the results of running all the loaders
   */
  async runLoaders() {
    logger.info('Starting loader execution');

    const promises = []; // Collection of module promises

    // Set loaders to run - if none are specified, load them all.
    const toLoad = (this.options.load) ? this.loaderFilter() : loaders;

    // Loop over loader files and create promises
    toLoad.forEach((loader) => {
      const {location, loaderType, name} = loader;
      let loaderPromise = null;

      // Check for Module Options
      const moduleOptions = this.moduleOptions[name] || {};
      moduleOptions.library = this.libraries[0];

      // Include report config file in options
      moduleOptions.config = this.config;

      // Check for new class designed loader
      if (loaderType === 'class') {
        loaderPromise = new location(this.report, this.baseDir, moduleOptions).load();
      } else {
        // Standard function designed loader
        loaderPromise = location(this.report, this.baseDir, moduleOptions);
      }
      promises.push(loaderPromise);
    });

    const result = await Promise.all(promises);
    logger.info('All loaders have completed.');

    return result;
  }


  /**
   * Return a collection of loaders to execute
   *
   * @returns {Array.<object>} - Returns a collection of loaders
   */
  loaderFilter() {
    return loaders.filter((loader) => {
      // If the loader's name appears in the target loaders, include in array
      return this.options.includes(loader.name);
    });
  }

  /**
   * Get POG Report Config File
   * Retrieve and parse the Report Tracking config file
   *
   * @returns {Promise.<object>} - Returns new config object
   */
  async getConfig() {
    // From the base directory read in the Report_Tracking.cfg file
    const data = fs.readFileSync(`${this.baseDir}/Report_tracking.cfg`, 'utf-8');

    // Parse config file with pyconf
    this.config = await pyParse(data);
    logger.info('Loaded & parsed Report config file');
    return this.config;
  }
}

module.exports = GenomicLoader;
