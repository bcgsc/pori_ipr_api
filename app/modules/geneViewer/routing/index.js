const HTTP_STATUS = require('http-status-codes');
const RoutingInterface = require('../../../routes/routingInterface');
const GeneViewer = require('../geneViewer');
const reportMiddleware = require('../../../middleware/analysis_report');
const pogMiddleware = require('../../../middleware/pog');

const logger = require('../../../log');

class GeneViewRouter extends RoutingInterface {
  /**
   * Create and bind routes for Tracking
   *
   * @type {TrackingRouter}
   */
  constructor() {
    super();

    // Register Middleware
    this.router.param('report', reportMiddleware);
    this.router.param('pog', pogMiddleware);

    this.router.get('/:gene', async (req, res) => {
      const viewer = new GeneViewer(req.POG, req.report, req.params.gene);

      try {
        const result = await viewer.getAll();
        return res.json(result);
      } catch (error) {
        logger.error(`There was an error when getting the viewer results ${error}`);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'There was an error when getting the viewer results'}});
      }
    });
  }
}

module.exports = GeneViewRouter;
