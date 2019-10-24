const db = require('../../../models');
const RoutingInterface = require('../../../routes/routingInterface');

const DefinitionRoutes = require('./definition');
const StateRoutes = require('./state');
const TaskRoutes = require('./task');
const TicketTemplateRoutes = require('./ticket_template');
const HookRoutes = require('./hook');
const Generator = require('./../generate');
const POGLib = require('../../../libs/structures/pog');
const Hook = require('../hook');

// Middleware
const analysisMiddleware = require('../../../middleware/analysis');
const definitionMiddleware = require('../middleware/definition');
const stateMiddleware = require('../middleware/state');
const taskMiddleware = require('../middleware/task');

const logger = require('../../../../lib/log');


class TrackingRouter extends RoutingInterface {
  /**
   * Create and bind routes for Tracking
   *
   * @type {TrackingRouter}
   * @param {object} io - Socket.io instance
   */
  constructor(io) {
    super();
    this.io = io;

    // Bind Routes
    const Definitions = new DefinitionRoutes(this.io);
    this.router.use('/definition', Definitions.getRouter());

    // Register Middleware
    this.registerMiddleware('analysis', analysisMiddleware);
    this.registerMiddleware('definition', definitionMiddleware);
    this.registerMiddleware('state', stateMiddleware);
    this.registerMiddleware('task', taskMiddleware);


    const States = new StateRoutes(this.io);
    this.router.use('/state', States.getRouter());

    const Tasks = new TaskRoutes(this.io);
    this.router.use('/task', Tasks.getRouter());

    const TicketTemplate = new TicketTemplateRoutes(this.io);
    this.router.use('/ticket/template', TicketTemplate.getRouter());

    const Hooks = new HookRoutes(this.io);
    this.router.use('/hook', Hooks.getRouter());

    // Enable Generator
    this.generator();

    // Enable Root Racking
    this.tracking(States);

    // Get and run hooks
    this.registerEndpoint('get', '/test/hook/:state/:task', async (req, res) => {
      let hooks;
      try {
        hooks = await Hook.check_hook('bioapps', 'complete', 'bioapps_patient_sync', true);
      } catch (error) {
        logger.error(`Failed to get hooks ${error}`);
        return res.status(500).json({message: 'Failed to get hooks', cause: error});
      }

      try {
        const result = await Promise.all(hooks.map((hook) => {
          return Hook.invoke_hook(hook, req.state, req.task);
        }));
        return res.json({message: 'Sent email', result});
      } catch (error) {
        logger.error(`Failed to run hooks ${error}`);
        return res.status(500).json({message: 'Failed to run hooks', cause: error});
      }
    });
  }

  // Generate Tracking from source
  generator() {
    // Create parent elements, then initiate tracking
    this.registerEndpoint('post', '/', async (req, res) => {
      if (!req.body.POGID) {
        logger.error('POGID is a required input');
        return res.status(400).json({error: {message: 'POGID is a required input', code: 'failedValidation', input: 'POGID'}});
      }

      // Create POG
      const pogLib = new POGLib(req.body.POGID);

      const pogOpts = {
        create: true,
        analysis: false,
      };

      let pog;
      // Retrieve POG from Library
      try {
        pog = await pogLib.retrieve(pogOpts);
      } catch (error) {
        logger.error(`Unable to retrieve POG ${error}`);
        return res.status(500).json({message: 'Unable to retrieve POG', cause: error});
      }

      const data = {
        pog_id: pog.id,
        libraries: {normal: null, tumour: null, transcriptome: null},
        clinical_biopsy: req.body.clinical_biopsy,
        analysis_biopsy: req.body.analysis_biopsy,
        priority: req.body.priority,
        disease: req.body.disease,
        biopsy_notes: req.body.biopsy_notes,
      };

      let analysis;
      // Create POG analysis
      try {
        analysis = await db.models.pog_analysis.create(data);
      } catch (error) {
        logger.error(`Failed to create POG analysis ${error}`);
        return res.status(500).json({message: 'Failed to create POG analysis', cause: error});
      }

      try {
        const generator = await new Generator(pog, analysis, req.user);
        return res.json(generator);
      } catch (error) {
        logger.error(`Failed to generate tracking ${error}`);
        return res.status(500).json({message: 'Failed to generate tracking', cause: error});
      }
    });

    // Generate Tracking Only
    this.registerEndpoint('get', '/POG/:POG/analysis/:analysis([A-z0-9-]{36})/generate', async (req, res) => {
      // Generate Request
      try {
        const generator = await new Generator(req.pog, req.analysis, req.user);
        return res.json(generator);
      } catch (error) {
        logger.error(`Tracking initialization failed ${error}`);
        return res.status(500).json({error: {message: 'Tracking initialization failed', cause: error}});
      }
    });
  }

  // Tracking Home Route
  tracking(stateRouter) {
    // Map to state router function
    this.registerEndpoint('get', '/', stateRouter.getFilteredStates);
  }
}

module.exports = TrackingRouter;
