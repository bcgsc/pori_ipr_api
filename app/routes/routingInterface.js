"use strict";

const MethodNotAllowed    = require('./exceptions/MethodNotAllowed');
const _                   = require('lodash');

/**
 *
 * Routing Interface Class
 *
 * Scaffold to be extended by a routing file
 *
 * @type {RoutingInterface}
 */
module.exports = class RoutingInterface {

  /**
   * Constructor
   *
   * Invokes and sets up parent constructor
   *
   */
  constructor() {
    // Add router to class
    this.router = require('express').Router({mergeParams: true});
    this.root = null;
    this.allowedMethods = ['get', 'put', 'post', 'delete'];
  }

  /**
   * Bind a file
   *
   * Binds a file at a given namespace to a valid Express router instance that is returned from importing a file
   *
   * @param binding
   * @param file
   */
  bindRouteFile(binding, file) {
    console.log('Route Registered: ', binding);

    this.router.use((this.root) ? this.root : "" + binding, require(file));
  }

  /**
   * Bind a valid Express router object to the current router
   *
   * @param binding
   * @param router
   */
  bindRouteObject(binding, router) {
    console.log('Route Registered: ', binding);

    this.router.use((this.root) ? this.root : "" + binding, router);
  }

  /**
   * Retrieve prepared router
   *
   * @returns {*}
   */
  getRouter() {
    return this.router;
  }

  /**
   * Register a single route with the router
   *
   * Provided map a URL and method to a handler function
   *
   * @param method
   * @param url
   * @param handle
   */
  registerEndpoint(method, url, handle) {

    if(this.allowedMethods.indexOf(method) === -1) throw new MethodNotAllowed('The requested method: ' + method + ' is not allowed. Allowable methods: ' + _.join(this.allowedMethods, ','));


    console.log('Route Registered: ', url);

    this.router[method](url, handle);
  }


  /**
   * Binds an Express Route definition
   *
   * Takes in an express Router.route() definition and binds to a provided URl
   *
   * @param url
   * @param handle
   */
  registerResource(url, handle) {

    console.log('Route Registered: ', url);

    return this.router.route(url)

  }

  /**
   * Register Middleware
   *
   * @param {string} parameter - Parameter to bind the middleware too
   * @param {function} handler - The function that will handle the middleware
   */
  registerMiddleware(parameter, handler) {

    this.router.param(parameter, handler);

  }

};