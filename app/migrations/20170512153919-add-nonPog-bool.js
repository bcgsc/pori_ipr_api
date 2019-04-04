'use strict';

const Sq = require('sequelize');
const db = require("../models");
const _ = require('lodash');

/**
 * Add columns for tracking report & KB versions
 *
 */

console.log('Loaded dependencies');

// Make sure we're working on dev
if(db.config.database !== 'ipr-dev') {
  //process.exit();
}

// Add new column to tables
let addNonPogColumn = () => {
  return new Promise((resolve, reject) => {

    console.log('[MIGRATION][addNonPogColumn]', 'Starting migration');

    db.query('ALTER TABLE "POGs" ADD COLUMN "nonPOG" boolean DEFAULT false;')
      .then(
        (result) => {
          console.log('[MIGRATION][addNonPogColumn]', 'Success');
          resolve(true)
        },
        (err) => {
          console.log('[MIGRATION][addNonPogColumn]', 'Unable to add columns to comments table', err);
          reject('addSignOffColumns');
        }
      )

  });
};

console.log('[MIGRATION]', 'Starting Migration');

// Start migration chain
addNonPogColumn()
  .then((success) => {
    console.log('[MIGRATION]', 'Finished migrations', success);
  })
  .catch((err) => {
    console.log('[MIGRATION]', 'Failed migration', err);
  });