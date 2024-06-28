const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const {Op} = require('sequelize');

const db = require('../../models');
const logger = require('../../log');
const cache = require('../../cache');

const router = express.Router({mergeParams: true});

const include = [
  {model: db.models.user, as: 'reviewerSignature', attributes: {exclude: ['id', 'deletedAt', 'password', 'updatedBy']}},
  {model: db.models.user, as: 'authorSignature', attributes: {exclude: ['id', 'deletedAt', 'password', 'updatedBy']}},
  {model: db.models.user, as: 'creatorSignature', attributes: {exclude: ['id', 'deletedAt', 'password', 'updatedBy']}},
];

// Middleware for report signatures
router.use('/', async (req, res, next) => {
  const key = `/reports/${req.report.ident}/signatures`;
  let cacheResult;

  try {
    cacheResult = await cache.get(key);
  } catch (error) {
    logger.error(`Error during signatures cache get ${error}`);
  }

  if (cacheResult) {
    // Build Sequelize model from cached string without calling db
    req.signatures = db.models.signatures.build(JSON.parse(cacheResult), {
      raw: true,
      isNewRecord: false,
      include,
    });
    return next();
  }

  try {
    // Get report signatures
    req.signatures = await db.models.signatures.findOne({
      where: {reportId: req.report.id},
      include,
    });

    if (req.signatures) {
      cache.set(key, JSON.stringify(req.signatures), 'EX', 14400);
    }

    return next();
  } catch (error) {
    logger.error(`Unable to get signatures for report ${req.report.ident} error: ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {message: `Unable to get signatures for report ${req.report.ident}`},
    });
  }
});

router.route('/')
  .get(async (req, res) => {
    if (req.signatures) {
      return res.json(req.signatures.view('public'));
    }
    return res.json(null);
  });

router.route('/history')
  .get(async (req, res) => {
    const signatureHistory = await db.models.signatures.scope('history').findAll({
      where: {reportId: req.report.id},
      order: [
        ['id', 'ASC'],
      ],
      include,
      paranoid: false,
    });
    // Shift first element to last due to the way sequelize handles updates
    const firstElement = signatureHistory.shift();
    signatureHistory.push(firstElement);
    return res.json(signatureHistory);
  });

router.route('/sign/:role(author|reviewer|creator)')
  .put(async (req, res) => {
    // Get the role
    const {params: {role}} = req;

    // add author, creator or reviewer
    const data = {};
    data[`${role}Id`] = req.user.id;
    data[`${role}SignedAt`] = new Date();

    // check if report has signatures
    if (!req.signatures) {
      // set report id
      data.reportId = req.report.id;

      try {
        await db.models.signatures.create(data);
        const newEntry = await db.models.signatures.scope('public').findOne({where: {reportId: req.report.id}});
        return res.json(newEntry);
      } catch (error) {
        logger.error(`Unable to create ${role} signature ${error}`);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: `Unable to create ${role} signature`}});
      }
    } else {
      try {
        await req.signatures.update(data, {userId: req.user.id});
        await req.signatures.reload();
        return res.json(req.signatures.view('public'));
      } catch (error) {
        logger.error(`Unable to update ${role} signature ${error}`);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: `Unable to update ${role} signature`}});
      }
    }
  });

router.route('/revoke/:role(author|reviewer|creator)')
  .put(async (req, res) => {
    // Get the role
    const {params: {role}} = req;

    // check if signatures exists for report
    if (!req.signatures) {
      logger.error('No signatures found for this report');
      return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'No signatures found for this report'}});
    }

    // remove author, creator or reviewer
    const data = {};
    data[`${role}Id`] = null;
    data[`${role}SignedAt`] = null;

    // update signatures
    try {
      await req.signatures.update(data, {userId: req.user.id});
      await req.signatures.reload();
      return res.json(req.signatures.view('public'));
    } catch (error) {
      logger.error(`Unable to revoke ${role} ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: `Unable to revoke ${role}`}});
    }
  });

router.route('/earliest-signoff')
  .get(async (req, res) => {
    let result;
    try {
      [result] = await db.models.signatures.scope('public').findAll({
        where: {
          reportId: req.report.id,
          reviewerId: {
            [Op.ne]: null,
          },
          authorId: {
            [Op.ne]: null,
          },
        },
        paranoid: false,
        limit: 1,
        order: [['updatedAt', 'desc']],
      });
    } catch (error) {
      logger.error(`Error while searching for earliest signature ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while searching for earliest signature'},
      });
    }
    if (!result) {
      logger.error(`Report ${req.report.ident} has not been signed off on yet`);
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {message: 'This report has not been signed off on yet'},
      });
    }

    // Set the signedOffOn date, which should be the last update.
    // Since the only updates are adding and removing signatures.
    result.dataValues.signedOffOn = result.updatedAt;

    return res.json(result);
  });

module.exports = router;
