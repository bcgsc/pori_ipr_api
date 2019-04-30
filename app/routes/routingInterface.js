const express = require('express');
const MethodNotAllowed = require('./exceptions/MethodNotAllowed');
const logger = require('../../lib/log');

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
   * Bind a valid Express router object to the current router
   *
   * @param {string} path - Route to use specified middleware
   * @param {object} middleware - Middleware function to use
   *
   * @returns {Router} - Returns the instance of the express router
   */
  bindRouteObject(path, middleware) {
    logger.info(`Route Registered: ${path}`);
    return this.router.use((this.root) ? this.root : path, middleware);
  }

  /**
   * Retrieve prepared router
   *
   * @returns {Router} - Returns the instance of the express router
   */
  getRouter() {
    return this.router;
  }

  /**
   * Register a single route with the router
   *
   * Provided map a URL and method to a handler function
   *
   * @param {string} method - HTTP method such as GET, PUT, POST, and so on, in lowercase
   * @param {string} path - Route to use
   * @param {function} handler - Handler function for endpoint
   *
   * @returns {Router} - Returns the instance of the express router
   */
  registerEndpoint(method, path, handler) {
    if (!this.allowedMethods.includes(method)) {
      throw new MethodNotAllowed(`The requested method: ${method} is not allowed. Allowable methods: ${this.allowedMethods.join(',')}`);
    }

    logger.info(`Route Registered: ${path}`);
    return this.router[method](path, handler);
  }


  /**
   * Binds an Express Route definition
   *
   * Takes in an express Router.route() definition and binds to a provided URl
   *
   * @param {string} path - Route to use
   *
   * @returns {IRoute} - Returns the instance of the route
   */
  registerResource(path) {
    logger.info(`Route Registered: ${path}`);
    return this.router.route(path);
  }

  /**
   * Register Middleware
   *
   * @param {string} name - Name of route parameter
   * @param {function} handler - Handler function that will handle the middleware
   *
   * @returns {Router} - Returns the instance of the express router
   */
  registerMiddleware(name, handler) {
    return this.router.param(name, handler);
  }
}

module.exports = RoutingInterface;
