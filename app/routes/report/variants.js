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
const validateAgainstSchema = require('../../libs/validateAgainstSchema');

const {setRapidSummaryTableSchema} = require('../../schemas/report/setRapidSummaryTable');

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

      // prune out statements where context is not therapeutic, if filtering for table 1
      let variantKbMatches = variant.kbMatches.map((kbmatch) => {
        const kbmatchKbMatchedStatements = kbmatch.kbMatchedStatements
          .filter((stmt) => {
            if (stmt.category === 'therapeutic') {
              if (rapidTable === 'therapeuticAssociation') {
                return true;
              }
              return true;
            }
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

router.route('/set-summary-table/')
  .post(async (req, res) => {
    // updates variant record and statement records

    const rapidTable = req.body.annotations.rapidReportTableTag;
    req.body.rapidTable = rapidTable;
    // below is copied from observedVariantAnnotations.js, should probably DRY it

    // Check that the variant type is real
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

    // Check that the variant is in the db
    let variant;
    try {
      variant = await db.models[variantTable].findOne({
        where: {ident: req.body.variantIdent, reportId: req.report.id},
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
    } catch (error) {
      const message = `Error while checking that linked variant exists ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    if (!(variant)) {
      const message = 'Variant not found';
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    // add the variant id and remove the ident
    req.body.variantId = variant.id;
    // check whether there is already a record for this variant id
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
      // if annotation exists:
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
        const result = await db.models.observedVariantAnnotations.create({
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

    const updatedStatements = [];

    for (const match of variant.kbMatches) {
      // (match);
      for (const stmt of match.kbMatchedStatements) {
        const kbData = {...(stmt.kbData || {})};
        kbData.rapidReportTableTag = kbData.rapidReportTableTag || {};
        const {variantIdent} = req.body;

        if (!req.body.kbStatementIds.includes(stmt.ident)) {
          // if statement is not in the statement list,
          // check if it is tagged; if no tag, add 'noTable';
          // if a tag matching the current table, leave the tag
          // if a different tag, change to 'noTable'
          let tableTagged = false;
          // check if it is tagged (has a)
          for (const tableKey of Object.keys(kbData.rapidReportTableTag)) {
            const typeMap = kbData.rapidReportTableTag[tableKey];
            if (['noTable', rapidTable].includes(tableKey)) {
              if (Array.isArray(typeMap?.[variantType])) {
                if (typeMap[variantType].includes(variantIdent)) {
                  tableTagged = true;
                }
              }
            }
          }

          // if the table is not tagged tag it with 'noTable'
          if (!tableTagged) {
            if (!kbData.rapidReportTableTag.noTable) {
              kbData.rapidReportTableTag.noTable = {[variantType]: [variantIdent]};
            } else {
              const tableEntry = kbData.rapidReportTableTag.noTable;
              tableEntry[variantType] = tableEntry[variantType] || [];
              if (!tableEntry[variantType].includes(variantIdent)) {
                tableEntry[variantType].push(variantIdent);
              }
            }
          }
        } else {
          // Remove `variantIdent` from all entries of rapidReportTableTag
          for (const tableKey of Object.keys(kbData.rapidReportTableTag)) {
            const typeMap = kbData.rapidReportTableTag[tableKey];
            if (Array.isArray(typeMap?.[variantType])) {
              typeMap[variantType] = typeMap[variantType].filter((id) => {return id !== variantIdent;});
            }
          }
          // Add `variantIdent` to the specified rapid table and variant type
          if (!kbData.rapidReportTableTag[rapidTable]) {
            kbData.rapidReportTableTag[rapidTable] = {[variantType]: [variantIdent]};
          } else {
            const tableEntry = kbData.rapidReportTableTag[rapidTable];
            tableEntry[variantType] = tableEntry[variantType] || [];
            if (!tableEntry[variantType].includes(variantIdent)) {
              tableEntry[variantType].push(variantIdent);
            }
          }
        }

        // Queue for bulk update
        updatedStatements.push({
          id: stmt.id, // primary key
          kbData,
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

router.route('/set-statement-summary-table/')
  .post(async (req, res) => {
    // updates statement records

    const rapidTable = req.body.annotations.rapidReportTableTag;
    req.body.rapidTable = rapidTable;
    // below is copied from observedVariantAnnotations.js, should probably DRY it

    // Check that the variant type is real
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
    // Check that the variant is in the db
    let variant;
    try {
      variant = await db.models[variantTable].findOne({
        where: {ident: req.body.variantIdent, reportId: req.report.id},
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
    } catch (error) {
      const message = `Error while checking that linked variant exists ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    if (!(variant)) {
      const message = 'Variant not found';
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
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

        // Ensure `rapidReportTableTag` is initialized
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

        // Queue for bulk update
        updatedStatements.push({
          id: stmt.id, // primary key
          kbData,
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

module.exports = router;
