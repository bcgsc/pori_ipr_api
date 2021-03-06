const uuidv4 = require('uuid/v4');
const validate = require('uuid-validate');
const db = require('../../models');

// Get user if string
const getUser = async (user) => {
  if (typeof user !== 'string') {
    if (user.id) {
      return user;
    }
    if (!user.ident) {
      throw new Error('User provided is not valid');
    }
    user = user.ident;
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
   * @param {string|object} ident - identification string or instance of a report
   */
  constructor(ident = null) {
    this.ident = ident; // Store report ident
    this.instance = null;
    this.model = db.models.analysis_report;
    this.allowedStates = ['nonproduction', 'ready', 'active', 'archived', 'reviewed', 'uploaded', 'signedoff'];

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
    const report = await this.model.findOne({where: {ident: this.ident}});

    // report not found
    if (!report) {
      throw new Error(`Report not found for ident: ${this.ident}`);
    }

    // report found
    this.instance = report;
    return this.instance;
  }

  /**
   * Create new entry in database
   *
   * @param {user} user - Owning user for the report creation event
   * @param {type} type - report type to be created (genomic vs probe)
   * @param {object} options - Report creation options (eg. state: nonproduction, ready, active, archived; expression_matrix: v8, v9)
   *
   * @returns {Promise.<object>} - Returns a new report
   */
  async create(user, type, options) {
    const report = {
      ident: uuidv4(),
      createdBy_id: user.id,
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
    const reportModel = this.model.scope('public');
    // must be bound, see https://www.bcgsc.ca/jira/browse/DEVSU-681
    const result = await reportModel.bind(reportModel).findOne({
      where: {ident: this.instance.ident},
      attributes: {exclude: ['config', 'deletedAt']},
      include: [
        {model: db.models.patientInformation, as: 'patientInformation', attributes: {exclude: ['id', 'deletedAt']}},
        {model: db.models.user.scope('public'), as: 'createdBy'},
        {model: db.models.template.scope('public'), as: 'template'},
        {
          model: db.models.analysis_reports_user,
          as: 'users',
          attributes: {exclude: ['id', 'reportId', 'user_id', 'addedBy_id', 'deletedAt']},
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
    const bound = await db.models.analysis_reports_user.findAll({where: {user_id: boundUser.id, reportId: report.id, role}});
    // Check if the user is already bound in this role
    if (bound.length > 0) {
      throw new Error('The user is already bound in this role');
    }

    // Perform user binding
    // Create analysis reports user
    const result = await db.models.analysis_reports_user.create({
      user_id: boundUser.id,
      reportId: report.id,
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

    return this.public();
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
    const result = await db.models.analysis_reports_user.destroy({where: {reportId: this.instance.id, user_id: unbindUser.id, role}});
    if (result === 0) {
      throw new Error('No binding found');
    }

    return this.public();
  }
}

module.exports = AnalysisReport;
