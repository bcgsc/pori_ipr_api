"use strict";
const fs        = require('fs');
const os        = require('os');
let logger      = process.logger;

/**
 * Credentials Not Found Exception
 */
class CredentialsNotFound extends Error {
  constructor(msg) {
    super(msg);
  }
}

/**
 * Credentials file is not in valid format
 */
class InvalidCredentialsFile extends Error {
  constructor(msg) {
    super(msg);
  }
}


/**
 * Gin Account Credentials Export
 *
 */
module.exports = {
  
  /**
   * Retrieve Gin Credentials from ~/.ginaccount file
   *
   * @returns {Promise}
   */
  retrieve: function() {
    return new Promise(function(resolve, reject) {
      
      logger.debug('Locating ~/.ginaccount file');
      
      
      // Check for file in filesystem
      fs.readFile(os.homedir() + '/.ginaccount', 'utf8', (err, data) => {
        
        // Check that the file is found
        if(err) {
          console.log(err);
          reject({message: 'Failed to retrieve ~/.ginaccount file: ' + err.message});
          throw new CredentialsNotFound('Unable to find the ~/.ginaccount file');
        }
  
        logger.debug('Gin credentials File Found');
        
        // Check that the file matches the expected format
        if(!data.match(/[A-z0-9]{*}:[A-z0-9]{*}/g) && data.split(':').length !== 2) {
          reject({message: 'The ~/.ginaccount file is not of a valid format: ' + err.message});
          throw new InvalidCredentialsFile('The ~/.ginaccount file is not of a valid format');
        }
  
        logger.debug('Gin credentials File parsed');
        
        resolve({username: data.split(':')[0].trim(), password: data.split(':')[1].trim()});
      });
      
    
    });
  }
  
};