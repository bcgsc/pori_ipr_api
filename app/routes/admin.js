'use strict';

let changeCase  = require('change-case');
let recursive   = require('recursive-readdir');
let _           = require('lodash');
let router      = require('express').Router({mergeParams: true});

let RouterInterface = require('./routingInterface');


class AdminRouting extends RouterInterface {

  constructor(io) {

    super();

    this.io = io;

    io.on('connect', (socket) => {
      console.log('Socket connected', socket.id);
    });

    // Add router to class
    this.router = router;

    // Add MiddleWare to routing
    this.router.param('POG', require(process.cwd() + '/app/middleware/pog'));  // POG Middleware injection
    this.router.param('report', require(process.cwd() + '/app/middleware/analysis_report')); // Analysis report middleware injection

    // Add Authentication coverage
    this.router.use('(/POG|/POG/*|/user/*|/user|/jira|/knowledgebase|/tracking)', require(process.cwd() + '/app/middleware/auth'));

    // Bind POG Loading
    this.bindRouteFile('/POG/:POGID/load', __dirname + '/load_pog.js');

  }
}

module.exports = AdminRouting;
