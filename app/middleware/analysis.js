let _ = require('lodash'),
  router = require('express').Router({mergeParams: true}),
  db = require(process.cwd() + '/app/models');


let ignored = {
  files: ['index.js', 'POG.js', 'session.js'],
  routes: ['loadPog'],
}

// Lookup POG middleware
module.exports = (req,res,next,ident) => {

  // Don't resolve for loading routes
  if(ignored.routes.indexOf(_.last(req.url.split('/'))) !== -1) return next();

  let opts = {where: {}};

  // Check if it's a UUID
  if(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ident)) opts.where.ident = ident;
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ident)) { // Not a UUID
    if(!req.POG) throw new Error('No POG set, unable to find analysis middleware');
    opts.where = {$or: [{clinical_biopsy: ident}, {analysis_biopsy: ident}], pog_id: req.POG.id};
  }

  opts.attributes = {exclude: ['deletedAt']},

  // Lookup POG first
  db.models.pog_analysis.findOne(opts).then(
    (result) => {
      // Nothing found?
      if(result === null) return res.status(404).json({error: {message: 'Unable to find the requested analysis', code: 'analysisMiddlewareLookupFail'}});

      // POG found, next()
      if(result !== null) {
        req.analysis = result;
        next();
      }
    },
    (error) => {
      console.log(error);
      if(result === null) return res.status(404).json({error: {message: 'Unable to find the requested analysis', code: 'analysisMiddlewareQueryFail'}});
    }
  );
}
