const _ = require('lodash');
const db = require('../../app/models');

const ignored = {
  files: ['index.js', 'POG.js'],
  routes: ['loadPog'],
};

// Lookup POG middleware
module.exports = async (req, res, next, pogID) => {
  // Don't resolve for loading routes
  if (ignored.routes.indexOf(_.last(req.url.split('/'))) !== -1) return next();

  try {
    // Look for patient w/ a matching POGID or alternate_identifier
    const patient = await db.models.POG.findOne({
      where: {
        $or: {
          POGID: pogID,
          alternate_identifier: pogID,
        },
      },
      attributes: {exclude: ['deletedAt']},
      include: [
        {model: db.models.patientInformation, as: 'patientInformation', attributes: {exclude: ['id', 'deletedAt', 'pog_id']}},
        {as: 'analysis_reports', model: db.models.analysis_report.scope('public')},
        {as: 'projects', model: db.models.project},
      ],
    });

    if (!patient) throw new Error('notFoundError'); // no patient found

    // patient found, set request param
    req.POG = patient;
    return next();
  } catch (err) {
    // set default return status and message
    let returnStatus = 500;
    let returnMessage = err.message;

    if (err.message === 'notFoundError') { // return 404 error - patient could not be found
      returnStatus = 404;
      returnMessage = 'patient could not be found';
    }

    return res.status(returnStatus).json({error: {message: `An error occurred while trying to find patient ${pogID}: ${returnMessage}`}});
  }
};
