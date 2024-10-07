const HTTP_STATUS = require('http-status-codes');
const db = require('../models');
const logger = require('../log');

const {KB_PIVOT_MAPPING} = require('../constants');

module.exports = async (req, res, next, ident) => {
    let result;
    try {
      result = await db.models.kbMatches.findOne({
        where: {ident},
        include: [
          {
            model: db.models.kbMatchedStatements,
            as: 'kbMatchedStatements',
            attributes: {
              exclude: ['id', 'deletedAt', 'updatedAt', 'createdAt', 'updatedBy', 'reportId'],
            },
            through: {attributes: []},
          },
          ...Object.values(KB_PIVOT_MAPPING).map((modelName) => {
            return {model: db.models[modelName].scope('public'), as: modelName};
          }),
        ],
      });
    } catch (error) {
      logger.log(`Error while trying to get kb match ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while trying to get kb match'},
      });
    }
  
    if (!result) {
      logger.error('Unable to locate kb match');
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {message: 'Unable to locate kb match'},
      });
    }
  
    req.kbMatch = result;
    return next();
};
