"use strict";

let _ = require('lodash'),
  Q = require('q'),
  router = require('express').Router({mergeParams: true}),
  extend = require('util')._extend,
  db = require(process.cwd() + '/app/models');


/**
 * Create ACL object
 *
 * @param request
 * @param response
 * @returns {{read: (function(...[string])), write: (function(...[string])), delete: (function(...[string])), notGroups: (function(...[*])), authReq: (function()), isPog: (function()), check: (function())}}
 * @constructor
 */
function ACL(request, response) {
  this._req = request;   // Express Request object
  this._res = response;  // Express response object
  this._groups = [];     // Groups allowed to view
  this._nGroups = [];    // Groups explicitly not allowed
  this._isPog = false;   // Is this a POG endpoint? Do we need to check relationship to POG?
  this._authReq = true;  // Is the user required to be authenticated?
  this._read = ['*'];                                // Can they read this resource? (Default: true)
  this._write = ['superUser','admin'];               // Can they edit this resource? (Default: false)
  this._delete = ['superUser','admin'];              // Can they remove this resource? (Default: false)
  this._pogEdit =  ['analyst','reviewer','admin'];   // Default editing state for POGs

  return {

    /**
     * List of groups allowed to view this endpoint
     *
     * @param {string} readers
     * @returns {{this}}
     */
    read: (...readers) => {
      this._read = readers;
    },

    /**
     * List of groups allowed to write at this endpoint
     *
     * @param {string} writers
     * @returns {{this}}
     */
    write: (...writers) => {
      this._write = writers;
    },

    /**
     * List of groups allowed to delete at this endpoint
     *
     * @param {string} deleters
     * @returns {{this}}
     */
    delete: (...deleters) => {
      this._delete = deleters;
    },

    /**
     * List of groups allowed to write/edit at this POG endpoint
     *
     * @param {string} deleters
     * @returns {{this}}
     */
    pogEdit: (...editors) => {
      this._pogEdit = editors;
    },

    /**
     * Explicit list of groups NOT allowed to view this endpoint
     *
     * @param nGroups
     * @returns {{this}}
     */
    notGroups: (...nGroups) => {
      this._nGroups = nGroups;
    },

    authReq: () => {
      this._authReq = true;
    },

    isPog: () => {
      this._isPog = true;
    },

    // Get Project Access
    getProjectAccess: () => {
      let deferred = Q.defer();
      let projectAccess = [];

      let accessGroups = ['Full Project Access', 'admin', 'superUser'];
      let userGroups = _.map(this._req.user.groups, 'name');
      let hasAccess = _.intersection(accessGroups, userGroups);

      if(hasAccess.length > 0) { // user has full project access
        db.models.project.findAll().then(
          (projects) => {
            deferred.resolve(projects);
          },
          (err) => {
            console.log(error);
            deferred.reject({status: false, message: 'Unable to retrieve project access', code: "failedProjectPermissionQuery"});
          });
      } else { // user does not have full project access - filter on user_project relation
        deferred.resolve(this._req.user.projects);
      }

      return deferred.promise;
      
    },


    // Run Check for permission
    check: (skipStatus=false) => {
      // Track if allowed
      let allowed = false;

      // If any group is allowed
      if (this._groups.indexOf('*') > -1) allowed = true;

      // Loop over groups and add to simple array
      let userGroups = _.map(this._req.user.groups, (g) => {
        return g.name;
      });

      if (_.intersection(this._groups, this._nGroups).length > 0) throw new Error('Group(s) in both allowed and not allowed');

      // Check for access to POG
      if (this._isPog) {
        // Check this pog for user permissions specific to pog roles

        // Get this users roles for this POG
        let pogRole = [];
        _.forEach(this._req.POG.POGUsers, (v) => {
          if (v.user.ident == this._req.user.ident) pogRole.push(v.role);
        });

        // Check if this is a write endpoint
        if (['POST', 'PUT', 'DELETE'].indexOf(this._req.method) > -1) {
          // Does this user have at least 1 pogRole that is allowed to edit?
          if (_.intersection(pogRole, this._pogEdit).length > 0) allowed = true;
          if (_.intersection(userGroups, this._pogEdit).length > 0) allowed = true;
        }

        // If read is not set to allow all, run check for pogRole access
        if (this._req.method === 'GET' && this._read.indexOf('*') === -1) {
          console.log('Should be in this GET', this._read, pogRole);
          // Check for custom read groups
          if (_.intersection(pogRole, this._read).length > 0) allowed = true;
        }
      }

      // If method is GET and
      if (this._req.method === 'GET' && this._read.indexOf('*') > -1) allowed = true;


      // If read is not set to allow all, check for group specified access
      if (this._req.method === 'GET' && this._read.indexOf('*') === -1) {
        // Check for custom read groups
        if (_.intersection(userGroups, this._read).length > 0) allowed = true;
      }

      // Write Access
      if (['POST', 'PUT', 'DELETE'].indexOf(this._req.method) > -1) {
        if (_.intersection(userGroups, this._write).length > 0) allowed = true;
      }
  
      // Check if everyone is allowed to write to this function
      if (['POST', 'PUT', 'DELETE'].indexOf(this._req.method) > -1 && this._write.indexOf('*') > -1) allowed = true;

      // Check Explicitly Not Allowed Groups
      let nintersect = _.intersection(this._nGroups, userGroups);

      // Not allowed groups
      if (nintersect.length > 0) allowed = false; // Disallowed group found

      // Access is not allowed
      if (allowed === false) {
        if(!skipStatus) this._res.status(403).json({status: false, message: 'You are not authorized to view this resource.'});
        return false;
      }

      // Access is allowed
      if (allowed === true) return true;
    }

  }

}


module.exports = ACL;