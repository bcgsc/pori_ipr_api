"use strict";

// Dependencies
let db = require(process.cwd() + '/app/models'),
    fs = require('fs'),
    _ = require('lodash'),
    Q = require('q'),
    im = require('imagemagick'),
    exec = require('child_process').exec,
    nconf = require('nconf').argv().env().file({file: process.cwd() + '/config/config.json'});

// Image Path
let imagePath;

// Map of images to be loaded
let images = require(process.cwd() + '/config/images.json');

/*
 * Parse Image Data
 *
 * 
 * @param object POG - POG model object
 *
 */
module.exports = (POG, dir, logger) => {

  // Set Image Path
  imagePath = dir + '/images';
  
  // Create promise
  let deferred = Q.defer();
  
  // Setup Logger
  let log = logger.loader(POG.POGID, 'Images');
  
  let promises = [];
  
  // Read in images, process and insert into DB
  images.forEach((image) => {
    
    // Check that image exists
    if(!fs.existsSync(imagePath + image.file)) {
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

  let imgData = "";

  // Call Resize
  let format = image.format || 'PNG';
  let process = exec('convert '+imagePath + image.file+ ' -resize ' + image.dimensions.w+'x'+image.dimensions.h + ' ' + format + ':- | base64');

  // On data, chunk
  process.stdout.on('data', (res) => {
    imgData = imgData + res;
  });

  process.stderr.on('data', (err) => {
    console.log('Imagemagick Processing Error', err);
    deferred.reject({reason: 'ImageMagickError'});
  });

  // Done executing
  process.on('close', (resp) => {

    // Write to DB
    // Add to database
    db.models.imageData.create({
      pog_id: POG.id,
      format: image.format || 'PNG',
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

