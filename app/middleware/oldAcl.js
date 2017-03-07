"use strict";

let _ = require('lodash'),
  router = require('express').Router({mergeParams: true}),
  extend = require('util')._extend,
  db = require(process.cwd() + '/app/models');

let acl = {

  // Groups Container
  _groups: [],      // Groups allowed to view
  _nGroups: [],     // Groups explicitly not allowed
  _isPog: false,    // Is this a POG endpoint? Do we need to check relationship to POG?
  _authReq: true,   // Is the user required to be authenticated?
  _req: {},         // Express Request object
  _res: {},         // Express response object
  _read: ['*'],                                     // Can they read this resource? (Default: true)
  _write: ['superUser','admin'],                    // Can they edit this resource? (Default: false)
  _delete: ['superUser','admin'],                   // Can they remove this resource? (Default: false)
  _pogEdit: ['analyst','reviewer','admin'],         // Default editing state for POGs

  construct: (request, response) => {
    acl._req = request;
    acl._res = response;
    return acl;
  },

  request: (r) => {
    acl._req = r;
    return acl;
  },

  response: (r) => {
    acl._res = r;
    return acl;
  },

  /**
   * List of groups allowed to view this endpoint
   *
   * @param {string} readers
   * @returns {{this}}
   */
  read: (...readers) => {
    acl._read = readers;
    return acl;
  },

  /**
   * List of groups allowed to write at this endpoint
   *
   * @param {string} writers
   * @returns {{this}}
   */
  write: (...writers) => {
    acl._write = writers;
    return acl;
  },

  /**
   * List of groups allowed to delete at this endpoint
   *
   * @param {string} deleters
   * @returns {{this}}
   */
  delete: (...deleters) => {
    acl._delete = deleters;
    return acl;
  },

  /**
   * Explicit list of groups NOT allowed to view this endpoint
   *
   * @param nGroups
   * @returns {{this}}
   */
  notGroups: (...nGroups) => {
    acl._nGroups = nGroups;
    return acl;
  },

  authReq: () => {
    acl._authReq = true;
    return acl;
  },

  isPog: () => {
    acl._isPog = true;
    return acl;
  },


  // Run Check for permission
  check: () => {
    // Track if allowed
    let allowed = false;

    // If any group is allowed
    if(acl._groups.indexOf('*') > -1) allowed = true;

    // Loop over groups and add to simple array
    let userGroups = _.map(acl._req.user.groups, (g) => { return g.name; });

    if(_.intersection(acl._groups, acl._nGroups).length > 0) throw new Error('Group(s) in both allowed and not allowed');

    // Check for access to POG
    if(acl._isPog) {
      // Check this pog for user permissions specific to pog roles

      // Get this users roles for this POG
      let pogRole = [];
      _.forEach(acl._req.POG.POGUsers, (v) => {
        if(v.user.ident == acl._req.user.ident) pogRole.push(v.role);
      });

      // Check if this is a write endpoint
      if(['POST', 'PUT', 'DELETE'].indexOf(acl._req.method) > -1) {
        // Does this user have at least 1 pogRole that is allowed to edit?
        if(_.intersection(pogRole, acl._pogEdit).length > 0) allowed = true;
        if(_.intersection(userGroups, acl._pogEdit).length > 0) allowed = true;
      }

      // If read is not set to allow all, run check for pogRole access
      if(acl._req.method === 'GET' && acl._read.indexOf('*') === -1) {
        console.log('Should be in this GET', acl._read, pogRole);
        // Check for custom read groups
        if(_.intersection(pogRole, acl._read).length > 0) allowed = true;
      }
    }

    // If method is GET and
    if(acl._req.method === 'GET' && acl._read.indexOf('*') > -1) allowed = true;


    // If read is not set to allow all, check for group specified access
    if(acl._req.method === 'GET' && acl._read.indexOf('*') === -1) {
      // Check for custom read groups
      if(_.intersection(userGroups, acl._read).length > 0) allowed = true;
    }

    // Check Explicitly Not Allowed Groups
    let nintersect = _.intersection(acl._nGroups, userGroups);

    // Not allowed groups
    if(nintersect.length > 0) allowed = false; // Disallowed group found

    // Access is not allowed
    if(allowed === false) {
      acl._res.status(403).json({status: false, message: 'You are not authorized to view this resource.'});
      return false;
    }

    // Access is allowed
    if(allowed === true) return true;
  }
};

// Require Active Session Middleware
module.exports = () => { return extend(acl)};