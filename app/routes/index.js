let changeCase = require('change-case'),
    recursive = require('recursive-readdir'),
    _ = require('lodash'),
    router = require('express').Router({mergeParams: true}),
    db = require(process.cwd() + '/app/models');
    

'use strict';

// Ignored Routes for POG
let ignored = {
  files: ['POG.js', 'session.js', 'user.js', '.svn', 'user'],
  routes: ['loadPog', '.svn'],
};

// Middleware
router.param('POG', require(process.cwd() + '/app/middleware/pog'));
router.use('(/POG|/POG/*|/user/*|/user|/jira)', require(process.cwd() + '/app/middleware/auth'));

// Retrieve route files
recursive('./app/routes/', (err, files) => {
    
  files.forEach((route) => {

    // Remove index file
    if(route === 'app/routes/index.js') return;
    if(route.indexOf('/user/') !== -1) return;
    if(route.indexOf('.svn') !== -1) return; // Must SVN make so many directories?!
    if(ignored.files.indexOf(_.last(route.split('/'))) !== -1) return;
    
    // Remove first two directories of path
    route = route.replace(/(app\/routes\/)/g, '').replace(/(.js)/g, '').split('/');
    
    // Create routeName Object
    let routeName = {
      file: _.pullAt(route, [route.length - 1]),
      path: (route.length === 0) ? '' : (_.join(route, '/')) + '/'
    }
    
    //Initialize the route to add its func
    let module = require('./' + routeName.path + routeName.file);
    
    // Add router to specified route name in the app
    router.use('/POG/:POG/' + routeName.path + ((routeName.file[0] === 'index') ? '' : routeName.file), module);
    
    console.log('Routing Detected: ', '/POG/:POG/' + routeName.path + ((routeName.file[0] === 'index') ? '' : routeName.file)); 
    
  });
});
  
// Setup other routes
router.use('/POG', require('./POG'));
router.use('/session', require('./session'));
router.use('/user', require('./user/index'));
router.use('/user/group', require('./user/group'));
router.use('/jira', require('./jira'));

module.exports = router;
