"use strict";

const express             = require('express');
const router              = express.Router({mergeParams: true});
const db                  = require(process.cwd() + '/app/models');
const _                   = require('lodash');
const RoutingInterface    = require('../../../routes/routingInterface');
const StateDefinition     = require('../definition');

module.exports = class TrackingDefinitionRoute extends RoutingInterface {

  /**
   * Tracking Definitions Routing
   *
   * POG Tracking State Definitions routes
   *
   * @param {object} io - Socket.io instance
   */
  constructor(io) {
    super();

    this.io = io;

    // Register middleware
    this.registerMiddleware('definition', require('../middleware/definition'));

    // Register root
    this.rootPath();

    // Register Definition endpoint
    this.definitionPath();

    // Task User Loads
    this.userAssignmentLoad();

  }

  // URL Root
  rootPath() {

    this.registerResource('/')
      // Create new state definition
      .post((req,res,next) => {

        // Create new definition entry
        let entry = new StateDefinition(req.body);

        // Add entries
        entry.updateTasks(req.body.tasks)
          .then(entry.instance.save.bind(entry.instance))
          .then(
            (result) => {

              db.models.tracking_state_definition.scope('public').findOne({where: {ident: result.ident}}).then(
                (definition) => {
                  res.status(201).json(definition);
                },
                (err) => {
                  console.log(err);
                  res.status(500).json({error: {message: 'Entry created, but failed to retrieve after being created. '}})
                }
              )

            })
          .catch((e) => {
            res.status(500).json({error: {message: e.message}, exception: e.constructor.name});
          });

      })
      // Get all state definitions
      .get((req,res,next) => {

        let opts = {
          where: {}
        };

        opts.where = (req.query.hidden && req.query.hidden === 'true') ? {} : {hidden: false};

        // Get All Definitions
        db.models.tracking_state_definition.scope('public').findAll(opts).then(
          (definitions) => {
            res.json(definitions);
          },
          (err) => {
            console.log(err);
            res.status(500).json({error: {message: 'Unable to query definitions'}});
          }
        )
      });

  }

  definitionPath() {

    this.registerResource('/:definition([A-z0-9-]{36})')

      // Delete definition
      .delete((req, res) => {
        req.definition.destroy().then(
          (response) => {
            res.status(204);
          }
        )
      })

      // Get current definition
      .get((req, res) => {
        let definition = req.definition.toJSON();
        delete(definition.id);
        res.json(definition);
      })

      // Update definition
      .put((req, res) => {

        // Create object
        let existing = new StateDefinition(req.definition);

        // Update values
        existing.setUnprotected(req.body);

        existing.updateGroup(req.body.group.ident).then(
          (result) => {

            // Update Tasks & save
            existing.updateTasks(req.body.tasks, true).then(
              (result) => {
                let response = result.toJSON();
                delete response.id;
                delete response.group_id;
                res.json(response);
              },
              (err) => {
                console.log(err);
                res.status(500).json({message: 'Failed query to update definitions'});
              }
            )

          },
          (err) => {
            console.log(err);
            res.status(500).json({message: 'Failed query to update group.'});
          }
        );

      });
  }

  /**
   * User Assignment Workload
   */
  userAssignmentLoad() {

    this.registerEndpoint('get', '/:definition('+this.UUIDregex+')/userload', (req, res, next) => {
      // get group members

      let opts = {
        where: {
          slug: req.definition.slug
        },
        includes: [
          {as: 'tasks', model: db.models.tracking_state_task, attributes: { include: [[db.fn('COUNT', db.col('id')), 'total_tasks']] }}
        ]
      };

      let getTotalTasks = `
        SELECT
          "tracking_state"."name" AS "name",
          "tracking_state"."slug" AS "slug",
          "tracking_state"."group_id" AS "group_id",
          COUNT("tracking_state_task"."ident") AS "tasks"
        FROM "pog_tracking_states" AS "tracking_state"
        LEFT JOIN "pog_tracking_state_tasks" AS "tracking_state_task" ON "tracking_state_task".state_id = "tracking_state".id
        WHERE 
          "tracking_state"."deletedAt" IS NULL AND
          "tracking_state_task"."deletedAt" is NULL and
          "tracking_state"."slug" = '${req.definition.slug}' AND 
          "tracking_state_task"."status" IN ('active', 'pending')
        GROUP BY 
          "tracking_state"."name",
          "tracking_state"."slug",
          "tracking_state"."group_id";
        `;

      db.query(getTotalTasks).then(
        (totalTasks) => {
          totalTasks = totalTasks[0][0];

          db.models.userGroupMember.findAll({where: {group_id: totalTasks.group_id}}).then(
            (users) => {

              if(users.length === 0) {

                let response = {
                  users: [],
                  state: {
                    name: totalTasks.name,
                    slug: totalTasks.slug,
                    tasks: parseInt(totalTasks.tasks)
                  }
                };

                res.json(response);

              } else {

                let usersArray = _.join(_.map(users, 'user_id'), ',');

                db.query(`
                SELECT
                  "user"."firstName" AS "user.firstName",
                  "user"."lastName" AS "user.lastName",
                  "user"."ident" AS "user.ident",
                  "user".email AS "user.email",
                  COUNT("tracking_state_task"."ident") AS "user.assignedTasks"
                FROM "users" as "user"
                LEFT JOIN "pog_tracking_state_tasks" AS "tracking_state_task" 
                  ON 
                  "tracking_state_task"."assignedTo_id" = "user".id AND 
                  "tracking_state_task"."state_id" in (SELECT id FROM "pog_tracking_states" as s WHERE s.slug='${req.definition.slug}' AND s.status NOT IN ('failed','completed') AND "deletedAt" IS null) AND
                  "tracking_state_task"."status" NOT IN ('failed', 'complete')
                WHERE
                  "user"."id" IN (${usersArray})
                GROUP BY
                  "user"."firstName",
                  "user"."lastName",
                  "user"."ident",
                  "user"."email"
                ORDER BY "user"."firstName" ASC;
                `).then(
                  (result) => {

                    let userCounts = [];

                    // Process results
                    _.forEach(result[0], (r) => {
                      userCounts.push({
                        user: {
                          firstName: r['user.firstName'],
                          lastName: r['user.lastName'],
                          ident: r['user.ident'],
                          email: r['user.email'],
                          assignedTasks: parseInt(r['user.assignedTasks'])
                        },
                        name: r['tracking_state.name'],
                        slug: r['tracking_state.slug'],
                        ident: r['tracking_state.ident'],
                      })
                    });

                    let response = {
                      users: userCounts,
                      state: {
                        name: totalTasks.name,
                        slug: totalTasks.slug,
                        tasks: parseInt(totalTasks.tasks)
                      }
                    };

                    res.json(response);


                  },
                  (err) => {
                    console.log('Failed to get group task counts', err);
                  }
                )


              }

            },
            (err) => {
              console.log('Failed to get group members', err);
            }
          );
        },
        (err) => {
          console.log(err);
        }
      );

    });

  }
};