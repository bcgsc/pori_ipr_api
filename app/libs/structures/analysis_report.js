const validate = require('uuid-validate');
const db = require('../../models');

/**
 * Create ident string
 *
 * @returns {string} - Returns a string of an ident (not unique)
 */
const makeReportIdent = () => {
  let ident = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVQXYZ0123456789';

  for (let i = 0; i < 5; i++) {
    ident += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ident;
};

// Get user if string
const getUser = async (user) => {
  if (typeof user !== 'string') {
    if (user.id) {
      return user;
    }
    if (user.ident) {
      user = user.ident;
    } else {
      throw new Error('User provided is not valid');
    }
  }

  const opts = {where: {}};

  if (validate(user)) {
    opts.where.ident = user;
  } else {
    opts.where.username = user;
  }

  const result = await db.models.user.findOne(opts);

  if (!result) {
    throw new Error('Specified user not found');
  }
  return result;
};


class AnalysisReport {
  /**
   * Construct Report
   *
   * @param {string} ident - identification string
   */
  constructor(ident = null) {
    this.ident = ident; // Store POGID
    this.instance = null;
    this.model = db.models.analysis_report;
    this.allowedStates = ['nonproduction', 'ready', 'active', 'presented', 'archived', 'reviewed', 'uploaded', 'signedoff'];

    if (typeof ident === 'object' && ident !== null && ident.ident) {
      this.instance = ident;
    }
  }

  /**
   * Retrieve entry from database
   *
   * @returns {Promise.<object>} - Returns a database instance of model
   */
  async retrieve() {
    // Return cached object
    if (this.instance) {
      return this.instance;
    }

    // Lookup in Database
    const report = await this.model.findOne({where: {ident: this.ident}, include: {model: db.models.pog, as: 'pog'}});

    // POG not found
    if (!report) {
      return null;
    }

    // POG found
    this.instance = report;
    return this.instance;
  }

  /**
   * Create new entry in database
   *
   * @param {object} pog - POG model instance
   * @param {object} analysis - Patient Analysis model instance
   * @param {user} user - Owning user for the report creation event
   * @param {type} type - report type to be created (genomic vs probe)
   * @param {object} options - Report creation options (eg. state: nonproduction, ready, active, presented, archived; expression_matrix: v8, v9)
   *
   * @returns {Promise.<object>} - Returns a new POG Analysis Report
   */
  async create(pog, analysis, user, type, options) {
    if (!options.analysis && !analysis.id) {
      throw new Error('No analysis entry on pog object or analysis object passed');
    }

    const report = {
      ident: makeReportIdent(),
      createdBy_id: user.id,
      pog_id: pog.id,
      analysis_id: analysis.id,
      type,
    };

    if (options.expression_matrix) {
      report.expression_matrix = options.expression_matrix;
    }
    if (options.state && this.allowedStates.includes(options.state)) {
      report.state = options.state;
    }

    const result = await this.model.create(report);
    this.instance = result;
    this.ident = result.ident;
    return result;
  }

  /**
   * Get public facing instance
   *
   * @returns {Promise.<object>} - Returns a public-safe object
   */
  async public() {
    const result = await this.model.scope('public').findOne({
      where: {ident: this.instance.ident},
      attributes: {exclude: ['deletedAt']},
      include: [
        {model: db.models.patientInformation, as: 'patientInformation', attributes: {exclude: ['id', 'deletedAt', 'pog_id']}},
        {model: db.models.tumourAnalysis.scope('public'), as: 'tumourAnalysis'},
        {model: db.models.POG.scope('public'), as: 'pog'},
        {model: db.models.user.scope('public'), as: 'createdBy'},
        {
          model: db.models.analysis_reports_user,
          as: 'users',
          attributes: {exclude: ['id', 'pog_id', 'report_id', 'user_id', 'addedBy_id', 'deletedAt']},
          include: [{
            model: db.models.user.scope('public'),
            as: 'user',
          }],
        },
      ],
    });

    if (!result) {
      throw new Error('Instance not found.');
    }
    return result;
  }

  /**
   * Bind a user to this report
   *
   * @param {object|string} user - User object or ident
   * @param {string} role - User role wrt this report
   * @param {object} addedBy - User model instance of user performing the binding
   *
   * @returns {Promise.<object>} - Returns an updated instance
   */
  async bindUser(user, role, addedBy) {
    const report = this.instance;
    // Get user if string
    const boundUser = await getUser(user);

    // Check if the attempting user is already bound in this role
    const bound = await db.models.analysis_reports_user.findAll({where: {user_id: boundUser.id, report_id: report.id, role}});
    // Check if the user is already bound in this role
    if (bound.length > 0) {
      throw new Error('The user is already bound in this role');
    }

    // Perform user binding
    // Create analysis reports user
    const result = await db.models.analysis_reports_user.create({
      user_id: boundUser.id,
      report_id: report.id,
      role,
      addedBy_id: addedBy.id,
    });

    result.user = {
      firstName: boundUser.firstName,
      lastName: boundUser.lastName,
      email: boundUser.email,
      ident: boundUser.ident,
      username: boundUser.username,
    };

    return this.public.bind(this);
  }

  /**
   * Unbind a user from an association with the report
   *
   * @param {object|string} user - User object or ident
   * @param {string} role - User role wrt this report
   *
   * @returns {Promise.<object>} - Returns an updated instance
   */
  async unbindUser(user, role) {
    const unbindUser = await getUser(user);
    // Remove binding from DB (soft-delete)
    const result = await db.models.analysis_reports_user.destroy({where: {report_id: this.instance.id, user_id: unbindUser.id, role}});
    if (result === 0) {
      throw new Error('No binding found');
    }
    return this.public.bind(this);
  }
}

module.exports = AnalysisReport;
