'use strict';

let changeCase        = require('change-case');
let recursive         = require('recursive-readdir');
let _                 = require('lodash');
let router            = require('express').Router({mergeParams: true});
let SocketAuth        = require(process.cwd() + '/app/middleware/socketAuth');
let RouterInterface   = require('./routingInterface');
let db                = require(process.cwd() + '/app/models/');


class Routing extends RouterInterface {

  constructor(io) {

    super();

    this.io = io;
  }
  
  /**
   * Initialize routing
   *
   * @returns {Promise}
   */
  init() {
    
    return new Promise((resolve, eject) => {
      this.ignored = {
        files: ['POG.js', 'session.js', 'user.js', '.svn', 'user'],
        routes: ['loadPog', '.svn'],
      };
  
  
      this.io.on('connect', (socket) => {
        let auth = new SocketAuth(socket, this.io);
        auth.challenge();
    
        console.log('Socket connected', socket.id);
    
      });
      
      this.io.on('disconnect', (socket) => {
        console.log('Socket disconnected', socket.id);
      });
  
      // Add router to class
      this.router = router;
  
      // Add MiddleWare to routing
      this.router.param('POG', require(process.cwd() + '/app/middleware/pog'));  // POG Middleware injection
      this.router.param('report', require(process.cwd() + '/app/middleware/analysis_report')); // Analysis report middleware injection
  
      // Add Authentication coverage
      this.router.use('(/POG|/POG/*|/user/*|/user|/jira|/knowledgebase|/tracking|/reports|/analysis|/analysis_reports)', require(process.cwd() + '/app/middleware/auth'));
  
      // Add Single Routes
      // Setup other routes
      this.bindRouteFile('/POG', __dirname + '/POG');
      this.bindRouteFile('/session', __dirname + '/session');
  
      this.bindRouteFile('/user', __dirname + '/user');
      this.bindRouteFile('/user/group', __dirname + '/user/group');
      this.bindRouteFile('/jira', __dirname + '/jira');
  
      this.bindRouteFile('/POG/:POG/report/:report/history', __dirname + '/dataHistory');
      this.bindRouteFile('/POG/:POG/report/:report/export', __dirname + '/POG/export');
      this.bindRouteFile('/POG/:POG/patientInformation', __dirname + '/patientInformation');
  
      this.bindRouteFile('/reports', __dirname + '/reports');
  
      this.bindRouteFile('/knowledgebase', __dirname + '/knowledgebase');
      
      // Register Get All Projects route
      this.getProjects();
  
      // Get Tracking Routes
      let tracking = require('../modules/tracking/routing');
      let TrackingRoutes = new tracking(this.io);
  
      this.bindRouteObject('/tracking', TrackingRoutes.getRouter());
  
      // Get Notification Routes
      let notification = require('../modules/notification/routing');
      let NotificationRoutes = new notification(this.io);
  
      this.bindRouteObject('/notification', NotificationRoutes.getRouter());
  
  
      // Get Notification Routes
      let GeneViewer = require('../modules/geneViewer/routing');
      let GeneViewerRoutes = new GeneViewer(this.io);
  
      this.bindRouteObject('/POG/:POG/report/:report/geneviewer', GeneViewerRoutes.getRouter());
      
      // Get Notification Routes
      let Analysis = require('../modules/analysis/routing');
      let AnalysisRoutes = new Analysis(this.io);
  
      this.bindRouteObject('/analysis', AnalysisRoutes.getRouter());
  
      // Get Notification Routes
      let RecentReports = require('../modules/recentReports/routing');
      let RecentReportsRoutes = new RecentReports(this.io);
  
      this.bindRouteObject('/analysis_reports/recent/report/', RecentReportsRoutes.getRouter());
  
      // Auto-Build routes
      this.buildRecursiveRoutes().then(
        (result) => {
          resolve();
        }
      )
    });
    
  }

  /**
   * Automatically map POG endpoints
   *
   */
  buildRecursiveRoutes() {
    return new Promise((resolve, reject) => {
      
      // Recursively include routes
      recursive('./app/routes/POG', (err, files) => {
  
        files.forEach((route) => {
    
          // Remove index file
          if (route === 'app/routes/index.js') return;
          if (route.indexOf('/user/') !== -1) return;
          if (route.indexOf('.svn') !== -1) return; // Must SVN make so many directories?!
          if (this.ignored.files.indexOf(_.last(route.split('/'))) !== -1) return;
    
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
        
        resolve();
      });
      
      
    });
    
  }
  
  /**
   * Get list of available projects
   *
   */
  getProjects() {
    
    this.registerEndpoint('get', '/projects', (req, res) => {
      db.query('SELECT DISTINCT project FROM "POGs"').then(
        (result) => {
          res.json(_.map(result[0], (e) => { return e.project }));
        },
        (err) => {
          res.status(500).json({message: "Unable to retrieve list of projects"});
          console.log(err);
        }
      );
    });
  }
  
}

module.exports = Routing;
