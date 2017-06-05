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

  // Lookup POG first
  db.models.pog_analysis.findOne({
    where: {ident: ident},
    attributes: {exclude: ['deletedAt']},
    include: [
      {as: 'pog', model: db.models.POG.scope('public')}
    ],
  }).then(
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
