let _ = require('lodash'),
    router = require('express').Router({mergeParams: true}),
    db = require(process.cwd() + '/app/models');
    
    
let ignored = {
  files: ['index.js', 'POG.js', 'session.js'],
  routes: ['loadPog'],
}

// Lookup POG middleware
module.exports = (req,res,next,pogID) => {
  
  // Don't resolve for loading routes
  if(ignored.routes.indexOf(_.last(req.url.split('/'))) !== -1) return next();
  
  // Lookup POG first
  db.models.POG.findOne({ 
      where: {POGID: pogID},
      attributes: {exclude: ['deletedAt']},
      include: [
        {model: db.models.patientInformation, as: 'patientInformation', attributes: { exclude: ['id', 'deletedAt', 'pog_id'] }, order: 'dataVersion DESC', group: 'ident' },
        {model: db.models.tumourAnalysis, as: 'tumourAnalysis', attributes: { exclude: ['id', 'deletedAt', 'pog_id'] }, order: 'dataVersion DESC', group: 'ident' },
      ],
      group: 'POG.ident',
      //order: 'POG.dataVersion DESC'
    }).then(
    (result) => {
      // Nothing found?
      if(result === null) return res.status(404).json({error: {message: 'Unable to find the requested POG', code: 'pogMiddlewareLookupFail'}});
      
      // POG found, next()
      if(result !== null) {
        req.POG = result;
        next();
      }
    },
    (error) => {
      console.log(error);
      if(result === null) return res.status(404).json({error: {message: 'Unable to find the requested POG', code: 'pogMiddlewareQueryFail'}});
    }
  );
}
