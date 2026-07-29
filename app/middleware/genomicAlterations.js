const HTTP_STATUS = require('http-status-codes');
const db = require('../models');
const logger = require('../log');

const {KB_PIVOT_MAPPING, GENE_LINKED_VARIANT_MODELS} = require('../constants');

const getVariantInclude = (modelName) => {
  const isGeneLinkedVariant = GENE_LINKED_VARIANT_MODELS.includes(modelName);
  const scopeName = isGeneLinkedVariant ? 'extended' : 'public';
  const scopedModel = db.models[modelName].options.scopes?.[scopeName]
    ? db.models[modelName].scope(scopeName)
    : db.models[modelName].scope('public');
  return {
    model: scopedModel,
    as: modelName,
  };
};

module.exports = async (req, res, next, altIdent) => {
  let result;
  try {
    result = await db.models.genomicAlterationsIdentified.findOne({
      where: {ident: altIdent, reportId: req.report.id},
      include: Object.values(KB_PIVOT_MAPPING).map(getVariantInclude),
    });
  } catch (error) {
    logger.error(`Unable to get genomic alterations ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {message: 'Unable to get genomic alterations'},
    });
  }

  if (!result) {
    logger.error('Unable to locate genomic alterations');
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: {message: 'Unable to locate genomic alterations'},
    });
  }

  req.alteration = result;
  return next();
};
