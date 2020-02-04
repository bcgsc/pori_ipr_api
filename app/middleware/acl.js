const HTTP_STATUS = require('http-status-codes');
const _ = require('lodash');
const db = require('../models');

class ACL {
  /**
   * Create ACL object
   *
   * @param {object} request - Express request object
   * @param {object} response - Express response object
   * @property {Array.<string>} groups - Groups allowed to view
   * @property {Array.<string>} nGroups - Groups explicitly not allowed
   * @property {boolean} isPog - Is this a POG endpoint? Do we need to check relationship to POG?
   * @property {boolean} authReq - Is the user required to be authenticated?
   * @property {Array.<string>} read - Can they read this resource? (Default: true)
   * @property {Array<string>} write - Can they edit this resource? (Default: false)
   * @property {Array.<string>} delete - Can they remove this resource? (Default: false)
   * @property {Array.<string>} pogEdit - Default editing state for POGs
   */
  constructor(request, response) {
    this.req = request;
    this.res = response;
    this.groups = [];
    this.nGroups = [];
    this.isPog = false;
    this.authReq = true;
    this.read = ['*'];
    this.write = ['manager', 'admin'];
    this.delete = ['manager', 'admin'];
    this.restrictedPogEdit = ['analyst', 'reviewer', 'bioinformatician'];
    this.masterPogEdit = ['manager', 'admin'];
    this.pogEdit = this.restrictedPogEdit.concat(this.masterPogEdit);
  }

  // Get project access
  async getProjectAccess() {
    const accessGroups = ['Full Project Access', 'admin'];
    const userGroups = _.map(this.req.user.groups, 'name');
    const hasAccess = _.intersection(accessGroups, userGroups);

    if (hasAccess.length > 0) { // user has full project access
      return db.models.project.findAll();
    }
    // user does not have full project access - filter on user_project relation
    return this.req.user.projects;
  }

  check(skipStatus = false) {
    // Track if allowed
    let allowed = false;

    // If any group is allowed
    if (this.groups.includes('*')) {
      allowed = true;
    }

    // Loop over groups and add to simple array
    const userGroups = _.map(this.req.user.groups, g => g.name);

    if (_.intersection(this.groups, this.nGroups).length > 0) {
      throw new Error('Group(s) in both allowed and not allowed');
    }

    // Check for access to POG
    if (this.isPog) {
      // Check this pog for user permissions specific to pog roles

      // Get this users roles for this POG
      const pogRole = [];
      _.forEach(this.req.POG.POGUsers, (value) => {
        if (value.user.ident === this.req.user.ident) {
          pogRole.push(value.role);
        }
      });

      // Check if this is a write endpoint
      if (['POST', 'PUT', 'DELETE'].includes(this.req.method)
        && (_.intersection(pogRole, this.pogEdit).length > 0
          || _.intersection(userGroups, this.pogEdit).length > 0)
      ) {
        // Get bound user ids from analysis report
        // *Note: both report user id and request user id need to be of type number
        const [analysisReport] = this.req.POG.analysis_reports;
        const boundUserIds = analysisReport.users.reduce((accum, user) => {
          if (user.user_id) {
            return accum.add(user.user_id);
          }
          return accum;
        }, new Set());

        if (boundUserIds.has(this.req.user.id) || _.intersection(userGroups, this.masterPogEdit).length > 0) {
          allowed = true;
        }
      }

      // If read is not set to allow all, run check for pogRole access
      if (this.req.method === 'GET'
        && !this.read.includes('*')
        && (_.intersection(pogRole, this.read).length > 0)
      ) {
        allowed = true;
      }
    }

    // If method is GET and
    if (this.req.method === 'GET'
      && (this.read.includes('*')
      || _.intersection(userGroups, this.read).length > 0)
    ) {
      allowed = true;
    }

    // Write Access
    if (['POST', 'PUT', 'DELETE'].includes(this.req.method)
      && ((this.write.includes('*')
      || _.intersection(userGroups, this.write).length > 0))
    ) {
      allowed = true;
    }

    // Check Explicitly Not Allowed Groups
    const nintersect = _.intersection(this.nGroups, userGroups);

    // Not allowed groups
    if (nintersect.length > 0) {
      allowed = false; // Disallowed group found
    }

    // Access is not allowed
    if (!allowed) {
      if (!skipStatus) {
        this.res.status(HTTP_STATUS.FORBIDDEN).json({status: false, message: 'You are not authorized to view this resource.'});
      }
      return false;
    }
    // Access is allowed
    return true;
  }

  // Check if the request user is admin
  isAdmin() { return this.req.user.get('groups').some((group) => { return group.name === 'admin'; }); }
}

module.exports = ACL;
