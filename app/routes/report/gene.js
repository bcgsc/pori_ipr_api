const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const db = require('../../models');
const logger = require('../../log');

const router = express.Router({mergeParams: true});

router.param('geneName', async (req, res, next, geneName) => {
  let result;
  try {
    result = await db.models.genes.scope('public').findOne({where: {report_id: req.report.id, name: geneName}});
  } catch (error) {
    logger.error(`Unable to find gene ${error}`);
    return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'Unable to find gene'}});
  }

  if (!result) {
    logger.error('Unable to locate gene');
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to locate gene'}});
  }

  req.gene = result;
  return next();
});

// Handle requests for genes
router.route('/:geneName')
  .get((req, res) => {
    return res.json(req.gene);
  })
  .put(async (req, res) => {
    try {
      const result = await db.models.genes.update(req.body, {
        where: {
          ident: req.gene.ident,
        },
        individualHooks: true,
        paranoid: true,
        returning: true,
      });

      // Get updated model data from update
      const [, [{dataValues}]] = result;

      // Remove id's and deletedAt properties from returned model
      const {
        id, reportId, deletedAt, ...publicModel
      } = dataValues;

      return res.json(publicModel);
    } catch (error) {
      logger.error(`Unable to update probe target ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update probe target', code: 'failedMutationSummaryVersion'}});
    }
  });


router.route('/')
  .get(async (req, res) => {
    const where = {reportId: req.report.id};

    const options = {
      where,
      order: [['name', 'ASC']],
    };

    // Get all targeted genes for this report
    try {
      const result = await db.models.genes.scope('public').findAll(options);
      return res.json(result);
    } catch (error) {
      logger.error(`Unable to retrieve genes ${error}`);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'Unable to retrieve genes'}});
    }
  });

module.exports = router;
