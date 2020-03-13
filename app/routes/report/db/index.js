const {Op} = require('sequelize');

const db = require('../../../models');
const logger = require('../../../log');
const {GENE_LINKED_VARIANT_MODELS} = require('../../../constants');

/**
 * Creates a new section for the report adding the report and gene foreign keys where required
 *
 * @param {Number} reportId the report Id for the report these sections belongto
 * @param {Object} genesRecordsByName mapping of gene names to their corresponding records
 * @param {string} modelName name of the model for this section
 * @param {Array|Object} sectionContent the record or records to be created for this section
 *
 * @returns {Array.<Object>} the newly created records in this section
 */
const createReportSection = async (reportId, genesRecordsByName, modelName, sectionContent) => {
  const records = Array.isArray(sectionContent)
    ? sectionContent
    : [sectionContent];

  try {
    if (modelName === 'sv') {
      // add the gene FK associations
      await db.models[modelName].bulkCreate(
        records.map(({gene1, gene2, ...newEntry}) => {
          return {
            ...newEntry,
            reportId,
            gene1Id: genesRecordsByName[gene1],
            gene2Id: genesRecordsByName[gene2],
          };
        })
      );
    } else if (GENE_LINKED_VARIANT_MODELS.includes(modelName)) {
      // add the gene FK association
      await db.models[modelName].bulkCreate(
        records.map(({gene, ...newEntry}) => {
          return {
            ...newEntry,
            reportId,
            geneId: genesRecordsByName[gene],
          };
        })
      );
    } else {
      await db.models[modelName].bulkCreate(
        records.map((newEntry) => {
          return {...newEntry, reportId};
        })
      );
    }
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
      if (model === 'sv') {
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
  ]);

  return {
    kbMatches,
    smallMutations,
    copyNumber,
    expRNA,
    expDensityGraph,
  };
};


module.exports = {
  createReportGenes, createReportSection, getGeneRelatedContent,
};
