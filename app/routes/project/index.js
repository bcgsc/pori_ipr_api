"use strict";

// app/routes/project/index.js
let validator = require('validator'),
  express = require('express'),
  router = express.Router({mergeParams: true}),
  acl = require(process.cwd() + '/app/middleware/acl'),
  _ = require('lodash'),
  db = require(process.cwd() + '/app/models');

// Middleware for project resolution
router.param('project', (req,res,next,ident) => {
  // Lookup project!
  let opts = {
    where: {ident: ident},
    attributes: {exclude: ['deletedAt']},
    include: [
      {as:'users', model: db.models.user, attributes: {exclude: ['id','deletedAt','password','access','jiraToken']}},
      {as: 'pogs', model: db.models.POG.scope('public'), }
    ]
  };
  db.models.project.findOne(opts).then(
    (project) => {
      req.project = project;
      next();
    },
    (err) => {
      console.log('SQL Project Lookup Error', err);
      res.status(404).json({error: {message: 'Unable to find the specified project', code: 'failedProjectIdentLookup'}});
    }
  )
});

// Route for getting a project
router.route('/')

// Get All Projects
  .get((req,res,next) => {

    // Access Control
    
    let access = new acl(req, res);
    access.read('admin', 'superUser');
    if(access.check() === false) return;
    
    let opts = {
      order:  [['createdAt', 'desc']],
      attributes: {
        exclude: ['deletedAt', 'id']
      },
      include: [
        { as:'users', model: db.models.user, attributes: {exclude: ['id','deletedAt','password','access','jiraToken', 'jiraXsrf', 'settings', 'user_project']} },
        { as: 'pogs', model: db.models.POG, attributes: {exclude: ['id', 'deletedAt']} }
      ]
    };
    
    db.models.project.findAll(opts)
      .then((projects) => {
        res.json(projects);
      })
      .catch((err) => {
        res.status(500).json({message: 'Unable to retrieve projects'});
        console.log('Unable to retrieve projects', err);
      });

  })
  .post((req,res,next) => {
    // Add new project

    // Validate input
    let required_inputs = ['name'];
    let input_errors = [];

    // Inputs set
    _.forEach(required_inputs, (v) => {
      if(req.body[v] === undefined) {
        input_errors.push({
          input: v,
          message: v + ' is a required input'
        });
      }
    });

    // Check for existing project
    db.models.project.findOne({where: {name: req.body.name, deletedAt: {$not: null}}, paranoid: false}).then(
      (existCheck) => {
        if(existCheck !== null) {
          // Restore!
          db.models.project.update({deletedAt: null}, {paranoid:false,where:{ident: existCheck.ident}, returning: true}).then(
            (project) => {

              let response = project[1][0];

              res.json(response);
            },
            (err) => {
              console.log('Unable to restore project', err);
              res.status(500).json({error: {message: 'Unable to restore existing project', code: 'failedProjectCheckQuery'}});
            }
          )

        }

        if(existCheck === null) {

          if(req.body.name.length < 1) input_errors.push({input: 'name', message: 'name must be set'});

          // Everything looks good, create the account!
          db.models.project.create(req.body).then(
            (resp) => {
              // Account created, send details
              res.json(resp);
            },
            (err) => {
              console.log('Unable to create project', err);
              res.status(500).json({status: false, message: 'Unable to create project.'});
            }
          );
        }
      },
      (err) => {
        console.log('Unable to check for existing project', err);
        res.status(500).json({error: {message: 'unable to check if this project exists', code: 'failedProjectExistsQuery'}});
      }
    );

  });

router.route('/:ident([A-z0-9-]{36})')
  .get((req,res,next) => {
    // Getting project
    return res.json(req.project);
  })

  .put((req,res,next) => {
    // Update project
    let updateBody = {
      name: req.body.name,
    };

    // Attempt project model update
    db.models.project.update(updateBody, { where: {ident: req.body.ident}, limit: 1 }).then(
      (result) => {
        if(typeof result === 'Object') {
          res.json(result);
        } else {
          // Success, get project -- UGH
          let opts = {
            where: {ident: req.body.ident},
            attributes: {exclude: ['id']},
            include: [
              { as:'users', model: db.models.user, attributes: {exclude: ['id','deletedAt','password','access','jiraToken', 'jiraXsrf', 'settings', 'user_project']} },
              { as: 'pogs', model: db.models.POG, attributes: {exclude: ['id', 'deletedAt']} }
            ]
          }
          db.models.project.findOne(opts).then(
            (project) => {
              res.json(project);
            },
            (error) => {
              res.status(500).json({error: { message: 'Unable to retrieve project. Please try again', code: 'failedProjectLookupQuery'}});
            }
          );
        }
      },
      (error) => {
        res.status(500).json({error: { message: 'Unable to update project. Please try again', code: 'failedProjectUpdateQuery'}});
      }
    );
  })
  // Remove a project
  .delete((req,res,next) => {

    // Delete project
    db.models.project.destroy({where: {ident: req.params.ident}, limit:1}).then(
      (resp) => {
        if(resp === null) res.status(400).json({error: {message: 'Unable to remove the requested project', code: 'failedProjectRemove'}});

        res.status(204).send();
      },
      (err) => {
        console.log('SQL Failed Project remove', err);
        res.status(500).json({error: {message: 'Unable to remove the requested project', code: 'failedProjectRemoveQuery'}});
      }
    )

  });

// Project Search
router.route('/search')
  .get((req,res,next) => {
    let query = req.query.query;

    let where = {
      name: {$ilike: '%'+query+'%'}
    };

    db.models.project.findAll({where: where, attributes: {exclude:['deletedAt','id']}}).then(
      (results) => {
        res.json(results);
      },
      (err) => {
        console.log('Error', err);
        res.status(500).json({error: {message: 'Unable to query project search'}});
      }
    )
  });

// User Binding Functions
router.route('/:project([A-z0-9-]{36})/user')
  .get((req,res,next) => {
    // Get Project Users
    res.json(req.project.users);
  })
  .post((req,res,next) => {
    // Add Project User

    // Lookup User
    db.models.user.findOne({where: {ident: req.body.user}, attributes: {exclude: ['deletedAt', 'access','password','jiraToken']}}).then(
      (user) => {
        if(user === null) return res.status(400).json({error: {message: 'Unable to find the supplied user.', code: 'failedUserLookupUserProject'}});

        // Bind User
        db.models.user_project.create({project_id: req.project.id, user_id: user.id}).then(
          (user_project) => {
            let output = {
              ident: user.ident,
              username: user.username,
              type: user.type,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              lastLogin: user.lastLogin,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
              user_project: {
                updatedAt: user_project.updatedAt,
                createdAt: user_project.createdAt,
              }
            };

            res.json(output);
          },
          (err) => {
            console.log('Unable to add user to project.', err);
            res.status(400).json({error: {message: 'Unable to add user to project', code: 'failedUserProjectCreateQuery'}});
          }
        )
      },
      (err) => {
        console.log('Unable to update project', err);
        res.status(400).json({error: {message: 'Unable to update the specified project', code: 'failedUserLookupUserProject'}});
      }
    )

  })
  .delete((req,res,next) => {
    // Remove Project User

    // Lookup User
    db.models.user.findOne({where: {ident: req.body.user}, attributes: {exclude: ['deletedAt', 'access','password','jiraToken']}}).then(
      (user) => {
        if(user === null) return res.status(400).json({error: {message: 'Unable to find the supplied user.', code: 'failedUserLookupUserProject'}});

        // Unbind User
        db.models.user_project.destroy({where: {project_id: req.project.id, user_id: user.id}}).then(
          (user_project) => {
            if(user_project === null) return res.status(400).json({error: {message: 'Unable to remove user from project', code: 'failedUserProjectDestroy'}});
            res.status(204).send();
          },
          (err) => {
            console.log('Unable to remove user from project.', err);
            res.status(400).json({error: {message: 'Unable to remove user from project', code: 'failedGroupMemberRemoveQuery'}});
          }
        )
      },
      (err) => {
        console.log('Unable to update project', err);
        res.status(400).json({error: {message: 'Unable to update the specified project', code: 'failedUserLookupUserProject'}});
      }
    );

  });

// POG Binding Functions
router.route('/:project([A-z0-9-]{36})/pog')
  .get((req,res,next) => {
    // Get Project POGs
    res.json(req.project.pogs);
  })
  .post((req,res,next) => {
    // Add Project POG

    // Lookup POG
    db.models.POG.findOne({where: {ident: req.body.pog}, attributes: {exclude: ['deletedAt', 'access','password','jiraToken']}}).then(
      (pog) => {
        if(pog === null) return res.status(400).json({error: {message: 'Unable to find the supplied pog.', code: 'failedPOGLookupPOGProject'}});

        // Bind POG
        db.models.pog_project.create({project_id: req.project.id, pog_id: pog.id}).then(
          (pog_project) => {
            let output = {
              ident: pog.ident,
              POGID: pog.POGID,
              createdAt: pog.createdAt,
              updatedAt: pog.updatedAt,
              pog_project: {
                updatedAt: pog_project.updatedAt,
                createdAt: pog_project.createdAt,
              }
            };

            res.json(output);
          },
          (err) => {
            console.log('Unable to add pog to project.', err);
            res.status(400).json({error: {message: 'Unable to add pog to project', code: 'failedPOGProjectCreateQuery'}});
          }
        )
      },
      (err) => {
        console.log('Unable to update project', err);
        res.status(400).json({error: {message: 'Unable to update the specified project', code: 'failedPOGLookupPOGProject'}});
      }
    )

  })
  .delete((req,res,next) => {
    // Remove Project POG

    // Lookup POG
    db.models.POG.findOne({where: {ident: req.body.pog}, attributes: {exclude: ['deletedAt']}}).then(
      (pog) => {
        if(pog === null) return res.status(400).json({error: {message: 'Unable to find the supplied pog.', code: 'failedPOGLookupPOGProject'}});

        // Unbind POG
        db.models.pog_project.destroy({where: {project_id: req.project.id, pog_id: pog.id}}).then(
          (pog_project) => {
            if(pog_project === null) return res.status(400).json({error: {message: 'Unable to remove pog from project', code: 'failedPOGProjectDestroy'}});
            res.status(204).send();
          },
          (err) => {
            console.log('Unable to remove pog from project.', err);
            res.status(400).json({error: {message: 'Unable to remove pog from project', code: 'failedGroupMemberRemoveQuery'}});
          }
        )
      },
      (err) => {
        console.log('Unable to update project', err);
        res.status(400).json({error: {message: 'Unable to update the specified project', code: 'failedPOGLookupPOGProject'}});
      }
    );

  });

module.exports = router;