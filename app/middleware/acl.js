const _ = require('lodash');
const db = require('../models');

class ACL {
  /**
   * Create ACL object
   *
   * @param {object} request - Express request object
   * @param {object} response - Express response object
   */
  constructor(request, response) {
    this._req = request; // Express Request object
    this._res = response; // Express response object
    this._groups = []; // Groups allowed to view
    this._nGroups = []; // Groups explicitly not allowed
    this._isPog = false; // Is this a POG endpoint? Do we need to check relationship to POG?
    this._authReq = true; // Is the user required to be authenticated?
    this._read = ['*']; // Can they read this resource? (Default: true)
    this._write = ['superUser', 'admin']; // Can they edit this resource? (Default: false)
    this._delete = ['superUser', 'admin']; // Can they remove this resource? (Default: false)
    this._pogEdit = ['analyst', 'reviewer', 'admin']; // Default editing state for POGs
  }

  /**
   * Sets the list of groups allowed to view this endpoint
   *
   * @param  {...string} readers - List of groups allowed to view this endpoint
   * @returns {undefined}
   */
  read(...readers) {
    this._read = readers;
  }

  /**
   * Sets the list of groups allowed to write at this endpoint
   *
   * @param  {...string} writers - List of groups allowed to write at this endpoint
   * @returns {undefined}
   */
  write(...writers) {
    this._write = writers;
  }

  /**
   * Sets the list of groups allowed to delete at this endpoint
   *
   * @param  {...string} deleters - List of groups allowed to delete at this endpoint
   * @returns {undefined}
   */
  delete(...deleters) {
    this._delete = deleters;
  }

  /**
   * Sets the list of groups allowed to write/edit at this POG endpoint
   *
   * @param  {...string} editors - List of groups allowed to write/edit at this POG endpoint
   * @returns {undefined}
   */
  pogEdit(...editors) {
    this._pogEdit = editors;
  }

  /**
   * Set the list of groups NOT allowed to view this endpoint
   *
   * @param  {...string} nGroups - Explicit list of groups NOT allowed to view this endpoint
   * @returns {undefined}
   */
  notGroups(...nGroups) {
    this._nGroups = nGroups;
  }

  authReq() {
    this._authReq = true;
  }

  isPog() {
    this._isPog = true;
  }

  // Get project access
  async getProjectAccess() {
    const accessGroups = ['Full Project Access', 'admin', 'superUser'];
    const userGroups = _.map(this._req.user.groups, 'name');
    const hasAccess = _.intersection(accessGroups, userGroups);

    if (hasAccess.length > 0) { // user has full project access
      return db.models.project.findAll();
    }
    // user does not have full project access - filter on user_project relation
    return this._req.user.projects;
  }

  check(skipStatus = false) {
    // Track if allowed
    let allowed = false;

    // If any group is allowed
    if (this._groups.includes('*')) {
      allowed = true;
    }

    // Loop over groups and add to simple array
    const userGroups = _.map(this._req.user.groups, g => g.name);

    if (_.intersection(this._groups, this._nGroups).length > 0) {
      throw new Error('Group(s) in both allowed and not allowed');
    }

    // Check for access to POG
    if (this._isPog) {
      // Check this pog for user permissions specific to pog roles

      // Get this users roles for this POG
      const pogRole = [];
      _.forEach(this._req.POG.POGUsers, (value) => {
        if (value.user.ident === this._req.user.ident) {
          pogRole.push(value.role);
        }
      });

      // Check if this is a write endpoint
      if (['POST', 'PUT', 'DELETE'].includes(this._req.method)
      && (_.intersection(pogRole, this._pogEdit).length > 0
      || _.intersection(userGroups, this._pogEdit).length > 0)) {
        // Does this user have at least 1 pogRole that is allowed to edit?
        allowed = true;
      }

      // If read is not set to allow all, run check for pogRole access
      if (this._req.method === 'GET'
      && !this._read.includes('*')
      && (_.intersection(pogRole, this._read).length > 0)) {
        allowed = true;
      }
    }

    // If method is GET and
    if (this._req.method === 'GET'
    && (this._read.includes('*')
    || _.intersection(userGroups, this._read).length > 0)) {
      allowed = true;
    }

    // Write Access
    if (['POST', 'PUT', 'DELETE'].includes(this._req.method)
    && ((this.write.includes('*')
    || _.intersection(userGroups, this._write).length > 0))) {
      allowed = true;
    }

    // Check Explicitly Not Allowed Groups
    const nintersect = _.intersection(this._nGroups, userGroups);

    // Not allowed groups
    if (nintersect.length > 0) {
      allowed = false; // Disallowed group found
    }

    // Access is not allowed
    if (!allowed) {
      if (!skipStatus) {
        this._res.status(403).json({status: false, message: 'You are not authorized to view this resource.'});
      }
      return false;
    }
    // Access is allowed
    return true;
  }
}

module.exports = ACL;
