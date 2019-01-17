'use strict';

// app/routes/loadPog.js
const express = require('express');

const router = express.Router({mergeParams: true});
const db = require(`${process.cwd()}/app/models`);
const ExportDataTables = require(`${process.cwd()}/app/exporters/index`);


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
      res.json(results);
    } catch (error) {
      console.log('Failed to get pog exports', error);
      res.status(500).json({error: {message: 'Unable to get the list of export entries for this POG.', code: 'failedGetPOGDataExportsQuery'}});
    }
  });

// Handle requests for loading POG into DB
router.route('/csv')
  .get(async (req, res) => {
    try {
      const exportEntry = await db.models.POGDataExport.create({pog_id: req.POG.id, user_id: req.user.id});
      const exporter = new ExportDataTables(req.POG, exportEntry);
      const exportResult = await exporter.export();
      // Save Log entry
      exportEntry.log = exportResult.log;
      exportEntry.result = true;
      const result = await exportEntry.save();
      const entry = result.get();
      delete entry.id;
      delete entry.pog_id;
      delete entry.user_id;
      // Send command back
      res.json({command: exportResult.command, export: exportEntry});
    } catch (error) {
      console.log(error);
      res.status(500).json({error: {message: error.message, code: error.code}});
    }
  });


module.exports = router;
