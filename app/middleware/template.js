const HTTP_STATUS = require('http-status-codes');
const db = require('../models');
const logger = require('../log');

module.exports = async (req, res, next, ident) => {
  let result;
  try {
    result = await db.models.template.findOne({
      where: {ident},
      include: [
        {as: 'logoImage', model: db.models.image.scope('public')},
        {as: 'headerImage', model: db.models.image.scope('public')},
        {as: 'signatureTypes',
          model: db.models.templateSignatureTypes,
          attributes: {
            exclude: ['id', 'templateId', 'deletedAt', 'updatedAt', 'createdAt', 'updatedBy'],
          }},
      ],
    });
  } catch (error) {
    logger.error(`Error while finding template ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {message: 'Error while finding template'},
    });
  }

  if (!result) {
    logger.error(`Unable to find template with ident: ${ident}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: {message: `Unable to find template with ident: ${ident}`},
    });
  }

  // Add template to request
  req.template = result;
  return next();
};
