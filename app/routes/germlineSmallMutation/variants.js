const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const _ = require('lodash');
const logger = require('../../log');
const variantMiddleware = require('../../middleware/germlineSmallMutation/germline_small_mutation_variant.middleware');
const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const db = require('../../models');
const variantSchema = require('../../schemas/germlineSmallMutation/variants');

const router = express.Router({mergeParams: true});

const removeUndefinedProperties = (obj) => {
  if (obj && Array.isArray(obj)) {
    return obj.map((o) => { return removeUndefinedProperties(o); });
  } if (typeof obj === 'object') {
    const copy = {};
    for (const [prop, value] of Object.entries(obj)) {
      if (value !== undefined) {
        copy[prop] = removeUndefinedProperties(value);
      }
    }
    return copy;
  }
  return obj;
};

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

    // Enforce that only family_history, patient_history and hidden should be updated
    let updateData = {};
    updateData.family_history = req.body.family_history;
    updateData.patient_history = req.body.patient_history;
    updateData.hidden = req.body.hidden;
    updateData = removeUndefinedProperties(updateData);

    // Update current Datavalues with the cleaned Data
    req.variant.dataValues = {
      ...req.variant.dataValues,
      ...updateData,
    };

    try {
      // Validate input
      validateAgainstSchema(variantSchema, req.variant.dataValues);
    } catch (error) {
      // if input is invalid return 400
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: error.message}});
    }

    try {
      await db.models.germline_small_mutation_variant.update(req.variant.dataValues, {
        where: {
          ident: req.variant.ident,
        },
        individualHooks: true,
        paranoid: true,
        additionalProperties: false,
      });
      return res.json(await req.variant.reload());
    } catch (error) {
      logger.error(`Error while trying to update variant ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message: 'Error while trying to update variant'});
    }
  });

module.exports = router;
