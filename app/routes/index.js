'use strict';

let changeCase  = require('change-case');
let recursive   = require('recursive-readdir');
let _           = require('lodash');
let router      = require('express').Router({mergeParams: true});

let RouterInterface = require('./routingInterface');


class Routing extends RouterInterface {

  constructor(io) {

    super();

    this.io = io;

    this.ignored = {
      files: ['POG.js', 'session.js', 'user.js', '.svn', 'user'],
      routes: ['loadPog', '.svn'],
    };

    io.on('connect', (socket) => {
      console.log('Socket connected', socket.id);

    });

    // Add router to class
    this.router = router;

    // Add MiddleWare to routing
    this.router.param('POG', require(process.cwd() + '/app/middleware/pog'));  // POG Middleware injection
    this.router.param('report', require(process.cwd() + '/app/middleware/analysis_report')); // Analysis report middleware injection

    // Add Authentication coverage
    this.router.use('(/POG|/POG/*|/user/*|/user|/jira|/knowledgebase)', require(process.cwd() + '/app/middleware/auth'));

    // Auto-Build routes
    this.buildRecursiveRoutes();

    // Add Single Routes
    // Setup other routes
    this.bindRouteFile('/POG', __dirname + '/POG');
    this.bindRouteFile('/session', __dirname + '/session');

    this.bindRouteFile('/user', __dirname + '/user');
    this.bindRouteFile('/user/group', __dirname + '/user/group');
    this.bindRouteFile('/jira', __dirname + '/jira');

    this.bindRouteFile('/POG/:POG/history', __dirname + '/dataHistory');
    this.bindRouteFile('/POG/:POG/export', __dirname + '/POG/export');
    this.bindRouteFile('/POG/:POG/patientInformation', __dirname + '/patientInformation');
    this.bindRouteFile('/POG/:POGID/load', __dirname + '/load_pog.js');

    this.bindRouteFile('/reports', __dirname + '/reports');

    this.bindRouteFile('/knowledgebase', __dirname + '/knowledgebase');

    // Get Tracking Routes
    let tracking = require('../modules/tracking/routing');
    let TrackingRoutes = new tracking(io);

    this.bindRouteObject('/tracking', TrackingRoutes.getRouter());

  }

  /**
   * Automatically map POG endpoints
   *
   */
  buildRecursiveRoutes() {

    // Recursively include routes
    recursive('./app/routes/POG', (err, files) => {

      files.forEach((route) => {

        // Remove index file
        if(route === 'app/routes/index.js') return;
        if(route.indexOf('/user/') !== -1) return;
        if(route.indexOf('.svn') !== -1) return; // Must SVN make so many directories?!
        if(this.ignored.files.indexOf(_.last(route.split('/'))) !== -1) return;

        // Remove first two directories of path
        route = route.replace(/(app\/routes\/POG\/)/g, '').replace(/(.js)/g, '').split('/');

        // Create routeName Object
        let routeName = {
          file: _.pullAt(route, [route.length - 1]),
          path: (route.length === 0) ? '' : (_.join(route, '/')) + '/'
        };

        //Initialize the route to add its func
        let module = require('./POG/' + routeName.path + routeName.file);

        // Add router to specified route name in the app
        this.bindRouteObject('/POG/:POG/report/:report/' + routeName.path + ((routeName.file[0] === 'index') ? '' : routeName.file), module);

      });
    });

  }

}

module.exports = Routing;
