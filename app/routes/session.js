// app/routes/genomic/detailedGenomicAnalysis.js
let express = require('express'),
    ldapAuth = require(process.cwd() + '/app/libs/ldapAuth'),
    router = express.Router({mergeParams: true}),
    db = require(process.cwd() + '/app/models'),
    loader = require(process.cwd() + '/app/loaders/detailedGenomicAnalysis/alterations'),
    bcrypt = require('bcrypt-nodejs'),
    moment = require('moment');
  
// Route for authentication actions
router.route('/')
  .post((req,res,next) => {
  
    // Attempt to authenticate
    if(req.body.username === null || req.body.username === undefined || req.body.password === null || req.body.password === undefined) res.status(400).json({error: {message: 'Insufficient credentials were provided for authentication', code: 'invalidCredentials'}});
    
    // Get fields
    let username = req.body.username,
        password = req.body.password;
    
    // Attempt to find username
    db.models.user.findOne({ where: {username: username}}).then(
      (user) => {
      
      if(user === null) return res.status(400).json({error: { message: 'Unable to authenticate the provided credentials', code: 'invalidCredentials'}});
        
        // User found!
        if(user.type === 'local') {
          // Check password hashing
          
          if(bcrypt.compareSync(password, user.password)) {
            
            
            
            // Good auth, create token.
            db.models.userToken.create({ user_id: user.id, userAgent: req.header('user-agent'), expiresAt: moment().add(24, 'hours').format('YYYY-MM-DD HH:mm:ss.SSS Z')}).then(
              (result) => {
                
                res.set('X-token', result.token);
                res.json({
                  ident: user.ident, 
                  username: user.username, 
                  type: user.type,
                  firstName: user.firstName,
                  lastName: user.lastName,
                  email: user.email,
                  access: user.access
                });
                
              },
              (error) => {
                res.status(500).json({error: {message: 'Unable to create user session.', code: 'failedTokenGeneration'}});
              }
            );
            
          } else {
            res.status(400).json({error: { message: 'Unable to authenticate the provided credentials', code: 'invalidCredentials'}});
          }
          
        }
        
        if(user.type === 'ldap') {
          // Auth against local LDAP
        }
        
      },
      (error) => {
        
        res.status(400).json({error: { message: 'Unable to authenticate the provided credentials', code: 'invalidCredentials'}});
        
      }
    );
    
    
  });
router.route('/:all?')
  .delete((req,res,next) => {
    // Delete Token
    token = req.header('Authorization');
    
    if(token === null || token === undefined) return res.status(404).json({error: {message: 'Unable to destroy your session', code: 'noUserTokenSent'}});
    
    // Remove Entry
    db.models.userToken.destroy({ where: {token: token} }).then(
      (result) => {
        res.status(204).send();
      },
      (error) => {
        res.status(500).json({error: {message: 'Unable to destroy your session', code: 'failedUserTokenDestroy'}});
      }
    );
    
    
  });

router.route('/ldapAuth')
  .post((req,res,next) => {

    // Attempt an LDAP Authentication
    ldapAuth.authenticate(req.body.username, req.body.password).then(
      (resp) => {

        res.json({success:true});

      },
      (error) => {

        console.log(error);
        res.status(500).json({success:false});

      }
    );

  });
  
module.exports = router;
