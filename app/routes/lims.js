const express = require('express');
const $lims = require('../api/lims');
const logger = require('../../lib/log');

const router = express.Router({mergeParams: true});


router.route('/biological-metadata')
  // Retrieve sample results based on POGID from LIMS
  .post(async (req, res) => {
    if (!req.body.patientIds) {
      logger.error('Must provide patient ids');
      return res.status(400).json({message: 'Must provide patient ids'});
    }

    try {
      let samples;
      if (!req.body.searchField) {
        samples = await $lims.biologicalMetadata(req.body.patientIds);
      } else {
        samples = await $lims.biologicalMetadata(req.body.patientIds, req.body.searchField);
      }
      return res.json(samples);
    } catch (error) {
      logger.error(`Unable to get sample info. from LIMS ${error}`);
      return res.status(500).json({message: 'Unable to get sample info. from LIMS', cause: error});
    }
  });

router.route('/library')
  // Retrieve libraries from LIMS
  .post(async (req, res) => {
    if (!req.body.libraries) {
      logger.error('Must provide library names to query');
      return res.status(400).json({message: 'Must provide library names to query'});
    }

    try {
      const libraries = await $lims.library(req.body.libraries);
      return res.json(libraries);
    } catch (error) {
      logger.error(`Unable to get libraries from LIMS ${error}`);
      return res.status(500).json({message: 'Unable to get libraries from LIMS', cause: error});
    }
  });


router.route('/sequencer-run')
  // Retrieve sequencer-run data from LIMS
  .post(async (req, res) => {
    if (!req.body.libraries) {
      logger.error('Must provide libraries for sequencer-run');
      return res.status(400).json({message: 'Must provide libraries for sequencer-run'});
    }

    try {
      const libraries = await $lims.sequencerRun(req.body.libraries);
      return res.json(libraries);
    } catch (error) {
      logger.error(`Unable to get sequencer runs from LIMS ${error}`);
      return res.status(500).json({message: 'Unable to get sequencer runs from LIMS', cause: error});
    }
  });

router.route('/disease-ontology/:query')
  // Query disease-ontology data in LIMS
  .get(async (req, res) => {
    if (!req.params.query) {
      logger.error('Must provide a query');
      return res.status(400).json({message: 'Must provide a query'});
    }

    try {
      const diseaseOntology = await $lims.diseaseOntology(req.params.query);
      return res.json(diseaseOntology);
    } catch (error) {
      logger.error(`Unable to get disease ontology from LIMS ${error}`);
      return res.status(500).json({message: 'Unable to get disease ontology from LIMS', cause: error});
    }
  });

module.exports = router;
