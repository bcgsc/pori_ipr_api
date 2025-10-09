const HTTP_STATUS = require('http-status-codes');
// const { HTTP_STATUS } = require('http-status-codes');

const express = require('express');

const router = express.Router({mergeParams: true});

const {Op, literal} = require('sequelize');
const db = require('../../models');
const logger = require('../../log');

const {KB_PIVOT_MAPPING} = require('../../constants');

const KBMATCHEXCLUDE = ['id', 'reportId', 'variantId', 'deletedAt', 'updatedBy'];
const OBSVARANNOTEXCLUDE = KBMATCHEXCLUDE;
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
      {
        model: db.models.observedVariantAnnotations,
        as: 'observedVariantAnnotation',
        attributes: {exclude: OBSVARANNOTEXCLUDE},
      },
    ],
  });
};

const unknownSignificanceIncludes = ['mut'];
const signatureVariant = ['tmb', 'msi', 'sigv'];

const unknownSignificanceGeneFilter = {
  [Op.or]: [{oncogene: true}, {tumourSuppressor: true}, {cancerGeneListMatch: true}],
};

const getRapidReportVariants = async (tableName, variantType, reportId, rapidTable) => {
  let allKbMatches;
  if (
    unknownSignificanceIncludes.includes(variantType)
    && !signatureVariant.includes(variantType)
  ) {
    allKbMatches = await db.models[tableName].scope('extended').findAll({
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
              // where: {
              //  ...therapeuticAssociationFilterStatement,
              // },
              through: {attributes: ['flags']},
            },
          ],
        },
        {
          model: db.models.observedVariantAnnotations,
          attributes: {exclude: OBSVARANNOTEXCLUDE},
          as: 'observedVariantAnnotation',
        },
        {
          model: db.models.genes.scope('minimal'),
          as: 'gene',
          where: unknownSignificanceGeneFilter, // TODO does including this remove results that would otherwise be in allKbMatches
        },
      ],
    });
  } else {
    allKbMatches = await db.models[tableName].scope('extended').findAll({
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
              through: {attributes: ['flags']},
            },
          ],
        },
        {
          model: db.models.observedVariantAnnotations,
          attributes: {exclude: OBSVARANNOTEXCLUDE},
          as: 'observedVariantAnnotation',
        },
      ],
    });
  }

  // do initial filtering based on contents of annotations - these should override defaults
  const therapeuticResultsFromAnnotation = [];
  const cancerRelevanceResultsFromAnnotation = [];
  const unknownSignificanceFromAnnotation = [];
  const doNotReport = [];

  for (const variant of allKbMatches) {
    if (variant?.observedVariantAnnotation?.annotations?.rapidReportTableTag) {
      const tableTag = variant.observedVariantAnnotation.annotations.rapidReportTableTag;

      const lof = variant.kbMatches.some((kbmatch) => {
        return kbmatch.kbMatchedStatements.some((stmt) => {
          return stmt.relevance.includes('loss of function');
        });
      });
      variant.set('lossOfFunction', lof);

      // prune out statements where context is not therapeutic, if filtering for table 1
      let variantKbMatches = variant.kbMatches.map((kbmatch) => {
        const kbmatchKbMatchedStatements = kbmatch.kbMatchedStatements
          .filter((stmt) => {
            if (rapidTable === 'therapeuticAssociation') {
              if (stmt.category === 'therapeutic') {
                return true;
              }
              return false;
            }
            return true;
          });
        kbmatch.set('kbMatchedStatements', kbmatchKbMatchedStatements);
        return kbmatch;
      });
      // remove kbmatches where there are no remaining kbmatched statements
      variantKbMatches = variantKbMatches.filter((kbmatch) => {
        return kbmatch.kbMatchedStatements.length > 0;
      });
      variant.set('kbMatches', variantKbMatches);

      // don't use this variant if it has no tagged kb statements
      if (variant.kbMatches.length > 0) {
        if (tableTag === 'therapeuticAssociation') {
          therapeuticResultsFromAnnotation.push(variant);
        } else if (tableTag === 'cancerRelevance') {
          cancerRelevanceResultsFromAnnotation.push(variant);
        } else if (tableTag === 'unknownSignificance') {
          unknownSignificanceFromAnnotation.push(variant);
        } else if (tableTag === 'noTable') {
          doNotReport.push(variant);
        }
      }
    }
  }
  // remove the tagged variants from further sorting
  allKbMatches = allKbMatches.filter((variant) => {
    return (!(variant?.observedVariantAnnotation?.annotations?.rapidReportTableTag));
  });

  let therapeuticAssociationResults = [];

  if (!(variantType === 'exp')) { // omit expression variants from this table
    therapeuticAssociationResults = JSON.parse(JSON.stringify(allKbMatches));

    // remove nonmatching kbmatches
    therapeuticAssociationResults = therapeuticAssociationResults.map((variant) => {
      if (!variant.lossOfFunction) {
        variant.kbMatches = variant.kbMatches.filter((item) => {
          const variantRegexMatch = item.kbVariant.match(MUTATION_REGEX);
          return !(variantRegexMatch);
        });
      }
      // pop field with no further use
      delete variant.lossOfFunction;
      return variant;
    });

    // remove nonmatching statements
    therapeuticAssociationResults = therapeuticAssociationResults.map((variant) => {
      variant.kbMatches = variant.kbMatches.map((kbmatch) => {
        const statements = kbmatch.kbMatchedStatements.filter((stmt) => {
          if ((stmt.category === 'therapeutic')
            && stmt.matchedCancer
            && ['IPR-A', 'IPR-B'].includes(stmt.iprEvidenceLevel)
            && (
              stmt.relevance === 'sensitivity'
              || (stmt.relevance === 'resistance' && stmt.iprEvidenceLevel === 'IPR-A')
            )
          ) {
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
        kbmatch.kbMatchedStatements = kbmatch.kbMatchedStatements
          .filter((item) => {return item !== null;});
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

  therapeuticAssociationResults.push(...therapeuticResultsFromAnnotation);

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
        return (!variantRegexMatch);
      });
      variant.kbMatches = kbmatches;
      return variant;
    });

    // remove variants which now have no matches
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

  cancerRelevanceResultsFiltered.push(...cancerRelevanceResultsFromAnnotation);

  if (rapidTable === 'cancerRelevance') {
    return cancerRelevanceResultsFiltered;
  }

  const unknownSignificanceResultsFiltered = [];
  let unknownSignificanceResults = [];

  if (unknownSignificanceIncludes.includes(variantType)) {
    unknownSignificanceResults = JSON.parse(JSON.stringify(allKbMatches));
  }

  // refine unknownSignificance results to only include therapeuticAssoc-qualifying matches
  // (unless they are tagged - add the tagged results back after filtering)
  unknownSignificanceResults = unknownSignificanceResults.map((variant) => {
    variant.kbMatches = variant.kbMatches.map((kbmatch) => {
      const statements = kbmatch.kbMatchedStatements.filter((stmt) => {
        if ((stmt.category === 'therapeutic')
          && stmt.matchedCancer
          && ['IPR-A', 'IPR-B'].includes(stmt.iprEvidenceLevel)
          && (
            stmt.relevance === 'sensitivity'
            || (stmt.relevance === 'resistance' && stmt.iprEvidenceLevel === 'IPR-A')
          )) {
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
  unknownSignificanceResults = unknownSignificanceResults.map((variant) => {
    variant.kbMatches = variant.kbMatches.filter((kbmatch) => {
      kbmatch.kbMatchedStatements = kbmatch.kbMatchedStatements
        .filter((item) => {return item !== null;});
      return kbmatch.kbMatchedStatements.length > 0;
    });
    return variant;
  });

  // remove variants already included in a different section
  for (const row of unknownSignificanceResults) {
    if (!(therapeuticAssociationResults.find(
      (e) => {return e.ident === row.ident;},
    )) && !(cancerRelevanceResultsFiltered.find(
      (e) => {return e.ident === row.ident;},
    ))) {
      unknownSignificanceResultsFiltered.push(row);
    }
  }

  // add variants that are tagged for this table regardless of whatever other
  // reason there may be to exclude them
  unknownSignificanceResultsFiltered.push(...unknownSignificanceFromAnnotation);
  return unknownSignificanceResultsFiltered;
};

const updateKbDataSummaryTableTag = (kbData, rapidTable, variantType, variantIdent) => {
  // Ensure `rapidReportTableTag` is initialized
  kbData = kbData || {};
  kbData.rapidReportTableTag = kbData.rapidReportTableTag || {};

  // Remove `variantIdent` from all entries of rapidReportTableTag
  for (const tableKey of Object.keys(kbData.rapidReportTableTag)) {
    const typeMap = kbData.rapidReportTableTag[tableKey];
    if (Array.isArray(typeMap?.[variantType])) {
      typeMap[variantType] = typeMap[variantType].filter((id) => {return id !== variantIdent;});
    }
  }

  // Add tag to the specified rapid table and variant type
  if (!kbData.rapidReportTableTag[rapidTable]) {
    kbData.rapidReportTableTag[rapidTable] = {[variantType]: [variantIdent]};
  } else {
    const tableEntry = kbData.rapidReportTableTag[rapidTable];
    tableEntry[variantType] = tableEntry[variantType] || [];
    if (!tableEntry[variantType].includes(variantIdent)) {
      tableEntry[variantType].push(variantIdent);
    }
  }
  return kbData;
};

const checkKbDataSummaryTableTag = (kbData, variantType, variantIdent) => {
  let tag;
  const thiskbData = kbData || {};
  const rapidReportTableTags = thiskbData.rapidReportTableTag || {};

  for (const tableKey of Object.keys(rapidReportTableTags)) {
    const typeMap = rapidReportTableTags[tableKey];
    if (Array.isArray(typeMap?.[variantType])) {
      if (typeMap[variantType].includes(variantIdent)) {
        tag = tableKey;
      }
    }
  }
  return tag;
};

// utils/variantUtils.js
async function findVariantOrRespond({req, res, variantTable}) {
  try {
    const variant = await db.models[variantTable].findOne({
      where: {
        ident: req.body.variantIdent,
        reportId: req.report.id,
      },
      include: [
        {
          model: db.models.kbMatches,
          include: [
            {
              model: db.models.kbMatchedStatements,
              as: 'kbMatchedStatements',
            },
          ],
        },
      ],
    });

    if (!variant) {
      const message = 'Variant not found';
      logger.error(message);
      res.status(400).json({error: {message}});
      return null;
    }

    return variant;
  } catch (error) {
    const message = `Error while checking that linked variant exists ${error}`;
    logger.error(message);
    res.status(400).json({error: {message}});
    return null;
  }
}

router.route('/set-summary-table/')
  .post(async (req, res) => {
    // updates variant record and statement records
    let rapidTable;
    try {
      rapidTable = req.body.rapidReportTableTag;
      req.body.rapidTable = rapidTable;
    } catch (error) {
      const message = `Error checking rapid report table tag ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }
    // below is copied from observedVariantAnnotations.js, should probably DRY it

    // validate variant - check type is real and the variant exists
    let variantType;
    let variantTable;
    try {
      variantTable = KB_PIVOT_MAPPING[req.body.variantType];
      variantType = req.body.variantType;
    } catch (error) {
      const message = `Error checking variant type ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    if (typeof req.body.kbStatementIds === 'undefined') {
      const message = 'No statement ids found';
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    let variant;
    try {
      variant = await findVariantOrRespond({req, res, variantTable});
    } catch (error) {
      const message = `Error checking variant ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    if (!variant) {
      const message = 'Variant not found';
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    req.body.variantId = variant.id;

    // check if all statement idents are valid
    const statements = variant.kbMatches.flatMap((kb) => {return kb.kbMatchedStatements;});
    const statementIdSet = new Set(statements.map((stmt) => {return stmt.ident;}));
    const invalidIds = req.body.kbStatementIds.filter((id) => {return !statementIdSet.has(id);});

    if (invalidIds.length > 0) {
      const msg = `Idents invalid for some kb statements: ${invalidIds.join(', ')}`;
      logger.error(msg);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: msg}});
    }

    // check whether there is already an annotation record for this variant
    let annotation;
    try {
      annotation = await db.models.observedVariantAnnotations.findOne({
        where: {
          variantId: req.body.variantId,
          variantType: req.body.variantType,
          reportId: req.report.id,
        },
      });
    } catch (error) {
      const message = `Error while checking for preexisting annotation record ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    if (annotation) {
      // check if the annotation for this tag exists and is the same
      const reportTableTag = annotation.annotations?.rapidReportTableTag;
      let annotationMatch = false;
      if (reportTableTag) {
        if (reportTableTag === req.body.rapidTable) {
          annotationMatch = true;
        }
      }
      // update if not:
      if (!annotationMatch) {
        const newAnnotation = {...(annotation.annotations || {})};
        newAnnotation.rapidReportTableTag = req.body.rapidTable;
        try {
          await db.models.observedVariantAnnotations.update({
            annotations: newAnnotation,
          }, {where: {id: annotation.id}});
        } catch (error) {
          logger.error(`Unable to create update observed variant annotation ${error}`);
          return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            error: {message: 'Unable to create observed variant annotation'},
          });
        }
      }
    } else {
      // otherwise, create the annotation record
      try {
        await db.models.observedVariantAnnotations.create({
          variantId: req.body.variantId,
          variantType: req.body.variantType,
          annotations: {rapidReportTableTag: req.body.rapidTable},
          reportId: req.report.id,
        });
      } catch (error) {
        logger.error(`Unable to create mutation burden ${error}`);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          error: {message: 'Unable to create mutation burden'},
        });
      }
    }

    // now manage the variant's kb statement tags
    const updatedStatements = [];

    for (const match of variant.kbMatches) {
      // (match);
      for (const stmt of match.kbMatchedStatements) {
        const kbData = {...(stmt.kbData || {})};
        const {variantIdent} = req.body;

        if (!req.body.kbStatementIds.includes(stmt.ident)) {
          // if statement is not in the statement list:
          // set it to noTable unless it is already tagged with the current rapidTable or noTable
          const currentTag = checkKbDataSummaryTableTag(kbData, variantType, variantIdent);
          if (currentTag === null || !(['noTable', rapidTable].includes(currentTag))) {
            const newKbData = updateKbDataSummaryTableTag(kbData, 'noTable', variantType, variantIdent);
            updatedStatements.push({
              id: stmt.id, // primary key
              kbData: newKbData,
            });
          }
        } else {
          // if statement is in the list, update (or add) the tag
          const newKbData = updateKbDataSummaryTableTag(kbData, rapidTable, variantType, variantIdent);
          updatedStatements.push({
            id: stmt.id, // primary key
            kbData: newKbData,
          });
        }
      }
    }
    for (const stmt of updatedStatements) {
      await db.models.kbMatchedStatements.update(
        {kbData: stmt.kbData},
        {where: {id: stmt.id}},
      );
    }
    return res.status(204).end();
  });

router.route('/set-statement-summary-table/')
  .post(async (req, res) => {
    // updates statement records

    let rapidTable;
    try {
      rapidTable = req.body.rapidReportTableTag;
      req.body.rapidTable = rapidTable;
    } catch (error) {
      const message = `Error checking rapid report table tag ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    // validate variant - check type is real and make sure the record exists
    let variantType;
    let variantTable;
    try {
      variantTable = KB_PIVOT_MAPPING[req.body.variantType];
      variantType = req.body.variantType;
    } catch (error) {
      const message = `Error checking variant type ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    if (typeof req.body.kbStatementIds === 'undefined') {
      const message = 'No statement ids found';
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    let variant;
    try {
      variant = await findVariantOrRespond({req, res, variantTable});
    } catch (error) {
      const message = `Error checking variant ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    if (!(variant)) {
      const message = 'Variant not found';
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    // check if all statement idents are valid
    const statements = variant.kbMatches.flatMap((kb) => {return kb.kbMatchedStatements;});
    const statementIdSet = new Set(statements.map((stmt) => {return stmt.ident;}));
    const invalidIds = req.body.kbStatementIds.filter((id) => {return !statementIdSet.has(id);});

    if (invalidIds.length > 0) {
      const msg = `Idents invalid for some kb statements: ${invalidIds.join(', ')}`;
      logger.error(msg);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: msg}});
    }

    // all we need to do is edit the rapidReportTableTags field in the statement kbData
    const updatedStatements = [];

    for (const match of variant.kbMatches) {
      // (match);
      for (const stmt of match.kbMatchedStatements) {
        if (!req.body.kbStatementIds.includes(stmt.ident)) {
          continue; // Skip this statement if it's not in the list
        }
        const kbData = {...(stmt.kbData || {})};

        const {variantIdent} = req.body;

        const newKbData = updateKbDataSummaryTableTag(kbData, rapidTable, variantType, variantIdent);

        // Queue for bulk update
        updatedStatements.push({
          id: stmt.id, // primary key
          kbData: newKbData,
        });
      }
    }
    for (const stmt of updatedStatements) {
      await db.models.kbMatchedStatements.update(
        {kbData: stmt.kbData},
        {where: {id: stmt.id}},
      );
    }
    return res.status(204).end();
  });

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
          variantsArray.push(
            await getRapidReportVariants(tableName, variantType, req.report.id, rapidTable),
          );
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

// Attach utils for testing
router._testUtils = {
  checkKbDataSummaryTableTag,
  updateKbDataSummaryTableTag,
};

module.exports = router;
