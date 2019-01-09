"use strict";

// app/routes/loadPog.js
let express = require('express'),
  router = express.Router({mergeParams: true}),
  db = require(process.cwd() + '/app/models'),
  remapKeys = require(process.cwd() + '/app/libs/remapKeys'),
  reverseMapKeys = require(process.cwd() + '/app/libs/reverseMapKeys'),
  _ = require('lodash'),
  writeCSV = require(process.cwd() + '/lib/writeCSV'),
  fs = require('fs'),
  glob = require('glob'),
  exportDataTables = require(process.cwd() + '/app/exporters/index'),
  nconf = require('nconf').argv().env().file({file: process.cwd() + '/config/columnMaps.json'});


router.route('/all')
  // Get all export entries
  .get((req, res, next) => {
    db.models.POGDataExport.findAll({
      where: {pog_id: req.POG.id},
      attributes: {exclude: ['id', 'user_id', 'pog_id']},
      order: [['createdAt', 'DESC']],
      include: [
        {as: 'user', model: db.models.user, attributes: {exclude: ['deletedAt', 'password', 'id', 'jiraToken', 'jiraXsrf']}}
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
  .get((req,res,next) => {

    db.models.POGDataExport.create({pog_id: req.POG.id, user_id: req.user.id}).then(
      (exportEntry) => {

        let exporter = new exportDataTables(req.POG, exportEntry);

        exporter.export().then(
          (exportResult) => {

            // Save Log entry
            exportEntry.log = exportResult.log;
            exportEntry.result = true;
            exportEntry.save().then(
              (result) => {
                let entry = result.get();
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
            exportEntry.log = result.log;
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
