const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});

const {literal} = require('sequelize');
const db = require('../../models');
const logger = require('../../log');

const {KB_PIVOT_MAPPING} = require('../../constants');

const KBMATCHEXCLUDE = ['id', 'reportId', 'variantId', 'deletedAt', 'updatedBy'];
const OBSVARANNOTEXCLUDE = KBMATCHEXCLUDE;
const STATEMENTEXCLUDE = ['id', 'reportId', 'deletedAt', 'updatedBy'];
const MUTATION_REGEX = '^([^\\s]+)(\\s)(mutation[s]?)?(missense)?$';
const MSI_CUTOFF = 20;

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
const cancerRelevanceOmits = ['exp'];
const geneLinkedVariantTypes = ['mut', 'cnv', 'exp'];

const getRapidReportVariants = async (tableName, variantType, reportId, rapidTable) => {
  let allKbMatches;

  const query = {
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
  };
  if (geneLinkedVariantTypes.includes(variantType)) {
    const geneSubquery = {
      model: db.models.genes.scope('minimal'),
      as: 'gene',
    };
    query.include.push(geneSubquery);
  }

  // if the table is unknownSignificance, only get subset of variant types
  if (rapidTable === 'unknownSignificance') {
    if (unknownSignificanceIncludes.includes(variantType)) {
      allKbMatches = await db.models[tableName].scope('extended').findAll(query);
    }
  } else if (rapidTable === 'cancerRelevance') {
    // exclude expression variants from cancer relevance table
    if (!cancerRelevanceOmits.includes(variantType)) {
      allKbMatches = await db.models[tableName].scope('extended').findAll(query);
    }
  } else {
    allKbMatches = await db.models[tableName].scope('extended').findAll(query);
  }

  if (!allKbMatches) {
    return [];
  }

  // do initial filtering based on contents of annotations - these should override defaults
  const therapeuticResultsFromAnnotation = [];
  const cancerRelevanceResultsFromAnnotation = [];
  const unknownSignificanceFromAnnotation = [];
  const doNotReport = [];

  allKbMatches.forEach((variant) => {
    // if tagged remove from further filtering
    if (variant?.observedVariantAnnotation?.annotations?.rapidReportTableTag) {
      const tableTag = variant.observedVariantAnnotation.annotations.rapidReportTableTag;
      if (tableTag === 'therapeutic') {
        therapeuticResultsFromAnnotation.push(variant);
      } else if (tableTag === 'cancerRelevance') {
        cancerRelevanceResultsFromAnnotation.push(variant);
      } else if (tableTag === 'unknownSignificance') {
        unknownSignificanceFromAnnotation.push(variant);
      } else if (tableTag === 'noTable') {
        doNotReport.push(variant);
      }
    }
  });

  // remove the tagged variants
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
  cancerRelevanceResults = JSON.parse(JSON.stringify(allKbMatches));

  // remove msi variants below cutoff
  cancerRelevanceResults = cancerRelevanceResults.filter((variant) => {
    if (variantType === 'msi') {
      return (variant.score >= MSI_CUTOFF);
    }
    return true;
  });

  // remove kbmatches that fail the regex
  cancerRelevanceResults = cancerRelevanceResults.map((variant) => {
    const kbmatches = variant.kbMatches.filter((item) => {
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

  cancerRelevanceResultsFiltered.push(...cancerRelevanceResultsFromAnnotation);

  if (rapidTable === 'cancerRelevance') {
    return cancerRelevanceResultsFiltered;
  }

  const unknownSignificanceResultsFiltered = [];
  let unknownSignificanceResults = [];

  if (unknownSignificanceIncludes.includes(variantType)) {
    unknownSignificanceResults = JSON.parse(JSON.stringify(allKbMatches));
  }

  // refine unknownSignificance results to only include variants that EITHER:
  // a - have a linked gene that is oncogene, cancerGeneList or tumourSuppressor true, OR
  // b - therapeuticAssoc-qualifying matches
  // (unless they are tagged - add the tagged results back after filtering)
  unknownSignificanceResults = unknownSignificanceResults.map((variant) => {
    if (
      // this is safe to check because variantType is smallMutation which always has a gene
      variant.gene.oncogene || variant.gene.cancerGeneListMatch || variant.gene.tumourSuppressor
    ) {
      return variant;
    }
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

  // remove matches which have no matching statements...
  unknownSignificanceResults = unknownSignificanceResults.map((variant) => {
    variant.kbMatches = variant.kbMatches.filter((kbmatch) => {
      kbmatch.kbMatchedStatements = kbmatch.kbMatchedStatements
        .filter((item) => {return item !== null;});
      return kbmatch.kbMatchedStatements.length > 0;
    });
    return variant;
  });

  // remove variants which have no matches
  unknownSignificanceResults = unknownSignificanceResults.filter((variant) => {
    return variant.kbMatches.length > 0;
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
