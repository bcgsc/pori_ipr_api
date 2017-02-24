"use strict";

// app/routes/genomic/detailedGenomicAnalysis.js
let validator = require('validator'),
    express = require('express'),
    bcrypt = require('bcrypt'),
    router = express.Router({mergeParams: true}),
    db = require(process.cwd() + '/app/models');

// Route for getting a POG
router.route('/')

  // Get current logged in user
  .get((req,res,next) => {
    // Get current user
    res.json(req.user);
     
  })
  .put((req,res,next) => {
    // Update current user
    
    // Check Access
    if(req.body.access !== req.user.access) res.status(400).json({error: { message: 'You are not able to update your own access', code: 'failUpdateAccess'}});
    if(req.body.username !== req.user.username) res.status(400).json({error: { message: 'You are not able to update your username', code: 'failUpdateUsername'}});
    if(req.body.type !== req.user.type) res.status(400).json({error: { message: 'You are not able to update your account type', code: 'failUpdateType'}});
    if(req.body.password && req.body.password.length < 8) res.status(400).json({error: { message: 'Password must be 8 characters or more.', code: 'failUpdateType'}});

    let updateBody = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email
    };

    if(req.body.password && req.body.password.length > 7) updateBody.password = bcrypt.hashSync(req.body.password, 10);
    
    // Attempt user model update
    db.models.user.update(updateBody, { where: {ident: req.user.ident}, limit: 1 }).then(
      (result) => {
        if(typeof result == 'Object') {
          res.json(result);
        } else {
          // Success, get user -- UGH
          db.models.user.findOne({where: {ident: req.user.ident}, attributes: {exclude: ['id', 'password', 'deletedAt']}}).then(
            (user) => {
              res.json(user);
            },
            (error) => {
              res.status(500).json({error: { message: 'Unable to retrieve your account. Please try again', code: 'failedUserLookupQuery'}});
            }
          );
        }
      },
      (error) => {
        res.status(500).json({error: { message: 'Unable to update your account. Please try again', code: 'failedUserUpdateQuery'}});
      }
    );
  });
  
module.exports = router;