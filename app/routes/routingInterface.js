const express = require('express');

/**
 *
 * Routing Interface Class
 *
 * Scaffold to be extended by a routing file
 *
 * @type {RoutingInterface}
 */
class RoutingInterface {
  /**
   * Constructor
   *
   * Invokes and sets up parent constructor
   *
   */
  constructor() {
    this.router = express.Router({mergeParams: true});
    this.root = null;
    this.allowedMethods = ['get', 'put', 'post', 'delete', 'patch'];

    // Static Strings
    this.UUIDregex = '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
  }

  /**
   * Retrieve prepared router
   *
   * @returns {Router} - Returns the instance of the express router
   */
  getRouter() {
    return this.router;
  }
}

module.exports = RoutingInterface;
