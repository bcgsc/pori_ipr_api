const {Op} = require('sequelize');
const db = require('../models');

const ignored = {
  files: ['index.js', 'POG.js'],
  routes: ['loadPog'],
};

// Lookup POG middleware
module.exports = async (req, res, next, pogID) => {
  // Don't resolve for loading routes
  if (ignored.routes.includes(req.url.split('/').pop())) {
    return next();
  }

  try {
    // Look for patient w/ a matching POGID or alternate_identifier
    const patient = await db.models.POG.findOne({
      where: {
        [Op.or]: [
          {POGID: pogID},
          {alternate_identifier: pogID},
        ],
      },
      attributes: {exclude: ['deletedAt']},
      include: [
        {model: db.models.patientInformation, as: 'patientInformation', attributes: {exclude: ['id', 'deletedAt', 'pog_id']}},
        {as: 'analysis_reports', model: db.models.analysis_report.scope('public'), include:
          [{
            model: db.models.analysis_reports_user,
            as: 'users',
            attributes: {exclude: ['id', 'ident']},
          }],
        },
        {as: 'projects', model: db.models.project},
      ],
    });

    if (!patient) { // no patient found
      return res.status(404).json({error: {message: `Cannot find patient: ${pogID}`}});
    }

    // patient found, set request param
    req.POG = patient;
    return next();
  } catch (err) {
    return res.status(500).json(err);
  }
};
