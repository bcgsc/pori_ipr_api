const db = require('../../../models');

const RoutingInterface = require('../../../routes/routingInterface');
const StateDefinition = require('../definition');
const definitionMiddleware = require('../middleware/definition');

const logger = require('../../../../lib/log');

class TrackingDefinitionRoute extends RoutingInterface {
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
    this.registerMiddleware('definition', definitionMiddleware);

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
      .post(async (req, res) => {
        // Create new definition entry
        const entry = new StateDefinition(req.body);

        let result;
        // Add entries
        try {
          await entry.updateTasks(req.body.tasks);
          result = await entry.instance.save.bind(entry.instance);
        } catch (error) {
          logger.error(`Error while creating tracking state definition ${error}`);
          return res.status(500).json({error: {message: 'Error while creating tracking state definitions', cause: error}, exception: error.constructor.name});
        }

        try {
          const definition = await db.models.tracking_state_definition.scope('public').findOne({where: {ident: result.ident}});
          return res.status(201).json(definition);
        } catch (error) {
          logger.error(`Entry created, but failed to retrieve after being created ${error}`);
          return res.status(500).json({error: {message: 'Entry created, but failed to retrieve after being created', cause: error}});
        }
      })

      // Get all state definitions
      .get(async (req, res) => {
        const opts = {
          where: {},
        };

        opts.where = (req.query.hidden && req.query.hidden === 'true') ? {} : {hidden: false};

        if (req.query.slug) {
          opts.where.slug = {$in: req.query.slug.split(',')};
        }

        // Get All Definitions
        try {
          const definitions = await db.models.tracking_state_definition.scope('public').findAll(opts);
          return res.json(definitions);
        } catch (error) {
          logger.error(`Unable to query definitions ${error}`);
          return res.status(500).json({error: {message: 'Unable to query definitions', cause: error}});
        }
      });
  }

  definitionPath() {
    this.registerResource('/:definition([A-z0-9-]{36})')

      // Delete definition
      .delete(async (req, res) => {
        try {
          await req.definition.destroy();
          return res.status(204);
        } catch (error) {
          logger.error(`Unable to delete definition ${error}`);
          return res.status(500).json({error: {message: 'Unable to delete definition', cause: error}});
        }
      })

      // Get current definition
      .get((req, res) => {
        const {id, ...definition} = req.definition.toJSON();
        return res.json(definition);
      })

      // Update definition
      .put(async (req, res) => {
        // Create object
        const existing = new StateDefinition(req.definition);

        existing.setUnprotected(req.body);

        // Update values
        try {
          await existing.updateGroup(req.body.group.ident);
        } catch (error) {
          logger.error(`Failed query to update group ${error}`);
          return res.status(500).json({message: 'Failed query to update group.', cause: error});
        }

        // Update Tasks & save
        try {
          const updatedTask = await existing.updateTasks(req.body.tasks, true);
          const {id, group_id, ...response} = updatedTask.toJSON();
          return res.json(response);
        } catch (error) {
          logger.error(`Failed query to update definitions ${error}`);
          return res.status(500).json({message: 'Failed query to update definitions', cause: error});
        }
      });

    this.registerResource('/:slug')
      // Get tracking state definition by slug
      .get(async (req, res) => {
        try {
          const definition = await db.models.tracking_state_definition.scope('public').findOne({where: {slug: req.params.slug}});
          return res.json(definition);
        } catch (error) {
          logger.error(`Unable to find tracking state definition by slug ${error}`);
          return res.status(500).json({message: 'Unable to find tracking state definition by slug', cause: error});
        }
      });
  }

  // User Assignment Workload
  userAssignmentLoad() {
    this.registerEndpoint('get', `/:definition(${this.UUIDregex})/userload`, async (req, res) => {
      // get group members
      const getTotalTasks = `
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
          "tracking_state"."slug" = :slug AND 
          "tracking_state_task"."status" IN ('active', 'pending')
        GROUP BY 
          "tracking_state"."name",
          "tracking_state"."slug",
          "tracking_state"."group_id";
        `;

      let totalTasks;
      try {
        [totalTasks] = await db.query(getTotalTasks, {replacements: {slug: req.definition.slug}, type: db.QueryTypes.SELECT});
      } catch (error) {
        logger.error(`Unable to get total tracking state tasks ${error}`);
        return res.status().json({message: 'Unable to get total tracking state tasks', cause: error});
      }

      if (!totalTasks) {
        const response = {
          users: [],
          state: {
            name: req.definition.name,
            slug: req.definition.slug,
            tasks: 0,
          },
        };
        return res.json(response);
      }

      let users;
      try {
        users = await db.models.userGroupMember.findAll({where: {group_id: totalTasks.group_id}});
      } catch (error) {
        logger.error(`Unable to find all user group members ${error}`);
        return res.status(500).json({message: 'Unable to find all user group members', cause: error});
      }

      if (users.length === 0) {
        const response = {
          users: [],
          state: {
            name: totalTasks.name,
            slug: totalTasks.slug,
            tasks: parseInt(totalTasks.tasks, 10),
          },
        };

        return res.json(response);
      }

      const usersList = users.map((user) => {
        return user.user_id;
      });

      const query = `
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
                  "tracking_state_task"."state_id" in (SELECT id FROM "pog_tracking_states" as s WHERE s.slug = :slug AND s.status NOT IN ('failed','completed') AND "deletedAt" IS null) AND
                  "tracking_state_task"."status" NOT IN ('failed', 'complete')
                WHERE
                  "user"."id" IN (:usersList)
                GROUP BY
                  "user"."firstName",
                  "user"."lastName",
                  "user"."ident",
                  "user"."email"
                ORDER BY "user"."firstName" ASC;
                `;

      let results;
      try {
        results = await db.query(query, {replacements: {slug: req.definition.slug, usersList}, type: db.QueryTypes.SELECT});
      } catch (error) {
        logger.error(`Unable to get user assigned tasks ${error}`);
        return res.status(500).json({message: 'Unable to get user assigned tasks', cause: error});
      }

      const userCounts = results.map((result) => {
        return {
          user: {
            firstName: result['user.firstName'],
            lastName: result['user.lastName'],
            ident: result['user.ident'],
            email: result['user.email'],
            assignedTasks: parseInt(result['user.assignedTasks'], 10),
          },
        };
      });

      const response = {
        users: userCounts,
        state: {
          name: totalTasks.name,
          slug: totalTasks.slug,
          tasks: parseInt(totalTasks.tasks, 10),
        },
      };

      return res.json(response);
    });
  }
}

module.exports = TrackingDefinitionRoute;
