const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const logger = require('../../log');
const variantMiddleware = require('../../middleware/germlineSmallMutation/germline_small_mutation_variant.middleware');
const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const variantSchema = require('../../schemas/germlineSmallMutation/updateVariant');

const router = express.Router({mergeParams: true});

router.param('variant', variantMiddleware);

// Resource endpoints for Variants
router.route('/:variant')
  /**
   * Get an existing variant
   *
   * GET /{gsm_report}/variant/{variant}
   *
   * @urlParam {stirng} report - Report UUID
   * @urlParam {string} variant - Variant id (ident)
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   *
   * @returns {object} - Returns requested variant
   */
  .get((req, res) => {
    return res.json(req.variant.view('public'));
  })

  /**
   * Update an existing variant
   *
   * PUT /{gsm_report}/variant/{variant}
   *
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
      logger.error(`Germline variant validation failed ${error}`);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'Germline variant validation failed'}});
    }

    try {
      await req.variant.update(req.body);
      await req.variant.reload();
      return res.json(req.variant.view('public'));
    } catch (error) {
      logger.error(`Error while trying to update germline variant ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message: 'Error while trying to update germline variant'});
    }
  });

module.exports = router;
