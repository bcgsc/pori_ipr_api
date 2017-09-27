const _                       = require('lodash');
const db                      = require(process.cwd() + '/app/models');
const MiddlewareNotFound      = require('../../../middleware/exceptions/MiddlewareNotFound');
const MiddlewareQueryFailed   = require('../../../middleware/exceptions/MiddlewareQueryFailed');

// Lookup POG middleware
module.exports = (req,res,next,ident) => {
  
  // Lookup POG first
  db.models.recent_report.scope('public').findOne({
    where: {ident: ident},
    limit: 1
  }).then(
    (result) => {
      // Nothing found?
      if(result === null) throw new MiddlewareNotFound("Unable to find the recent report entry", req, res, "trackingStateDefinitionNotFound");
      
      // POG found, next()
      if(result !== null) {
        req.entry = result;
        next();
      }
    },
    (error) => {
      console.log(error);
      throw new MiddlewareQueryFailed("Unable to find the recent report entry.", req, res, "failedTrackingStateDefinitionMiddlewareQuery");
    }
  );
};