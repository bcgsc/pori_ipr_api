"use strict";

const db = require('../models'),
      Q = require('q'),
      _ = require('lodash');


/**
 * Data Manager
 *
 * Interacts with DataHistory model. Can revert, undo, restore, and retrieve dataHistory entries.
 *
 */
class HistoryManager {

  // Init
  constructor(ident) {
    this.ident = ident;
  }


  /**
   * Revert the dataHistory entry
   *
   * @param {object} user - Currently authenticated user
   * @param {string} comment - Reason for change provided by user
   *
   * @returns {promise|boolean} - Success/Fail
   */
  revert(user, comment) {

    // Retrieve entry
    let deferred = new Q.defer();

    console.log('Ident from within', this.ident);

    db.models.POGDataHistory.findOne({where: {ident: this.ident}, paranoid: false}).then(
      (history) => {
        if(history === null) return deferred.reject({status: false, message: 'Unable to find a data history with that identifier'});

        this.history = history;
        this.model = history.get('model');

        // Find historical version of the data
        db.models[this.model].findAll({where: {dataVersion: {$or: [this.history.get('previous'), this.history.get('new')]}, ident: this.history.get('entry') }, paranoid: false}).then(
          (versions) => {
            // If there are not 2 entries, we can not restore.
            if(versions.length !== 2) return deferred.reject({status: false, message: 'Unable to retrieve the current and previous versions of the data'});

            // Get Current/max Version
            db.models[this.model].max('dataVersion',{where: {ident: this.history.get('entry')}}).then(
              (currentMaxVersion) => {

                // Delete _all_ other verisons! --> eg: We might be reverting to version 15 of 21 versions
                db.models[this.model].destroy({where: {ident: this.history.get('entry')}, paranoid:false}).then(
                  (destruction) => {

                    // Now restore the specified version!
                    db.models[this.model].restore({where: {dataVersion: this.history.get('previous'), ident: this.history.get('entry')}, limit: 1}).then(
                      (restored) => {
                        // DataHistory the change!
                        let entry = {
                          type:'change',
                          table: this.history.get('table'),
                          pog_id: this.history.get('pog_id'),
                          model: this.history.get('model'),
                          entry: this.history.get('entry'),
                          previous: currentMaxVersion,
                          'new': this.history.get('previous'),
                          user_id: user.id,
                          comment: comment
                        };

                        // Log the restoration in the datahistory table.
                        db.models.POGDataHistory.create(entry, {returning: true}).then(
                          (newHistory) => {
                            deferred.resolve({status: true, data: newHistory});
                          },
                          (err) => {
                            console.log('Unable to create new history entry for restoration.', err);
                            deferred.reject({status: false, message: 'Unable to create new history entry for restoration.'});
                          }
                        )

                      },
                      (err) => {
                        console.log('Unable to restore the target version of data', err);
                        deferred.reject({status: false, message: 'Unable to restore the target version of data'});
                      }

                    )
                  },
                  (err) => {
                    console.log('Unable to destroy all past version of data', err);
                    deferred.reject({status: false, message: 'Unable to destroy all past version of data'});
                  }
                )
              },
              (err) => {
                console.log('Unable to find the current version of data', err);
                deferred.reject({status: false, message: 'Unable to restore the target version of data'});
              }
            );

          },
          (err) => {
            console.log('Unable to find past versions of data', err);
            deferred.reject({status: false, message: 'Unable to retrieve historical versions of data'});
          }
        );
      },
      (err) => {
        console.log('Unable to find the history entry.', err);
        deferred.reject({status: false, message: 'Unable to find the history entry.'});
      }
    );


    return deferred.promise;

  }

  /**
   * Get Detailed entry(ies) for dataHistory new/previous
   *
   * @returns {promise|object} - Promise resolves a hashmap of {dataVersion:{entry}}
   */
  detail() {

    let deferred = Q.defer();

    // Retrieve detailed entries for each history value
    db.models.POGDataHistory.findOne({where: {ident: this.ident}, paranoid: false}).then(
      (history) => {
        if(history === null) return deferred.reject({status: false, message: 'Unable to find a data history with that identifier'});

        this.history = history;
        this.model = history.get('model');

        // Find historical version of the data
        db.models[this.model].findAll({where: {dataVersion: {$or: [this.history.get('previous'), this.history.get('new')]}, ident: this.history.get('entry') }, attributes: {exclude: ['id','pog_id']}, paranoid: false}).then(
          (fetchedVersions) => {

            let versions = {};
            // Loop over versions and match
            _.forEach(fetchedVersions, (v) => {
              versions[v.dataVersion] = v;
            });

            deferred.resolve(versions);
          },
          (err) => {
            console.log('Unable to find the data version entry(ies).', err);
            deferred.reject({status: false, message: 'Unable to find the data version entry(ies).'});
          }
        );
      },
      (err) => {
        console.log('Unable to find the history entry.', err);
        deferred.reject({status: false, message: 'Unable to find the history entry.'});
      }
    );

    return deferred.promise;
  }


}






module.exports = HistoryManager;