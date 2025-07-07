const {Op} = require('sequelize');
const path = require('path');

const db = require('../models');
const {uploadReportImage} = require('../routes/report/images');
const logger = require('../log');
const {GENE_LINKED_VARIANT_MODELS, KB_PIVOT_MAPPING, IMAGE_UPLOAD_LIMIT} = require('../constants');
const {sanitizeHtml} = require('./helperFunctions');

const EXCLUDE_SECTIONS = new Set([
  ...GENE_LINKED_VARIANT_MODELS,
  ...Object.values(KB_PIVOT_MAPPING),
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
  'kbMatchedStatements',
  'observedVariantAnnotations',
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

  const retvals = [];
  try {
    for (const record of records) {
      const kbMatchData = {
        variantType: record.variantType,
        variantId: record.variantId,
        kbVariant: record.kbVariant,
        kbVariantId: record.kbVariantId,
      };

      const kbMatch = await db.models.kbMatches.create({
        reportId,
        ...kbMatchData,
      }, options);
      kbMatch.dataValues.variant = record.variant;
      retvals.push(kbMatch.dataValues);
    }
    return retvals;
  } catch (error) {
    throw new Error(`Unable to create section (${modelName}): ${error.message || error}`);
  }
};

/**
 * Creates all the sections of a report
 *
 * @param {object} reportId - The report id to use when creating the records
 * @param {object} content - The data for all the reports sections
 * @param {object} createdKbMatches - The records of createdKbData which can be matched
 * to the conditions
 * @param {object} transaction - The transaction to run all the creates under
 * @returns {undefined}
 */
const createStatementMatching = async (reportId, content, createdKbMatches, transaction) => {
  if (Array.isArray(content.kbStatementMatchedConditions)) {
    for (const conditionSet of content.kbStatementMatchedConditions) {
      const statement = content.kbMatchedStatements.find((obj) => {
        return obj.kbStatementId === conditionSet.kbStatementId;
      });
      const createdStatement = await db.models.kbMatchedStatements.create(
        {
          reportId,
          ...statement,
        },
        {transaction},
      );
      for (const condition of conditionSet.matchedConditions) {
        const kbmatch = createdKbMatches.find((obj) => {
          return (
            condition.observedVariantKey === obj.variant
            && condition.kbVariantId === obj.kbVariantId);
        });
        await db.models.kbMatchJoin.create({
          reportId,
          kbMatchId: kbmatch.id,
          kbMatchedStatementId: createdStatement.dataValues.id,
        }, {transaction});
      }
    }
  }
};

/**
 * Creates a new section for the report with the provided data
 *
 * @param {Number} reportId - The id of the report this section belongs to
 * @param {Array|Object} sectionContent - The record or records to be created for this section
 * @param {object} options - Options for creating report sections
 * @property {object} options.transaction - Transaction to run bulkCreate under
 *
 * @returns {undefined}
 */
const createReportObservedVariantAnnotationSection = async (reportId, sectionContent, options = {}) => {
  const records = Array.isArray(sectionContent)
    ? sectionContent
    : [sectionContent];
  const retvals = [];
  try {
    for (const record of records) {
      const annotationData = {
        variantType: record.variantType,
        variantId: record.variantId,
        annotations: record.annotations,
      };

      const annotation = await db.models.observedVariantAnnotations.create({
        reportId,
        ...annotationData,
      }, options);
      annotation.dataValues.variant = record.variant;
      retvals.push(annotation.dataValues);
    }
    return retvals;
  } catch (error) {
    throw new Error(`Unable to create section observedVariantAnnotation: ${error.message || error}`);
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
 * Converts old-style kbmatch report input content into new-style kbmatch/statement/conditionset format
 *
 * @param {object} content - The data for all the reports sections
 * @returns {object} content - The reformatted data
 */
const updateKbMatchesInputFormat = (content) => {
  if (content.kbMatches) {
    content.kbMatches.forEach((item) => {
      if ('kbStatementId' in item) {
        const statement = {...item};
        delete statement.variantType;
        delete statement.variantId;
        delete statement.kbVariant;
        delete statement.kbVariantId;
        delete statement.variant;

        if (!('kbMatchedStatements' in content)) {
          content.kbMatchedStatements = [];
        }
        content.kbMatchedStatements.push(statement);

        const conditionSet = {
          kbStatementId: item.kbStatementId,
          matchedConditions: [{
            observedVariantKey: item.variant,
            kbVariantId: item.kbVariantId,
          }],
        };
        if (!('kbStatementMatchedConditions' in content)) {
          content.kbStatementMatchedConditions = [];
        }
        content.kbStatementMatchedConditions.push(conditionSet);
      }
    });
  }
  return content;
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

  content = updateKbMatchesInputFormat(content);

  const createdKbMatches = await createReportKbMatchSection(report.id, 'kbMatches', kbMatches, {transaction});

  await createStatementMatching(report.id, content, createdKbMatches, transaction);
  // then the observed variant annotations which must be linked to the variants

  const observedVariantAnnotations = (content.observedVariantAnnotations || []).map(({variant, variantType, ...annotation}) => {
    if (variantMapping[variantType] === undefined) {
      throw new Error(`cannot link annotations to variant type ${variantType} as none were specified`);
    }
    if (variantMapping[variantType][variant] === undefined) {
      throw new Error(`invalid link (variant=${variant}) variant definition does not exist`);
    }
    return {...annotation, variantId: variantMapping[variantType][variant], variantType, variant};
  });

  await createReportObservedVariantAnnotationSection(report.id, observedVariantAnnotations, {transaction});
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
    logger.info(`creating report (${model}) section (${report.ident})`);
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

    const result = await db.query(
      `SELECT
            SUM(pg_column_size("reports_image_data")) AS total_bytes
          FROM
            "reports_image_data"
          WHERE
            "report_id" = :reportId`,
      {
        replacements: {reportId: report.id},
        type: 'select',
        transaction,
      },
    );

    const totalImageSize = result[0].avg_size_bytes;
    if (totalImageSize > IMAGE_UPLOAD_LIMIT) {
      throw new Error(`Total image size exceeds ${IMAGE_UPLOAD_LIMIT / 1000000} megabytes`);
    }

    await transaction.commit();
    return report;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = createReport;
