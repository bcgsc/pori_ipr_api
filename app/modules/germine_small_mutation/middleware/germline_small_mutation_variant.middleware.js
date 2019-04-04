const _                       = require('lodash');
const db                      = require(process.cwd() + '/app/models');
const MiddlewareNotFound      = require('../../../middleware/exceptions/MiddlewareNotFound');
const MiddlewareQueryFailed   = require('../../../middleware/exceptions/MiddlewareQueryFailed');

// Lookup POG middleware
module.exports = (req,res,next,ident) => {
  
  let opts = { where: {} };
  
  opts.attributes = {
    exclude: ['deletedAt', 'germline_report_id']
  };
  
  // Check if it's a UUID
  opts.where.ident = ident;
  
  // Lookup POG first
  db.models.germline_small_mutation_variant.scope('public').findOne(opts).then(
    (result) => {
      // Nothing found?
      if(result === null) throw new MiddlewareNotFound("Unable to find the germline report variant", req, res, "germlineReportVariant");
      
      // POG found, next()
      if(result !== null) {
        req.variant = result;
        next();
      }
    },
    (error) => {
      console.log(error);
      throw new MiddlewareQueryFailed("Unable to find the requested germline report variant.", req, res, "failedTrackingStateTaskMiddlewareQuery");
    }
  );
};
