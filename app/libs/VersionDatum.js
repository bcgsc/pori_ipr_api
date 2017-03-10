"use strict";

const db = require(process.cwd() + '/app/models'),
      _ = require('lodash'),
      Q = require('q');


/*
 * Update a version of a given datum
 *
 * Creates new entry of same ident, then deletes previous version.
 *
 * @param required object model - Sequelize Model that the datum belongs to
 * @param required object currentEntry - The current/old version of the datum to be versioned
 * @param required object newEntry - The new version of the data to be entered
 * @param optional string destroyIndex - The column used to identify the entry to be destroyed (can be unique wrt dataVersion)
 * @param optional array colsToMap - The columns to map from old to new entries
 *
 * @returns promise
 *
 * @resolves object - {status: bool, create: Sequelize.create.response, destroy: Sequelize.destroy.response}
 *
 * @rejects object - {status: bool, message: string}
 *
 */
module.exports = (model, currentEntry, newEntry, user, comment="", destroyIndex='ident', colsToMap=['ident','pog_id']) => {

  let deferred = Q.defer();

  // Update newEntry values
  _.forEach(colsToMap, (col) => {
    if(!(col in currentEntry)) {
      deferred.reject('The column: ' + col + ' does not exist on the current Entry.');
      throw Error('The column: ' + col + ' does not exist on the current Entry.');
    }
    newEntry[col] = currentEntry[col]; // Map from old to new
  });

  // ++ Data Version

  // Get the max for the current dataVersion in the table
  model.max('dataVersion', {where: {ident: currentEntry.ident}}).then(
    (maxCurrentVersion) => {
      if(!typeof maxCurrentVersion === 'number') return deferred.reject({status: false, message: 'Unable to find current max version of data entry'});

      newEntry.dataVersion = maxCurrentVersion + 1;

      // Create new entry
      model.create(newEntry).then(
        (createResponse) => {

          // Are we not destroying?
          if(!destroyIndex) {

            deferred.resolve({status: true, data: {create: createResponse}});

          } else {

            // Set version to be destroyed
            let destroyWhere = {
              dataVersion: currentEntry.dataVersion
            };
            // Set destroy index
            destroyWhere[destroyIndex] = currentEntry[destroyIndex];

            // Delete existing version
            model.destroy({where: destroyWhere, limit: 1}).then(
              (destroyResponse) => {

                // Create DataHistory entry
                let dh = {
                  type: 'change',
                  pog_id: newEntry.pog_id,
                  table: model.getTableName(),
                  model: model.name,
                  entry: newEntry.ident,
                  previous: currentEntry.dataVersion,
                  new: newEntry.dataVersion,
                  user_id: user.id,
                  comment: comment
                };
                db.models.POGDataHistory.create(dh);

                // Resolve promise
                deferred.resolve({status: true, data: {create: createResponse, destroy: destroyResponse}});
              },
              (destroyError) => {
                deferred.reject({status: false, message: 'Unable to destroy old data version entry'});
                throw Error('Unable to destroy old data version entry');
              }
            )
          }

        },
        (createError) => {
          console.log(createError);
          deferred.reject({status: false, message: 'Unable to create new data version entry'});
          throw Error('Unable to create new data version entry');
        }
      );

    },
    (err) => {
      console.log('SQL Error, unable to get current max version number of data for versioning');
      console.log(err);
      deferred.reject({status: false, message: 'SQL Error, unable to get max version number'});
    }
  );

  return deferred.promise;

};