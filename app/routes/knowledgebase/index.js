const router = require('express').Router({mergeParams: true});
const db = require('../../models');
const KbExport = require('../../exporters/knowledgebase');
const loader = require('../../loaders/knowledgebase');
const Acl = require('../../middleware/acl');

const kbControlled = require('../../../config/kbControlled.json');
const diseaseJSON = require('../../../database/disease.json');

const {logger} = process;

router.use('/validate', require('./validate'));
router.use('/genevar', require('./genevar'));

router.route('/import')
  .post(async (req, res) => {
    const {directory, references, events} = req.body;

    if (!directory) {
      return res.status(400).json({message: 'A directory value is required to be sent in the body'});
    }

    if (!events && !references) {
      return res.status(400).json({message: 'At least one of: an events filename or references filename is required in the body'});
    }

    const opts = {directory};

    if (events) {
      opts.events = events;
    }
    if (references) {
      opts.references = references;
    }

    try {
      await loader(opts);
      return res.json({success: true});
    } catch (error) {
      logger.error('Unable to run KB loader', error);
      return res.status(500).json({error: {message: 'Unable to run the KB Import/loader.'}});
    }
  });

router.route('/controlled-vocabulary')
  .get((req, res) => {
    return res.json(kbControlled);
  });

router.route('/disease-ontology')
  .get((req, res) => {
    // Add to GenVar list
    const dataFound = diseaseJSON.filter((entry) => {
      return entry.toLowerCase().includes(req.query.query.toLowerCase());
    });

    return res.json(dataFound);
  });

// History Metrics Query
// select user_id, COUNT(distinct kb_histories.ident) AS "numberOfEntries" from kb_histories GROUP BY user_id;
router.route('/history')
  .get(async (req, res) => {
    let model;
    // set model from type
    if (req.query.type === 'reference') {
      model = 'kb_references';
    } else if (req.query.type === 'event') {
      model = 'kb_events';
    }

    // Get Events by ident
    try {
      const result = await db.models.kb_history.findAll({
        where: {table: model, entry: req.query.entry},
        attributes: {exclude: ['id', 'user_id']},
        order: [['createdAt', 'DESC']],
        include: [
          {model: db.models.user, as: 'user', attributes: {exclude: ['id', 'password', 'jiraXsrf']}},
        ],
      });
      return res.status(200).json(result);
    } catch (error) {
      logger.error('Unable to retrieve history entries', error);
      return res.status(500).json({error: {message: 'Unable to retrieve entry\'s history.'}});
    }
  });

router.route('/metrics')
  .get(async (req, res) => {
    const access = new Acl(req, res);
    access.nGroups = ['Clinician', 'Collaborator'];
    const externalMode = !access.check(true);

    let query = `select count(kb_references.id) as "refTotal", \
    sum(case when kb_references.status = 'REVIEWED' then 1 else 0 end) as "refReviewed", \
    sum(case when kb_references.status = 'NEW' then 1 else 0 end) as "refNew", \
    sum(case when kb_references.status = 'interim' then 1 else 0 end) as "refInterim", \
    sum(case when kb_references.status = 'REQUIRES-REVIEW' then 1 else 0 end) as "refRequiresReview", \
    sum(case when kb_references.status = 'FLAGGED-INCORRECT' then 1 else 0 end) as "refFlaggedIncorrect", \
    count(kb_events.id) as "evTotal", \
    sum(case when kb_events.status = 'APPROVED' then 1 else 0 end) as "evApproved", \
    sum(case when kb_events.status = 'NEW' then 1 else 0 end) as "evNew", \
    sum(case when kb_events.status = 'REQUIRES-REVIEW' then 1 else 0 end) as "evRequiresReview", \
    sum(case when kb_events.status = 'FLAGGED-INCORRECT' then 1 else 0 end) as "evFlaggedIncorrect" \
    from kb_references full outer join kb_events on (kb_references.ident = kb_events.ident and kb_events."deletedAt" is null) \
    where kb_references."deletedAt" is null `;

    if (externalMode) {
      // filter references by source (ref_id) if being accessed by external user
      // TODO: to be replaced by another filtering mechanism in the future since this doesn't account for new sources that cannot be shared
      const filterReferenceSources = ['%archerdx%', '%quiver.archer%', '%foundationone%', '%clearityfoundation%', '%mycancergenome%', '%thermofisher%', 'IBM', '%pct.mdanderson%', '%nccn%'];

      let kbFilter = '';
      for (let i = filterReferenceSources.length - 1; i >= 0; i--) {
        kbFilter += `kb_references.ref_id not ilike '${filterReferenceSources[i]}'`;
        if (i !== 0) {
          kbFilter += ' and ';
        }
      }

      query += `and ${kbFilter}`;
    }

    query += ';';

    try {
      // Get Metrics
      const results = await db.query(
        query,
        {type: db.QueryTypes.SELECT}
      );
      return res.json(results[0]);
    } catch (error) {
      logger.error(error);
      return res.status(500).json({error: {message: 'Unable to retrieve Knowledgebase metrics'}});
    }
  });

router.route('/export')
  .get(async (req, res) => {
    let today = new Date();
    let dd = today.getDate();
    let mm = today.getMonth() + 1; // January is 0!
    const yyyy = today.getFullYear();

    if (dd < 10) {
      dd = `0${dd}`;
    }

    if (mm < 10) {
      mm = `0${mm}`;
    }

    today = `${yyyy}-${mm}-${dd}`;

    // If no specified export path, export to temp folder in current IPR admin's home directory
    const exportPath = req.query.path || `/home/nmartin/temp/${today}`;
    const {version} = req.query;

    // return error if no version specified
    if (!version) {
      logger.error('No KB version specified for export');
      return res.status(400).json({error: {message: 'Please specify a KB version for export'}});
    }
    // return error if version format is incorrect (expected 3 numbers delimited by periods e.g. '1.2.3')
    if (!version.match(/^\d+.\d+.\d+$/)) {
      logger.error('KB version not formatted correctly');
      return res.status(400).json({error: {message: 'KB version must be formatted as 3 numbers delimited by periods e.g. "1.2.3"'}});
    }

    // Generate output TSVs
    const exportEvent = new KbExport(version, {output: exportPath});

    try {
      const result = await exportEvent.export();
      logger.info(`KB Exported to ${exportPath}`);
      logger.info(`KB Export Result ${result}`);
      return res.json({result: `KB successfully exported to ${exportPath}`});
    } catch (error) {
      logger.error(error);
      return res.status(500).json({error: {message: 'Unable to perform export'}});
    }
  });

router.use('/events', require('./events'));
router.use('/references', require('./references'));

module.exports = router;
