"use strict";

// Dependencies
let db = require(process.cwd() + '/app/models'),
    fs = require('fs'),
    _ = require('lodash'),
    Q = require('q'),
    nconf = require('nconf').argv().env().file({file: process.cwd() + '/config/config.json'});

// Image Path
let imagePath;

// Map of images to be loaded
let images = [
  {
    name: 'subtypePlot.molecular',
    file: '/subtype_plot_image/molecular_subtype.png',
    compress: true,
    dimensions: {
      h: 1500,
      w: 2400,
    },
    optional: true
  },
  {
    name: 'subtypePlot.receptorStatus',
    file: '/subtype_plot_image/receptor_status.png',
    compress: true,
    dimensions: {
      h: 1500,
      w: 2400
    },
    optional: true
  }
]

/*
 * Parse Image Data
 *
 * 
 * @param object POG - POG model object
 *
 */
module.exports = (POG, logger) => {

  // Set Image Path
  imagePath = nconf.get('paths:data:POGdata') + '/' + POG.POGID + '/JReport/Genomic/images';
  
  // Create promise
  let deferred = Q.defer();
  
  // Setup Logger
  let log = logger.loader(POG.POGID, 'Images');
  
  let promises = [];
  
  // Read in images, process and insert into DB
  images.forEach((image) => {
    
    // Check that image exists
    if(!fs.existsSync(imagePath + image.file)) {
      console.log('Looking for: ', imagePath + image.file, fs.existsSync(imagePath + image.file));
    
      // If it's not optional, hard fail.
      if(!image.optional) {
        log('Failed to read in required image file: ' + image.name, logger.ERROR);
        deferred.reject({reason: 'requiredImageReadFail'});
        return;
      }
      // Optional, soft fail
      if(image.optional) return log('Failed to find optional image file: ' + image.name, logger.WARNING);
    }
    
    // Create Promise
    promises.push(processImage(POG, image, log));
    
  });
  
  Q.all(promises)
    .then((results) => {
        
        log('Loaded all images', logger.SUCCESS);
        deferred.resolve(true);
        
      },
      (error) => {
        log('Unable to load images.', logger.ERROR);
        deferred.reject('Unable to load image entries.');
      }
    );
  
  return deferred.promise;
  
}

// Read, Resize, and Insert Image Data
let processImage = (POG, image, log) => {
  
  let deferred = Q.defer();
  
  // Read in file
  fs.readFile(imagePath + image.file, {encoding: 'base64'}, (err, imgData) => {
    
    if(err) {
      console.log('Image File Read Fail', image, err);
      deferred.reject({reason: 'imageReadFail'});
      return;
    }
        
    // Process?
    
    // Add to database
    db.models.imageData.create({
      pog_id: POG.id,
      filename: _.last(image.file.split('/')),
      key: image.name,
      data: imgData
    })
      .then(
      (result) => {
        log('Loaded image: ' + image.name);
        deferred.resolve(true);
      },
      (err) => {
        deferred.reject({reason: 'failedDBInsert'});
      }
    );
    
  });
  
  return deferred.promise;
  
}

