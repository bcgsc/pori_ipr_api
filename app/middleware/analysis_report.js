const db = require('../models');

// Lookup POG middleware
module.exports = async (req, res, next, ident) => {
  // Lookup POG first
  const result = await db.models.analysis_report.findOne({
    where: {ident},
    attributes: {exclude: ['deletedAt']},
    include: [
      {model: db.models.patientInformation, as: 'patientInformation', attributes: {exclude: ['id', 'deletedAt', 'pog_id']}},
      {model: db.models.tumourAnalysis.scope('public'), as: 'tumourAnalysis'},
      {model: db.models.POG.scope('public'), as: 'pog'},
      {model: db.models.user.scope('public'), as: 'createdBy'},
      {model: db.models.pog_analysis.scope('public'), as: 'analysis'},
      {
        model: db.models.analysis_reports_user,
        as: 'users',
        separate: true,
        include: [
          {model: db.models.user.scope('public'), as: 'user'},
        ],
      },
    ],
  });

  // Nothing found?
  if (!result) {
    return res.status(404).json({error: {message: 'Unable to find the requested report', code: 'reportMiddlewareLookupFail'}});
  }

  // POG found, next()
  req.report = result;
  return next();
};
