const validate = require('uuid-validate');
const db = require('../models');

const ignored = {
  files: ['index.js', 'POG.js'],
  routes: ['loadPog'],
};

// Lookup POG middleware
module.exports = async (req, res, next, ident) => {
  // Don't resolve for loading routes
  if (ignored.routes.includes(req.url.split('/').pop())) {
    return next();
  }

  const opts = {where: {}};

  // Check if it's a UUID
  if (validate(ident)) {
    opts.where.ident = ident;
  } else {
    if (!req.POG) {
      throw new Error('No POG set, unable to find analysis middleware');
    }
    opts.where = {$or: [{clinical_biopsy: ident}, {analysis_biopsy: ident}], pog_id: req.POG.id};
  }

  opts.attributes = {exclude: ['deletedAt']};

  // Lookup POG first
  const result = await db.models.pog_analysis.findOne(opts);
  // Nothing found?
  if (!result) {
    return res.status(404).json({error: {message: 'Unable to find the requested analysis', code: 'analysisMiddlewareLookupFail'}});
  }
  // POG found, next()
  req.analysis = result;
  return next();
};
