const {Op} = require('sequelize');

const db = require('../../../models');
const {loadImage} = require('./../images');
const logger = require('../../../log');
const {GENE_LINKED_VARIANT_MODELS, KB_PIVOT_MAPPING} = require('../../../constants');

/**
 * Creates a new section for the report adding the report and gene foreign keys where required
 *
 * @param {Number} reportId the report Id for the report these sections belongto
 * @param {string} modelName name of the model for this section
 * @param {Array|Object} sectionContent the record or records to be created for this section
 *
 * @returns {Array.<Object>} the newly created records in this section
 */
const createReportSection = async (reportId, modelName, sectionContent) => {
  const records = Array.isArray(sectionContent)
    ? sectionContent
    : [sectionContent];

  try {
    await db.models[modelName].bulkCreate(
      records.map((newEntry) => {
        return {...newEntry, reportId};
      })
    );
  } catch (err) {
    logger.error(`Error creating section (${modelName}): ${err}`);
    throw err;
  }
};

/**
 * Given the content for a report to be created, pull gene names from
 * the variant sections and create the genes which will be used as
 * foreign keys in these records
 *
 * @param {Object} report the current report record
 * @param {Object} content the report upload content
 *
 * @returns {Object} mapping of gene names to the gene records for this report
 */
const createReportGenes = async (report, content) => {
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
  const genes = await db.models.genes.bulkCreate(Object.values(geneDefns).map((newEntry) => {
    return {...newEntry, reportId: report.id};
  }));
  for (const gene of genes) {
    geneDefns[gene.name] = gene.id;
  }
  return geneDefns;
};


const getGeneRelatedContent = async ({reportId, name, id}) => {
  const [
    kbMatches,
    smallMutations,
    copyNumber,
    expRNA,
    expDensityGraph,
    structuralVariants,
  ] = await Promise.all([
    db.models.kbMatches.scope('public').findAll({
      where: {
        reportId,
        gene: {[Op.iLike]: `%${name}%`},
      },
    }),
    db.models.smallMutations.scope('public').findAll({
      where: {
        geneId: id,
      },
    }),
    db.models.cnv.scope('public').findAll({
      where: {
        geneId: id,
      },
    }),
    db.models.outlier.scope('public').findAll({
      where: {
        geneId: id,
      },
    }),
    db.models.imageData.scope('public').findAll({
      where: {
        key: {[Op.iLike]: `%expDensity.${name}%`},
        reportId,
      },
    }),
    db.models.structuralVariants.scope('public').findAll({
      where: {
        [Op.or]: [{gene1Id: id}, {gene2Id: id}],
      },
    }),
  ]);

  return {
    kbMatches,
    smallMutations,
    copyNumber,
    expRNA,
    expDensityGraph,
    structuralVariants,
  };
};


const createReportVariantsSection = async (reportId, genesRecordsByName, modelName, sectionContent) => {
  const keyCheck = new Set();
  let records;
  // check the 'key' is unique
  for (const {key} of sectionContent) {
    if (key) {
      if (keyCheck.has(key)) {
        throw new Error(`bad input. variant key violated unique constraint (key=${key})`);
      }
      keyCheck.add(key);
    }
  }
  if (modelName === 'structuralVariants') {
    // add the gene FK associations
    records = await db.models[modelName].bulkCreate(
      sectionContent.map(({
        key, gene1, gene2, ...newEntry
      }) => {
        return {
          ...newEntry,
          reportId,
          gene1Id: genesRecordsByName[gene1],
          gene2Id: genesRecordsByName[gene2],
        };
      })
    );
  } else {
    // add the gene FK association
    records = await db.models[modelName].bulkCreate(
      sectionContent.map(({key, gene, ...newEntry}) => {
        return {
          ...newEntry,
          reportId,
          geneId: genesRecordsByName[gene],
        };
      })
    );
  }
  const mapping = {};

  for (let i = 0; i < sectionContent.length; i++) {
    if (sectionContent[i].key) {
      mapping[sectionContent[i].key] = records[i].id;
    }
  }
  return mapping;
};

/**
 * Creates the report genes, variants, and kb-matches which must all be interlinked
 */
const createReportContent = async (report, content) => {
  // create the genes first since they will need to be linked to the variant records
  const geneDefns = await createReportGenes(report, content);

  // create the variants and create a mapping from their input 'key' value to the new records
  const variantMapping = {};
  const variantPromises = Object.keys(KB_PIVOT_MAPPING).map(async (variantType) => {
    const variantModel = KB_PIVOT_MAPPING[variantType];
    const mapping = await createReportVariantsSection(
      report.id, geneDefns, variantModel, content[variantModel] || []
    );
    variantMapping[variantType] = mapping;
  });

  // create the probe results (linked to gene but not to kbMatches)
  variantPromises.push(createReportVariantsSection(
    report.id, geneDefns, 'probeResults', content.probeResults || []
  ));

  await Promise.all(variantPromises);
  // then the kb matches which must be linked to the variants
  const kbMatches = (content.kbMatches || []).map(({variant, variantType, ...match}) => {
    if (variantMapping[variantType] === undefined) {
      throw new Error(`cannot link kb-matches to variant type ${variantType} as none were specified`);
    }
    if (variantMapping[variantType][variant] === undefined) {
      throw new Error(`invalid link (variant=${variant}) variant definition does not exist`);
    }
    return {...match, variantId: variantMapping[variantType][variant], variantType};
  });

  await createReportSection(report.id, 'kbMatches', kbMatches);

  // finally all other sections can be built
  const excludeSections = new Set([
    ...GENE_LINKED_VARIANT_MODELS,
    'analystComments',
    'createdBy',
    'genes',
    'kbMatches',
    'presentation_discussion',
    'presentation_slides',
    'probe_signature',
    'projects',
    'ReportUserFilter',
    'users',
  ]);

  // add images to db
  const promises = (content.images || []).map(async ({path, key}) => {
    return loadImage(report.id, key, path);
  });

  // add the other sections
  Object.keys(db.models.analysis_report.associations).filter((model) => {
    return !excludeSections.has(model);
  }).forEach((model) => {
    logger.debug(`creating report (${model}) section (${report.ident})`);
    if (content[model]) {
      promises.push(createReportSection(report.id, model, content[model]));
    }
  });
  await Promise.all(promises);
};


module.exports = {
  createReportContent, getGeneRelatedContent,
};
