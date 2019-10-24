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
