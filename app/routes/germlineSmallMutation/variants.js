const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const logger = require('../../log');
const variantMiddleware = require('../../middleware/germlineSmallMutation/germline_small_mutation_variant.middleware');
const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const db = require('../../models');
const variantSchema = require('../../schemas/germlineSmallMutation/updateVariant');

const router = express.Router({mergeParams: true});

router.param('variant', variantMiddleware);

// Resource endpoints for Variants
router.route('/:variant')
  /**
   * Get an existing variant
   *
   * GET /patient/{patient}/biopsy/{analysis}/report/{gsm_report}/variant/{variant}
   *
   * @urlParam {string} patientID - Patient unique ID (POGID)
   * @urlParam {string} biopsy - Biopsy analysis id (biop1)
   * @urlParam {stirng} report - Report UUID
   * @urlParam {string} variant - Variant id (ident)
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   *
   * @returns {object} - Returns requested variant
   */
  .get((req, res) => {
    return res.json(req.variant);
  })

  /**
   * Update an existing variant
   *
   * PUT /patient/{patient}/biopsy/{analysis}/report/{gsm_report}/variant/{variant}
   *
   * @urlParam {string} patientID - Patient unique ID (POGID)
   * @urlParam {string} biopsy - Biopsy analysis id (biop1)
   * @urlParam {stirng} report - Report UUID
   * @urlParam {string} variant - Variant id (ident)
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   *
   * @property {object} req.variant - Requested variant
   *
   * @returns {object} - Returns updated variant
   */
  .put(async (req, res) => {
    // Update Variant details
    try {
      // Validate input
      validateAgainstSchema(variantSchema, req.body);
    } catch (error) {
      // if input is invalid return 400
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: error.message}});
    }

    try {
      const opt = {
        where: {
          ident: req.variant.ident,
        },
        individualHooks: true,
        paranoid: true,
      };
      await db.models.germline_small_mutation_variant.update(req.body, opt);
      await req.variant.reload(opt);
      return res.json(await req.variant);
    } catch (error) {
      logger.error(`Error while trying to update variant ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message: 'Error while trying to update variant'});
    }
  });

module.exports = router;