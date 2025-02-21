const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});

const {Op, literal} = require('sequelize');
const db = require('../../models');
const logger = require('../../log');

const {KB_PIVOT_MAPPING} = require('../../constants');

const KBMATCHEXCLUDE = ['id', 'reportId', 'variantId', 'deletedAt', 'updatedBy'];
const STATEMENTEXCLUDE = ['id', 'reportId', 'deletedAt', 'updatedBy'];
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

const therapeuticAssociationFilterStatement = {
  id: {[Op.ne]: null},
  [Op.or]: [{iprEvidenceLevel: ['IPR-A', 'IPR-B']}],
  category: 'therapeutic',
  matchedCancer: true,
  [Op.and]: {
    [Op.or]: [
      {
        relevance: 'resistance',
        iprEvidenceLevel: 'IPR-A',
      },
      {
        relevance: 'sensitivity',
      },
    ],
  },
};

const unknownSignificanceIncludes = ['mut'];
const signatureVariant = ['tmb', 'msi', 'sigv'];

const unknownSignificanceGeneFilter = {
  [Op.or]: [{oncogene: true}, {tumourSuppressor: true}, {cancerGeneListMatch: true}],
};

const getRapidReportVariants = async (tableName, variantType, reportId, rapidTable) => {
  let allKbMatches = await db.models[tableName].scope('extended').findAll({
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
        include: [
          {
            model: db.models.kbMatchedStatements,
            as: 'kbMatchedStatements',
            attributes: {
              exclude: STATEMENTEXCLUDE,
            },
            through: {attributes: []},
          },
        ],
      },
    ],
  });

  let therapeuticAssociationResults = [];

  // bring rapidReportSummaryTags up from statements into variants, choose highest
  allKbMatches = allKbMatches.map((variant) => {
    const rapidReportSummaryTags = [];
    variant?.kbMatches.forEach((kbmatch) => {
      kbmatch.kbMatchedStatements.forEach((stmt) => {
        if (stmt?.kbData?.rapidReportSummaryTag) {
          rapidReportSummaryTags.push(stmt.kbData.rapidReportSummaryTag);
        }
      });
    });
    if (rapidReportSummaryTags.includes('therapeutic')) {
      variant.rapidReportSummaryTag = 'therapeutic';
    } else if (rapidReportSummaryTags.includes('cancerRelevance')) {
      variant.rapidReportSummaryTag = 'cancerRelevance';
    } else if (rapidReportSummaryTags.includes('unknown')) {
      variant.rapidReportSummaryTag = 'unknown';
    }
    return variant;
  });

  // extract tagged matches
  const taggedTherapeuticAssociationResults = allKbMatches.filter((item) => {
    return item?.rapidReportSummaryTag === 'therapeutic';
  });
  const taggedCancerRelevanceResults = allKbMatches.filter((item) => {
    return item?.rapidReportSummaryTag === 'cancerRelevance';
  });
  const taggedUnknownResults = allKbMatches.filter((item) => {
    return item?.rapidReportSummaryTag === 'unknown';
  });

  // remove tagged items from allKbMatches since they are already sorted
  allKbMatches = allKbMatches.filter((variant) => {
    return (!('rapidReportSummaryTag' in variant));
  });

  if (!(variantType === 'exp')) { // omit expression variants from this table
    therapeuticAssociationResults = JSON.parse(JSON.stringify(allKbMatches));

    // remove nonmatching kbmatches
    therapeuticAssociationResults = therapeuticAssociationResults.map((variant) => {
      variant.kbMatches = variant.kbMatches.filter((item) => {
        const variantRegexMatch = item.kbVariant.match(MUTATION_REGEX);
        return !(variantRegexMatch);
      });
      return variant;
    });

    // remove nonmatching statements
    therapeuticAssociationResults = therapeuticAssociationResults.map((variant) => {
      variant.kbMatches = variant.kbMatches.map((kbmatch) => {
        const statements = kbmatch.kbMatchedStatements.filter((stmt) => {
          if ((stmt.category === 'therapeutic')
          && stmt.matchedCancer
          && ['IPR-A', 'IPR-B'].includes(stmt.iprEvidenceLevel)
          && (stmt.relevance === 'sensitivity' || (stmt.relevance === 'resistance' && stmt.iprEvidenceLevel === 'IPR-A'))) {
            return true;
          }
          return false;
        });
        kbmatch.kbMatchedStatements = statements;
        return kbmatch;
      });
      return variant;
    });

    // remove matches which have no matching statements
    therapeuticAssociationResults = therapeuticAssociationResults.map((variant) => {
      variant.kbMatches = variant.kbMatches.filter((kbmatch) => {
        kbmatch.kbMatchedStatements = kbmatch.kbMatchedStatements.filter((item) => {return item !== null;});
        return kbmatch.kbMatchedStatements.length > 0;
      });
      return variant;
    });

    // remove variants which have no matches
    therapeuticAssociationResults = therapeuticAssociationResults.filter((variant) => {
      const kbmatches = variant.kbMatches.filter((item) => {return item !== null;});
      return kbmatches.length > 0;
    });
  }

  therapeuticAssociationResults.push(...taggedTherapeuticAssociationResults);

  if (rapidTable === 'therapeuticAssociation') {
    return therapeuticAssociationResults;
  }

  let cancerRelevanceResults = [];
  const cancerRelevanceResultsFiltered = [];
  if (!(variantType === 'exp')) { // omit expression variants from this table
    cancerRelevanceResults = JSON.parse(JSON.stringify(allKbMatches));

    // remove nonmatching kbmatches
    cancerRelevanceResults = cancerRelevanceResults.map((variant) => {
      const kbmatches = variant.kbMatches.filter((item) => {
        const msiMatch = (item.variantType === 'msi' && item.score >= 20);
        if (msiMatch) {
          return true;
        }
        const variantRegexMatch = item.kbVariant.match(MUTATION_REGEX);
        return (!(variantRegexMatch));
      });
      variant.kbMatches = kbmatches;
      return variant;
    });

    // remove variants which have now have no matches
    cancerRelevanceResults = cancerRelevanceResults.filter((variant) => {
      const kbmatches = variant.kbMatches.filter((item) => {return item !== null;});
      return kbmatches.length > 0;
    });

    for (const row of cancerRelevanceResults) {
      if (!(therapeuticAssociationResults.find(
        (e) => {return e.ident === row.ident;},
      ))) {
        cancerRelevanceResultsFiltered.push(row);
      }
    }
  }

  cancerRelevanceResultsFiltered.push(...taggedCancerRelevanceResults);

  if (rapidTable === 'cancerRelevance') {
    return cancerRelevanceResultsFiltered;
  }

  const unknownSignificanceResultsFiltered = [];
  let unknownSignificanceResults = [];

  if (unknownSignificanceIncludes.includes(variantType)) {
    if (signatureVariant.includes(variantType)) {
      unknownSignificanceResults = JSON.parse(JSON.stringify(allKbMatches));
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
            include: [
              {
                model: db.models.kbMatchedStatements,
                as: 'kbMatchedStatements',
                attributes: {
                  exclude: STATEMENTEXCLUDE,
                },
                where: {
                  ...therapeuticAssociationFilterStatement,
                },
                through: {attributes: []},
              },
            ],
          },
          {
            model: db.models.genes.scope('minimal'),
            as: 'gene',
            where: unknownSignificanceGeneFilter,
          },
        ],
      });
      // remove tagged items from unknownSignificanceResults since they are already sorted
      unknownSignificanceResults = unknownSignificanceResults.filter((variant) => {
        return (!('rapidReportSummaryTag' in variant));
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

  unknownSignificanceResultsFiltered.push(...taggedUnknownResults);

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
