const {Op} = require('sequelize');
const path = require('path');

const db = require('../models');
const {uploadReportImage} = require('../routes/report/images');
const logger = require('../log');
const {GENE_LINKED_VARIANT_MODELS, KB_PIVOT_MAPPING} = require('../constants');
const {sanitizeHtml} = require('./helperFunctions');

const EXCLUDE_SECTIONS = new Set([
  ...GENE_LINKED_VARIANT_MODELS,
  'createdBy',
  'template',
  'genes',
  'kbMatches',
  'presentationDiscussion',
  'presentationSlides',
  'signatures',
  'projects',
  'ReportUserFilter',
  'users',
]);

/**
 * Creates a new section for the report with the provided data
 *
 * @param {Number} reportId - The id of the report this section belongs to
 * @param {string} modelName - Name of the model for this section
 * @param {Array|Object} sectionContent - The record or records to be created for this section
 * @param {object} options - Options for creating report sections
 * @property {object} options.transaction - Transaction to run bulkCreate under
 *
 * @returns {undefined}
 */
const createReportSection = async (reportId, modelName, sectionContent, options = {}) => {
  const records = Array.isArray(sectionContent)
    ? sectionContent
    : [sectionContent];

  try {
    await db.models[modelName].bulkCreate(records.map((newEntry) => {
      return {...newEntry, reportId};
    }), options);
  } catch (error) {
    throw new Error(`Unable to create section (${modelName}): ${error.message || error}`);
  }
};

/**
 * Creates a new section for the report with the provided data
 *
 * @param {Number} reportId - The id of the report this section belongs to
 * @param {string} modelName - Name of the model for this section
 * @param {Array|Object} sectionContent - The record or records to be created for this section
 * @param {object} options - Options for creating report sections
 * @property {object} options.transaction - Transaction to run bulkCreate under
 *
 * @returns {undefined}
 */
const createReportKbMatchSection = async (reportId, modelName, sectionContent, options = {}) => {
  const records = Array.isArray(sectionContent)
    ? sectionContent
    : [sectionContent];

  try {
    for (const record of records) {
      const kbMatchData = {
        variantType: record.variantType,
        variantId: record.variantId,
        variantUploadKey: record.variant,
        kbVariant: record.kbVariant,
        kbVariantId: record.kbVariantId,
      };

      const statementCopy = {...record};
      delete statementCopy.variantType;
      delete statementCopy.variantId;
      delete statementCopy.kbVariant;
      delete statementCopy.kbVariantId;
      delete statementCopy.variant;
      const statementData = [{...statementCopy}];

      const kbMatch = await db.models.kbMatches.create({
        reportId,
        ...kbMatchData,
      }, options);

      for (const createStatement of statementData) {
        if (Object.keys(createStatement).length) {
          const [statement] = await db.models.kbMatchedStatements.findOrCreate({
            where: {
              reportId,
              ...createStatement,
            },
            ...options,
          });

          await db.models.kbMatchJoin.create({reportId, kbMatchId: kbMatch.id, kbMatchedStatementId: statement.id}, options);
        }
      }
    }
  } catch (error) {
    throw new Error(`Unable to create section (${modelName}): ${error.message || error}`);
  }
};

/**
 * Given the content for a report to be created, pull gene names from
 * the variant sections and create the genes which will be used as
 * foreign keys in these records
 *
 * @param {object} report - The report to create the genes for
 * @param {object} content - The data for the report upload
 * @param {object} options - The options for the create
 * @property {object} options.transaction - The transaction to run the create under
 *
 * @returns {object} - Mapping of gene names to the id of gene record created
 */
const createReportGenes = async (report, content, options = {}) => {
  // create the genes first since they will need to be linked to the variant records
  const geneDefns = {};
  for (const model of GENE_LINKED_VARIANT_MODELS) {
    for (const variant of content[model] || []) {
      if (model === 'structuralVariants') {
        if (variant.gene1) {
          geneDefns[variant.gene1] = {name: variant.gene1};
        }
        if (variant.gene2) {
          geneDefns[variant.gene2] = {name: variant.gene2};
        }
      } else {
        geneDefns[variant.gene] = {name: variant.gene};
      }
    }
  }

  for (const gene of content.genes || []) {
    geneDefns[gene.name] = gene;
  }

  logger.debug(`creating gene definitions for the report ${report.ident}`);

  try {
    const genes = await db.models.genes.bulkCreate(Object.values(geneDefns).map((newEntry) => {
      return {...newEntry, reportId: report.id};
    }), options);

    for (const gene of genes) {
      geneDefns[gene.name] = gene.id;
    }

    return geneDefns;
  } catch (error) {
    throw new Error(`Unable to create report genes ${error.message || error}`);
  }
};

/**
 * Create variant sections of a report
 *
 * @param {integer} reportId - The id of the report these variants belong to
 * @param {object} genesRecordsByName - An object mapping gene names to their data
 * @param {string} modelName - The model name of the variant section
 * @param {Array<object>} sectionContent - An array of variant objects to create
 * @param {object} options - The options for creating the variants
 * @property {object} options.transaction - A transaction to run the creates under
 * @returns {object} - Returns an object mapping the variant key to the id of the created section
 */
const createReportVariantsSection = async (reportId, genesRecordsByName, modelName, sectionContent, options = {}) => {
  const keyCheck = new Set();
  let records;
  // check the 'key' is unique
  for (const {key} of sectionContent) {
    if (key) {
      if (keyCheck.has(key)) {
        throw new Error(`Bad input. The variant key violated unique constraint (key=${key})`);
      }
      keyCheck.add(key);
    }
  }

  try {
    if (modelName === 'structuralVariants') {
      // add the gene FK associations
      records = await db.models[modelName].bulkCreate(sectionContent.map(({
        key, gene1, gene2, ...newEntry
      }) => {
        return {
          ...newEntry,
          reportId,
          gene1Id: genesRecordsByName[gene1],
          gene2Id: genesRecordsByName[gene2],
        };
      }), options);
    } else {
      // add the gene FK association
      records = await db.models[modelName].bulkCreate(sectionContent.map(({key, gene, ...newEntry}) => {
        return {
          ...newEntry,
          reportId,
          geneId: genesRecordsByName[gene],
        };
      }), options);
    }
  } catch (error) {
    throw new Error(`Unable to create variant section (${modelName}) ${error.message || error}`);
  }

  const mapping = {};
  for (let i = 0; i < sectionContent.length; i++) {
    if (sectionContent[i].key) {
      mapping[sectionContent[i].key] = records[i].id;
    }
  }
  return mapping;
};

const createReportVariantSections = async (report, content, transaction) => {
  // create the genes first since they will need to be linked to the variant records
  const geneDefns = await createReportGenes(report, content, {transaction});

  // create the variants and create a mapping from their input 'key' value to the new records
  const variantMapping = {};
  const variantPromises = Object.keys(KB_PIVOT_MAPPING).map(async (variantType) => {
    const variantModel = KB_PIVOT_MAPPING[variantType];

    // Add check for kbMatches with non-array variant types
    if (!Array.isArray(content[variantModel]) && typeof content[variantModel] === 'object') {
      content[variantModel] = [content[variantModel]];
    }

    const mapping = await createReportVariantsSection(report.id, geneDefns, variantModel, content[variantModel] || [], {transaction});
    variantMapping[variantType] = mapping;
  });

  // create the probe results (linked to gene but not to kbMatches)
  variantPromises.push(createReportVariantsSection(report.id, geneDefns, 'probeResults', content.probeResults || [], {transaction}));

  await Promise.all(variantPromises);

  // then the kb matches which must be linked to the variants
  const kbMatches = (content.kbMatches || []).map(({variant, variantType, ...match}) => {
    if (variantMapping[variantType] === undefined) {
      throw new Error(`cannot link kb-matches to variant type ${variantType} as none were specified`);
    }
    if (variantMapping[variantType][variant] === undefined) {
      throw new Error(`invalid link (variant=${variant}) variant definition does not exist`);
    }
    return {...match, variantId: variantMapping[variantType][variant], variantType, variant};
  });

  await createReportKbMatchSection(report.id, 'kbMatches', kbMatches, {transaction});
};

/**
 * Creates all the sections of a report
 *
 * @param {object} report - The report to create all sections for
 * @param {object} content - The data for all the reports sections
 * @param {object} transaction - The transaction to run all the creates under
 * @returns {undefined}
 */
const createReportSections = async (report, content, transaction) => {
  // add images
  const promises = (content.images || []).map(async ({path: imagePath, key, caption, title, category}) => {
    return uploadReportImage(report.id, key, imagePath, {
      filename: path.basename(imagePath), caption, title, transaction, category,
    });
  });

  // add variant sections
  promises.push(createReportVariantSections(report, content, transaction));

  // add all other sections
  Object.keys(db.models.report.associations).filter((model) => {
    return !EXCLUDE_SECTIONS.has(model);
  }).forEach((model) => {
    logger.debug(`creating report (${model}) section (${report.ident})`);
    if (content[model]) {
      // sanitize html comment if it's not null
      if (model === 'analystComments' && content[model].comments) {
        content[model].comments = sanitizeHtml(content[model].comments);
      }

      // Add ranks to therapeutic targets
      if (model === 'therapeuticTargets') {
        content[model].forEach((target, i) => {
          target.rank = i;
        });
      }
      promises.push(createReportSection(report.id, model, content[model], {transaction}));
    }
  });

  return Promise.all(promises);
};

/**
 * Creates all the sections of a report
 *
 * @param {object} report - The report to create all sections for
 * @param {object} content - The data for all the reports sections
 * @param {object} transaction - The transaction to run all the creates under
 * @returns {undefined}
 */
const createStatementMatching = async (report, content, transaction) => {
  for (const statementMatch of content.kbStatementMatchedConditions) {
    const statement = await db.models.kbMatchedStatements.findOne({
      where: {
        kbStatementId: statementMatch.kbStatementId,
        reportId: report.id,
      },
      transaction,
    });

    for (const kbMatchedCondition of statementMatch.matchedConditions) {
      const match = await db.models.kbMatches.findOne({
        where: {
          variantUploadKey: kbMatchedCondition.observedVariantKey,
          kbVariantId: kbMatchedCondition.kbVariantId,
          reportId: report.id,
        },
        transaction,
      });

      await db.models.kbMatchJoin.create({
        reportId: report.id,
        kbMatchId: match.id,
        kbMatchedStatementId: statement.id,
      }, {transaction});
    }
  }
};

/**
 * Creates a genomic report and all report sections
 *
 * @param {object} data - An object containing all report and report section data
 * @returns {string} - Returns the ident of the created report
 */
const createReport = async (data) => {
  let template;

  try {
    template = await db.models.template.findOne({
      where: {
        name: {
          [Op.iLike]: data.template,
        },
      },
    });
  } catch (error) {
    throw new Error(`Error while trying to find template ${data.template} with error ${error.message || error}`);
  }

  if (!template) {
    throw new Error(`Template ${data.template} doesn't currently exist`);
  }

  const allProjects = [];
  if (!data.additionalProjects) {
    data.additionalProjects = [];
  }

  allProjects.push(
    {
      project: await db.models.project.findOne({
        where: {
          name: {
            [Op.iLike]: data.project.trim(),
          },
        },
      }),
      additionalProject: false,
    },
  );

  for (const projectName of data.additionalProjects) {
    allProjects.push(
      {
        project: await db.models.project.findOne({
          where: {
            name: {
              [Op.iLike]: projectName.trim(),
            },
          },
        }),
        additionalProject: true,
      },
    );
  }

  if (allProjects.filter(
    (e) => {
      return e.project === null;
    },
  ).length > 0) {
    throw new Error('Error while trying to find one or more projects, name not found');
  }
  // Set template id
  data.templateId = template.id;

  // Create transaction for creates
  const transaction = await db.transaction();

  // create report
  let report;
  try {
    report = await db.models.report.create(data, {transaction});
  } catch (error) {
    await transaction.rollback();
    throw new Error(`Unable to create report ${error.message || error}`);
  }

  // Bind the creating user to the report as a bioinformatician
  if (report.createdBy_id) {
    let bindUser;
    try {
      bindUser = await db.models.user.findOne({where: {id: report.createdBy_id}});
      await db.models.reportUser.create({
        user_id: bindUser.id,
        reportId: report.id,
        role: 'bioinformatician',
        addedBy_id: bindUser.id,
      }, {transaction});
    } catch (error) {
      await transaction.rollback();
      logger.error(`Error binding creating user ${bindUser}`);
      throw new Error(`Unable to bind creating user to report ${error.message || error}`);
    }
  }
  report.projects = [];

  // find or create report-project association
  for (const projectEntry of allProjects) {
    try {
      const reportProjectData = {
        reportId: report.id,
        project_id: projectEntry.project.id,
        additionalProject: projectEntry.additionalProject,
      };

      const project = await db.models.reportProject.findOrCreate({where: reportProjectData, defaults: reportProjectData, transaction});
      report.projects.push(project[0]);
    } catch (error) {
      await transaction.rollback();
      throw new Error(`Unable to find or create report-project association ${error.message || error}`);
    }
  }
  // Create report sections
  try {
    await createReportSections(report, data, transaction);
    await createStatementMatching(report, data, transaction);
    await transaction.commit();
    return report;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = createReport;
