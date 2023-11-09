const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});

const {Op, literal} = require('sequelize');
const db = require('../../models');
const logger = require('../../log');

const {KB_PIVOT_MAPPING} = require('../../constants');

const KBMATCHEXCLUDE = ['id', 'reportId', 'variantId', 'deletedAt', 'updatedBy'];
const MUTATION_REGEX = '^([^\\s]+)(\\s)(mutation[s]?)?(missense)?$';

const getVariants = async (tableName, variantType, reportId) => {
  return db.models[tableName].scope('extended').findAll({
    order: [['id', 'ASC']],
    attributes: {
      include: [[literal(`'${variantType}'`), 'variantType']],
    },
    where: {
      reportId,
    },
    include: [
      {
        model: db.models.kbMatches,
        attributes: {exclude: KBMATCHEXCLUDE},
      },
    ],
  });
};

const therapeuticAssociationFilter = {
  id: {[Op.ne]: null},
  [Op.or]: [{iprEvidenceLevel: ['IPR-A', 'IPR-B']}],
  category: 'therapeutic',
  matchedCancer: true,
  variantType: {[Op.and]: [
    {[Op.is]: literal('distinct from \'exp\'')},
    {[Op.is]: literal('distinct from \'msi\'')},
    {[Op.is]: literal('distinct from \'tmb\'')},
  ]},
  [Op.or]: [
    {
      relevance: 'resistance',
      iprEvidenceLevel: 'IPR-A',
    },
    {
      relevance: 'sensitivity',
    },
  ],
  // Regex filter for finding columns with 2 or more spaces that end with
  // mutation or mutations
  [Op.not]: {kbVariant: {[Op.regexp]: MUTATION_REGEX}},
};

// PSQL natively ignores null on equal checks.
// Literal is used in order to accomodate NULL rows.
const cancerRelevanceFilter = {
  id: {[Op.ne]: null},
  [Op.not]: {
    [Op.or]: [
      {iprEvidenceLevel: {[Op.is]: literal('not distinct from \'IPR-A\'')}},
      {iprEvidenceLevel: {[Op.is]: literal('not distinct from \'IPR-B\'')}},
    ],
    category: 'therapeutic',
    matchedCancer: true,
  },
  variantType: {[Op.and]: [
    {[Op.is]: literal('distinct from \'exp\'')},
  ]},
  // Regex filter for finding columns with 2 or more spaces that end with
  // mutation or mutations
  [Op.not]: {kbVariant: {[Op.regexp]: MUTATION_REGEX}},
};

const unknownSignificanceIncludes = ['mut'];
const signatureVariant = ['tmb', 'msi'];

const unknownSignificanceGeneFilter = {
  [Op.or]: [{oncogene: true}, {tumourSuppressor: true}],
};

const getRapidReportVariants = async (tableName, variantType, reportId, rapidTable) => {
  const therapeuticAssociationResults = await db.models[tableName].scope('extended').findAll({
    order: [['id', 'ASC']],
    attributes: {
      include: [[literal(`'${variantType}'`), 'variantType']],
    },
    where: {
      reportId,
    },
    include: [
      {
        model: db.models.kbMatches,
        attributes: {exclude: KBMATCHEXCLUDE},
        where: {...therapeuticAssociationFilter},
      },
    ],
  });

  if (rapidTable === 'therapeuticAssociation') {
    return therapeuticAssociationResults;
  }

  const cancerRelevanceResultsFiltered = [];
  const cancerRelevanceResults = await db.models[tableName].scope('extended').findAll({
    order: [['id', 'ASC']],
    attributes: {
      include: [[literal(`'${variantType}'`), 'variantType']],
    },
    where: {
      reportId,
      ...((variantType === 'msi') ? {score: {[Op.gte]: 20}} : {}),
    },
    include: [
      {
        model: db.models.kbMatches,
        where: {...cancerRelevanceFilter},
        attributes: {exclude: KBMATCHEXCLUDE},
      },
    ],
  });

  for (const row of cancerRelevanceResults) {
    if (!(therapeuticAssociationResults.find(
      (e) => {return e.ident === row.ident;},
    ))) {
      cancerRelevanceResultsFiltered.push(row);
    }
  }

  if (rapidTable === 'cancerRelevance') {
    return cancerRelevanceResultsFiltered;
  }

  const unknownSignificanceResultsFiltered = [];
  let unknownSignificanceResults = [];

  if (unknownSignificanceIncludes.includes(variantType)) {
    if (signatureVariant.includes(variantType)) {
      // Variants with signature type are not related to genes
      unknownSignificanceResults = await db.models[tableName].scope('extended').findAll({
        order: [['id', 'ASC']],
        attributes: {
          include: [[literal(`'${variantType}'`), 'variantType']],
        },
        where: {
          reportId,
        },
        include: [
          {
            model: db.models.kbMatches,
            attributes: {exclude: KBMATCHEXCLUDE},
          },
        ],
      });
    } else {
      unknownSignificanceResults = await db.models[tableName].scope('extended').findAll({
        order: [['id', 'ASC']],
        attributes: {
          include: [[literal(`'${variantType}'`), 'variantType']],
        },
        where: {
          reportId,
        },
        include: [
          {
            model: db.models.kbMatches,
            attributes: {exclude: KBMATCHEXCLUDE},
          },
          {
            model: db.models.genes.scope('minimal'),
            as: 'gene',
            where: unknownSignificanceGeneFilter,
          },
        ],
      });
    }
  }

  for (const row of unknownSignificanceResults) {
    if (!(therapeuticAssociationResults.find(
      (e) => {return e.ident === row.ident;},
    )) && !(cancerRelevanceResultsFiltered.find(
      (e) => {return e.ident === row.ident;},
    ))) {
      unknownSignificanceResultsFiltered.push(row);
    }
  }

  return unknownSignificanceResultsFiltered;
};

// Routing for Alteration
router.route('/')
  .get(async (req, res) => {
    // Get all variants for this report
    // Cache was removed from this endpoint due to requiring multiple tables,
    // increasing the chance of retrieving outdated data
    const {query: {rapidTable}} = req;

    try {
      const variantTypes = Object.keys(KB_PIVOT_MAPPING);
      const variantsArray = [];

      for (const variantType of variantTypes) {
        const tableName = KB_PIVOT_MAPPING[variantType];

        if (rapidTable) {
          variantsArray.push(await getRapidReportVariants(tableName, variantType, req.report.id, rapidTable));
        } else {
          variantsArray.push(await getVariants(tableName, variantType, req.report.id));
        }
      }

      const results = variantsArray.flat(1);

      return res.json(results);
    } catch (error) {
      logger.error(`Unable to retrieve variants ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to retrieve variants'},
      });
    }
  });

module.exports = router;
