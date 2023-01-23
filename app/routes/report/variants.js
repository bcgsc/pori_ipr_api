const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});

const {literal} = require('sequelize');
const db = require('../../models');
const logger = require('../../log');
const {KB_PIVOT_MAPPING} = require('../../constants');

// Routing for Alteration
router.route('/')
  .get(async (req, res) => {
    // Get all small mutations for this report
    // TODO: Add comment on why cache was removed

    try {
      const variantTables = Object.values(KB_PIVOT_MAPPING);
      const variantsArray = [];

      for (const table of variantTables) {
        const variantsData = await db.models[table].scope('extended').findAll({
          order: [['id', 'ASC']],
          attributes: {
            include: [[literal(`'${table}'`), 'variantType']],
          },
          where: {
            reportId: req.report.id,
          },
          include: [
            {
              model: db.models.kbMatches,
              attributes: ['ident', 'category'],
            },
          ],
        });

        variantsArray.push(variantsData);
      }

      const results = variantsArray.flat(1);

      return res.json(results);
    } catch (error) {
      logger.error(`Unable to retrieve small mutations ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to retrieve small mutations'},
      });
    }
  });

module.exports = router;
