"use strict";

const db = require(process.cwd() + "/app/models");
const _ = require('lodash');

module.exports = class analysis_report {

  /**
   * Construct Report
   *
   * @param {string} ident - identification string
   */
  constructor(ident=null) {
    this.ident = ident; // Store POGID
    this.instance = null;
    this.model = db.models.analysis_report;
    this.allowedStates = ['nonproduction', 'ready', 'active', 'presented', 'archived', 'reviewed', 'uploaded', 'signedoff'];

    if(typeof ident === 'object' && ident !== null && ident.ident) this.instance = ident;
  }

  /**
   * Retrieve entry from database
   *
   * @returns {promise|object} - Resolves with database instance of model
   */
  retrieve(options) {
    return new Promise((resolve, reject) => {

      // Return cached object
      if(this.instance) resolve(this.instance);

      // Lookup in Database
      this.model.findOne({ where: {ident: this.ident }, include: {model: db.models.pog, as: 'pog'} })
        .then((report) => {

          // POG not found
          if(report === null) {
            return resolve(null);
          }

          // POG found
          if(report !== null) {
            this.instance = report;
            resolve(this.instance);
          }
        })
        .catch((err) => {
          // Unable to find POG
          reject({message: 'Unable to query database.', status: 500, error: err});
        });
    });
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
   * @returns {promise|object} - Promise resolves with new POG Analysis Report. Rejects with error message.
   */
  create(pog, analysis, user, type, options) {

    return new Promise((resolve, reject) => {

      if(!options.analysis && !analysis.id) return reject({message: 'No analysis entry on pog object or analysis object passed'});

      let report = {};
      report.ident = this.makeReportIdent();
      report.createdBy_id = user.id;
      report.type = type;
      report.pog_id = pog.id;
      report.analysis_id = analysis.id;
      if(options.expression_matrix) report.expression_matrix = options.expression_matrix;
      if(options.state &&  this.allowedStates.indexOf(options.state) !== -1) report.state = options.state;

      this.model.create(report)
        .then((report) => {
            this.instance = report;
            this.ident = report.ident;
            resolve(report);
          },
          (err) => {
            console.log(err);
            reject({error: {message: 'failed to create analysis report: ' + err.message}});
          })
        .catch((err) => {
          // Unable to create POG
          console.log('Failed to create the POG Analysis Report', err);
          reject({message: 'Unable to create POG Analysis Report', status: 500, error: err});
        });
    });
  }

  /**
   * Get public facing instance
   *
   * @returns {promise|object} - Resolves with a public-safe object
   */
  public() {
    return new Promise((resolve, reject) => {

      this.model.scope('public').findOne({
        where: {ident: this.instance.ident},
        attributes: {exclude: ['deletedAt']},
        include: [
          {model: db.models.patientInformation, as: 'patientInformation', attributes: { exclude: ['id', 'deletedAt', 'pog_id'] } },
          {model: db.models.tumourAnalysis.scope('public'), as: 'tumourAnalysis' },
          {model: db.models.POG.scope('public'), as: 'pog' },
          {model: db.models.user.scope('public'), as: 'createdBy'},
          {model: db.models.analysis_reports_user, as: 'users', attributes: {exclude: ['id', 'pog_id', 'report_id', 'user_id', 'addedBy_id', 'deletedAt']}, include: [{model: db.models.user.scope('public'), as: 'user'}]}
        ],
      }).then(
        (result) => {
          if(result === null) return reject({message: 'Instance not found.'});
          resolve(result);
        },
        (err) => {
          console.log('Failed to get public form of analysis report', err);
          reject({message: "Failed to retrieve public form of report: " + err.message});
        }
      )
    });
  }


  /**
   * Bind a user to this report
   *
   * @param {object|string} user - User object or ident
   * @param {string} role - User role wrt this report
   * @param {object} addedBy - User model instance of user performing the binding
   *
   * @returns {Promise} - Resolves with updated instance
   */
  bindUser(user, role, addedBy) {

    let report = this.instance;
    return new Promise((resolve, reject) => {

      // Get user if string
      let getUser = () => {
        return new Promise((resolve, reject) => {

          if(typeof user !== 'string' && user.id) return resolve(user);
          if(typeof user !== 'string' && !user.id && user.ident) user = user.ident;

          // Nothing we can do for you. No way to identify this user
          if(typeof user !== 'string' && !user.id && !user.ident) return reject({message: 'user provided is not valid', code: 'invalidUserForBinding'});

          let opts = { where: {} };

          if(user.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/)) {
            opts.where.ident = user;
          } else {
            opts.where.username = user;
          }

          db.models.user.findOne(opts).then(
            (result) => {
              if(user !== null) return resolve(result);
              reject({message: 'Specified user not found', code: 'userNotFound'});
            },
            (err) => {
              console.log('Unable to find user for binding:', err);
              reject({message: 'Unable to find the specified user', code: 'userNotFound', cause: err.message});
            }
          )
        });
      };

      // Check if the attempting user is already bound in this role
      let checkUserBound = (user) => {
        return new Promise((resolve, reject) => {

          db.models.analysis_reports_user.findAll({where: {user_id: user.id, report_id: report.id, role: role}}).then(
            (result) => {
              if(result.length > 0) return reject({message: 'User is already bound in this role.', code: 'userAlreadyBound'});
              resolve(user);
            },
            (err) => {
              console.log('Unable to find user for binding:', err);
              reject({message: 'Unable to find the specified user', code: 'userNotFound', cause: err.message});
            }
          )

        });
      };

      // Perform user binding
      let bindUser = (user) => {
        return new Promise((resolve, reject) => {

          db.models.analysis_reports_user.create({
            user_id: user.id,
            report_id: report.id,
            role: role,
            addedBy_id: addedBy.id
          }).then(
            (result) => {
              result.user = {
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                ident: user.ident,
                username: user.username
              };
              resolve(result);
            },
            (err) => {
              console.log('Unable to create user binding:', err);
              reject({message: 'Unable to create user binding', code: 'failedUserBindCreate', cause: err.message});
            }
          );

        });
      };

      // Proceed after getting user
      getUser(user)
        .then(checkUserBound)
        .then(bindUser)
        .then(this.public.bind(this))
        .then(
          (report) => {
            resolve(report);
          },
          (err) => {
            console.log('Failed user binding pipe', err);
            reject(err);
          }
        )
    });
  }

  /**
   * Unbind a user from an association with the report
   *
   * @param {object|string} user - User object or ident
   * @param {string} role - User role wrt this report
   *
   * @returns {Promise}
   */
  unbindUser(user, role) {
    return new Promise((resolve, reject) => {

      // Get user if string
      let getUser = () => {
        return new Promise((resolve, reject) => {

          if(typeof user !== 'string' && user.id) return resolve(user);
          if(typeof user !== 'string' && !user.id && user.ident) user = user.ident;

          // Nothing we can do for you. No way to identify this user
          if(typeof user !== 'string' && !user.id && !user.ident) return reject({message: 'user provided is not valid', code: 'invalidUserForBinding'});

          let opts = { where: {} };

          if(user.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/)) {
            opts.where.ident = user;
          } else {
            opts.where.username = user;
          }

          db.models.user.findOne(opts).then(
            (result) => {
              if(user !== null) return resolve(result);
              reject({message: 'Specified user not found', code: 'userNotFound'});
            },
            (err) => {
              console.log('Unable to find user for binding:', err);
              reject({message: 'Unable to find the specified user', code: 'userNotFound', cause: err.message});
            }
          )
        });
      };

      // Remove binding from DB (soft-delete)
      let destroyBinding = (user) => {
        return new Promise((resolve, reject) => {
          db.models.analysis_reports_user.destroy({where: {report_id: this.instance.id, user_id: user.id, role: role}}).then(
            (result) => {
              if(result === 0) return reject({message: 'No binding found', code: 'noBindingFound'});
              resolve(true);
            },
            (err) => {
              console.log('Unable to unbind user: ', err);
              reject({message: 'Unable to unbind the specified user', code: 'failedUnbind', cause: err.message});
            }
          )
        })
      };

      getUser(user)
        .then(destroyBinding)
        .then(this.public.bind(this))
        .then(
        (report) => {
          resolve(report);
        },
        (err) => {
          console.log('Failed to unbind the user:', err);
          reject(err);
        }
      )

    })
  }

  /**
   * Create ident string
   *
   * @returns {string}
   */
  makeReportIdent() {
    let ident = "";
    let chars = "ABCDEFGHIJKLMNOPQRSTUVQXYZ0123456789";

    for(let i=0; i < 5; i++) {
      ident += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return ident;
  };


};