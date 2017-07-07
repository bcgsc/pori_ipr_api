let _ = require('lodash'),
  router = require('express').Router({mergeParams: true}),
  db = require(process.cwd() + '/app/models');


// Lookup POG middleware
module.exports = (req,res,next,ident) => {

  // Lookup POG first
  db.models.analysis_report.findOne({
    where: {ident: ident},
    attributes: {exclude: ['deletedAt']},
    include: [
      {model: db.models.patientInformation, as: 'patientInformation', attributes: { exclude: ['id', 'deletedAt', 'pog_id'] } },
      {model: db.models.tumourAnalysis.scope('public'), as: 'tumourAnalysis' },
      {model: db.models.POG.scope('public'), as: 'pog' },
      {model: db.models.user.scope('public'), as: 'createdBy'},
      {model: db.models.analysis_reports_user, as: 'users', separate: true, include: [
        {model: db.models.user.scope('public'), as: 'user'}
      ]}
    ],
  }).then(
    (result) => {
      // Nothing found?
      if(result === null) return res.status(404).json({error: {message: 'Unable to find the requested report', code: 'reportMiddlewareLookupFail'}});

      // POG found, next()
      if(result !== null) {
        req.report = result;
        next();
      }
    },
    (error) => {
      console.log(error);
      if(result === null) return res.status(404).json({error: {message: 'Unable to find the requested report', code: 'reportMiddlewareQueryFail'}});
    }
  );
};
