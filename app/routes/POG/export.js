const express = require('express');
const db = require('../../models');
const ExportDataTables = require('../../exporters/index');
const logger = require('../../log');

const router = express.Router({mergeParams: true});


router.route('/all')
  // Get all export entries
  .get(async (req, res) => {
    try {
      const results = await db.models.POGDataExport.findAll({
        where: {pog_id: req.POG.id},
        attributes: {exclude: ['id', 'user_id', 'pog_id']},
        order: [['createdAt', 'DESC']],
        include: [
          {as: 'user', model: db.models.user, attributes: {exclude: ['deletedAt', 'password', 'id', 'jiraToken', 'jiraXsrf']}},
        ],
      });
      return res.json(results);
    } catch (error) {
      logger.error(`Failed to get pog exports ${error}`);
      return res.status(500).json({error: {message: 'Unable to get the list of export entries for this POG.', code: 'failedGetPOGDataExportsQuery'}});
    }
  });

// Handle requests for loading POG into DB
router.route('/csv')
  .get(async (req, res) => {
    let pogExportData;
    let expResult;

    try {
      pogExportData = await db.models.POGDataExport.create({pog_id: req.POG.id, user_id: req.user.id});
    } catch (error) {
      logger.error(`Failed to create POG Data Export ${error}`);
      return res.status(500).json({error: {message: 'Unable to create new data export entry.', code: 'failedPOGDataExportCreate'}});
    }

    const exporter = new ExportDataTables(req.POG, pogExportData);
    try {
      expResult = await exporter.export();
    } catch (error) {
      // Save Log entry
      pogExportData.log = expResult.log;
      pogExportData.result = false;
      pogExportData.save();

      logger.error(`Failed to run exporters ${error}`);
      return res.status(500).json({error: {message: 'Failed to run exporters.', code: 'failedPOGDataExport'}});
    }

    // Save Log entry
    pogExportData.log = expResult.log;
    pogExportData.result = true;
    try {
      const result = await pogExportData.save();
      const entry = result.get();
      delete entry.id;
      delete entry.pog_id;
      delete entry.user_id;

      return res.json({command: expResult.command, export: pogExportData});
    } catch (error) {
      logger.error(`There was an error while trying to save exportEntry ${error}`);
      return res.status(500).json({error: {message: 'Unable to save export results.', code: 'failedUpdatePOGExportEntry'}});
    }
  });

module.exports = router;
