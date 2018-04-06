"use strict";

// app/routes/project/index.js
let validator = require('validator'),
  express = require('express'),
  router = express.Router({mergeParams: true}),
  acl = require(process.cwd() + '/app/middleware/acl'),
  _ = require('lodash'),
  db = require(process.cwd() + '/app/models');

const errors = Object.freeze({
  AccessForbidden: new Error('403 Access denied')
});

// Middleware for project resolution
router.param('project', (req,res,next,ident) => {

  // Check user permission and filter by project
  let access = new acl(req, res);
  access.getProjectAccess().then((projectAccess) => {
    let projects = _.intersection(_.map(projectAccess, 'ident'), [ident]);

    if(projects.length < 1) {
      console.log('ProjectAccessError');
      return reject(errors.AccessForbidden);
    }

    // Lookup project!
    let opts = {
      where: {ident: ident},
      attributes: {exclude: ['deletedAt']},
      include: [
        {as:'users', model: db.models.user, attributes: {exclude: ['id','deletedAt','password','access','jiraToken']}},
        {as: 'pogs', model: db.models.POG.scope('public'), }
      ]
    };
    
    return db.models.project.findOne(opts);

  }).then((project) => {
    req.project = project;
    next();
  }).catch((e) => {
    switch(e) {
      case errors.AccessForbidden:
        res.status(403).json({error: {message: 'You do not have access to view this project', code: 'failedProjectAccessLookup'}});
        break;
      default:
        logger.error('Failed to resolve project', e);
        res.status(500).json(e);
    }
  });
});

// Route for getting a project
router.route('/')

// Get All Projects
  .get((req,res,next) => {

    // Access Control
    let includeOpts = []
    let access = new acl(req, res);
    access.read('admin', 'superUser');

    if(access.check(true) !== false && req.query.admin === 'true') {
      includeOpts.push({ as: 'pogs', model: db.models.POG, attributes: {exclude: ['id', 'deletedAt']} });
      includeOpts.push({ as:'users', model: db.models.user, attributes: {exclude: ['id','deletedAt','password','access','jiraToken', 'jiraXsrf', 'settings', 'user_project']} });
    };

    // getting project access/filter
    access.getProjectAccess().then((projectAccess) => {
      let opts = {
        order:  [['createdAt', 'desc']],
        attributes: {
          exclude: ['deletedAt', 'id']
        },
        include: includeOpts,
        where: {ident: {$in: _.map(projectAccess, 'ident')}}
      };
      
      return db.models.project.findAll(opts);

    }).then((projects) => {
      res.json(projects);
    })
    .catch((err) => {
      res.status(500).json({message: 'Unable to retrieve projects'});
      console.log('Unable to retrieve projects', err);
    });
  })
  .post((req,res,next) => {
    // Add new project

    // Access Control
    let access = new acl(req, res);
    access.read('admin', 'superUser');
    if(access.check() === false) return;

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
    let created = false;
    db.models.project.findOne({where: {name: req.body.name, deletedAt: {$not: null}}, paranoid: false}).then((existingProject) => {
        if(existingProject) {
          // Restore!
          return db.models.project.update({deletedAt: null}, {paranoid:false,where:{ident: existingProject.ident}, returning: true});

        } else {
          created = true;
          if(req.body.name.length < 1) input_errors.push({input: 'name', message: 'name must be set'});
          // Everything looks good, create the account!
          return db.models.project.create(req.body);
        }
      }
    ).then((response) => {
      if(created) res.json(response); // return newly created record
      res.json(response[1][0]); // return restored record
    }).catch((err) => {
      res.status(500).json({message: 'Unable to add project'});
      console.log('Unable to add project', err);
    });

  });

router.route('/:ident([A-z0-9-]{36})')
  .get((req,res,next) => {
    // Getting project

    // Check user permission and filter by project
    let access = new acl(req, res);
    access.getProjectAccess().then((projectAccess) => {
      if(_.includes(_.map(projectAccess, 'ident'), req.project.ident)) return res.json(req.project);

      // if we didn't return a value then user doesn't have access to project
      console.log('ProjectAccessError');
      return reject(errors.AccessForbidden);
    }).catch((e) => {
      switch(e) {
        case errors.AccessForbidden:
          res.status(403).json({error: {message: 'You do not have access to view this project', code: 'failedProjectAccessLookup'}});
          break;
        default:
          logger.error('Failed to resolve project', e);
          res.status(500).json(e);
      }
    });
  })

  .put((req,res,next) => {

    // Access Control
    let access = new acl(req, res);
    access.read('admin', 'superUser');
    if(access.check() === false) return;

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
    // Access Control
    let access = new acl(req, res);
    access.read('admin', 'superUser');
    if(access.check() === false) return;

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
        // Check user permission and filter by project
        let access = new acl(req, res);
        access.getProjectAccess().then(
          (projectAccess) => {
            let filteredResults = _.map(results, function(p) {
              if(_.includes(_.map(projectAccess, 'ident'), p.ident)) return p;
            });

            res.json(filteredResults);
          },
          (err) => {
            res.status(500).json({error: {message: err.message, code: err.code}});
          }
        );
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
    // Access Control
    let access = new acl(req, res);
    access.read('admin', 'superUser');
    if(access.check() === false) return;

    // Get Project Users
    res.json(req.project.users);
  })
  .post((req,res,next) => {
    // Add Project User

    // Access Control
    let access = new acl(req, res);
    access.read('admin', 'superUser');
    if(access.check() === false) return;

    // Lookup User
    db.models.user.findOne({where: {ident: req.body.user}, attributes: {exclude: ['deletedAt', 'access','password','jiraToken']}}).then(
      (user) => {
        if(user === null) return res.status(400).json({error: {message: 'Unable to find the supplied user.', code: 'failedUserLookupUserProject'}});

        // See if binding already exists
        db.models.user_project.findOne({paranoid: false, where: {user_id: user.id, project_id: req.project.id, deletedAt: {$ne: null} }}).then(
          (hasBinding) => {
            if(hasBinding) { // exists - set deletedAt to null
              db.models.user_project.update({deletedAt: null}, {paranoid:false, where:{id: hasBinding.id}, returning: true}).then(
                (user_project) => {
                  let response = user; //user_project[1][0];
                  res.json(response);
                },
                (err) => {
                  console.log('Unable to restore user project binding', err);
                  res.status(500).json({error: {message: 'Unable to restore existing user project binding', code: 'failedUserProjectRestore'}});
                }
              );
            } else { // doesn't exist - create new binding
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
                  res.status(400).json({error: {message: 'Unable to add user to project', code: 'failedUserProjectCreate'}});
                }
              );
            }
          },
          (err) => {
            console.log('Unable to query for existing user project binding.', err);
            res.status(400).json({error: {message: 'Unable to add user to project', code: 'failedUserProjectBindingQuery'}});
          }
        );

        
      },
      (err) => {
        console.log('Unable to update project', err);
        res.status(400).json({error: {message: 'Unable to update the specified project', code: 'failedUserLookupUserProject'}});
      }
    )

  })
  .delete((req,res,next) => {
    // Remove Project User

    // Access Control
    let access = new acl(req, res);
    access.read('admin', 'superUser');
    if(access.check() === false) return;

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
    // Access Control
    let access = new acl(req, res);
    access.read('admin', 'superUser');
    if(access.check() === false) return;

    // Get Project POGs
    res.json(req.project.pogs);
  })
  .post((req,res,next) => {
    // Add Project POG

    // Access Control
    let access = new acl(req, res);
    access.read('admin', 'superUser');
    if(access.check() === false) return;

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

    // Access Control
    let access = new acl(req, res);
    access.read('admin', 'superUser');
    if(access.check() === false) return;

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