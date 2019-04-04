const _                       = require('lodash');
const db                      = require(process.cwd() + '/app/models');
const MiddlewareNotFound      = require('../../../middleware/exceptions/MiddlewareNotFound');
const MiddlewareQueryFailed   = require('../../../middleware/exceptions/MiddlewareQueryFailed');

// Lookup POG middleware
module.exports = (req,res,next,ident) => {
  
  let opts = { where: {} };
  
  opts.attributes = {
    exclude: ['deletedAt', 'reviewedBy_id', 'germline_report_id']
  };
  
  // Check if it's a UUID
  opts.where.ident = ident;
  
  // Lookup POG first
  db.models.germline_small_mutation_review.scope('public').findOne(opts).then(
    (result) => {
      // Nothing found?
      if(result === null) throw new MiddlewareNotFound("Unable to find the germline report review", req, res, "germlineReportReview");
      
      // POG found, next()
      if(result !== null) {
        req.review = result;
        next();
      }
    },
    (error) => {
      console.log(error);
      throw new MiddlewareQueryFailed("Unable to find the requested germline report review.", req, res, "failedTrackingStateTaskMiddlewareQuery");
    }
  );
};
