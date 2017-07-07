const _                       = require('lodash');
const db                      = require(process.cwd() + '/app/models');
const MiddlewareNotFound      = require('../../../middleware/exceptions/MiddlewareNotFound');
const MiddlewareQueryFailed   = require('../../../middleware/exceptions/MiddlewareQueryFailed');

// Lookup POG middleware
module.exports = (req,res,next,ident) => {

  // Lookup POG first
  db.models.tracking_state_definition.scope('public').findOne({
    where: {ident: ident},
    limit: 1
  }).then(
    (result) => {
      // Nothing found?
      if(result === null) throw new MiddlewareNotFound("Unable to find the tracking state definition", req, res, "trackingStateDefinitionNotFound");

      // POG found, next()
      if(result !== null) {
        req.definition = result;
        next();
      }
    },
    (error) => {
      console.log(error);
      throw new MiddlewareQueryFailed("Unable to looking the requested state definition.", req, res, "failedTrackingStateDefinitionMiddlewareQuery");
    }
  );
};