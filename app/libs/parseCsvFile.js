"use strict";

let fs = require('fs'),
    csv = require('csv-parse'),
    Q = require('q');

module.exports = {
  readFromCSV: (file) => {
  
    let deferred = Q.defer();
    
    let parser = csv({delimiter: ',', columns: true}, (err,data) => {
      
      deferred.resolve(data);
      
    });
    
    fs.createReadStream(file).pipe(parser);
    
    return deferred.promise;
    
  }
}
