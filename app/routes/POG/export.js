'use strict';

// app/routes/loadPog.js
const express = require('express');

const router = express.Router({mergeParams: true});
const db = require(`${process.cwd()}/app/models`);
const ExportDataTables = require(`${process.cwd()}/app/exporters/index`);


router.route('/all')
  // Get all export entries
  .get((req, res) => {
    db.models.POGDataExport.findAll({
      where: {pog_id: req.POG.id},
      attributes: {exclude: ['id', 'user_id', 'pog_id']},
      order: [['createdAt', 'DESC']],
      include: [
        {as: 'user', model: db.models.user, attributes: {exclude: ['deletedAt', 'password', 'id', 'jiraToken', 'jiraXsrf']}},
      ],
    }).then(
      (entries) => {
        res.json(entries);
      },
      (err) => {
        console.log('Failed to get pog exports', err);
        res.status(500).json({error: {message: 'Unable to get the list of export entries for this POG.', code: 'failedGetPOGDataExportsQuery'}});
      }
    );
  });

// Handle requests for loading POG into DB
router.route('/csv')
  .get((req, res) => {
    db.models.POGDataExport.create({pog_id: req.POG.id, user_id: req.user.id}).then(
      (exportEntry) => {
        const exporter = new ExportDataTables(req.POG, exportEntry);

        exporter.export().then(
          (exportResult) => {
            // Save Log entry
            exportEntry.log = exportResult.log;
            exportEntry.result = true;
            exportEntry.save().then(
              (result) => {
                const entry = result.get();
                delete entry.id;
                delete entry.pog_id;
                delete entry.user_id;
                // Send command back
                res.json({command: exportResult.command, export: exportEntry});
              },
              (err) => {
                res.status(500).json({error: {message: 'Unable to save export results.', code: 'failedUpdatePOGExportEntry'}});
              }
            );
          },
          (err) => {
            // Save Log entry
            exportEntry.log = err.log;
            exportEntry.result = false;
            exportEntry.save();

            console.log('Failed to run exporters', err);
          }
        );
      },
      (err) => {
        console.log('Failed to create POG Data Export', err);
        res.status(500).json({error: {message: 'Unable to create new data export entry.', code: 'failedPOGDataExportCreate'}});
      }
    );
  });


module.exports = router;
