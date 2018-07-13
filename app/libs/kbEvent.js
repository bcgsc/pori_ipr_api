"use strict";

// app/routes/genomic/detailedGenomicAnalysis.js
const db     = require(process.cwd() + '/app/models');
const lodash = require('lodash');
const Q      = require('q');

module.exports = {

  eventCheck: (event, user) => {

    let deferred = Q.defer();

    // Check if there's an event with this event_expression value
    db.models.kb_event.findOne({where: {key: {$ilike: event}}}).then(
      (result) => {

        // Create new event entry
        if(result === null) {

          // Create new event
          db.models.kb_event.create({
            key: event,
            type: event.split('_')[0],
            createdBy_id: user.id,
            status: 'NEW'
          }).then(
            // Succesfully created
            (event) => {
              deferred.resolve({status: true, event: 'created'});
            },
            (error) => {
              console.log('SQL error', error);
              deferred.reject(false);
            }
          );
        }

        // event already exists
        if(result !== null) {
          console.log('KB-E', 'Found', event);
          deferred.resolve({status: true, event: 'exists'});
        }

      },
      (error) => {
        console.log('SQL error', error);
        deferred.reject(false);
      }
    );

    return deferred.promise;

  }

};