"use strict";

// Dependencies
let db = require(process.cwd() + '/app/models'),
    fs = require('fs'),
    _ = require('lodash'),
    Q = require('q'),
    im = require('imagemagick'),
    exec = require('child_process').exec,
    glob = require('glob'),
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

  promises.push(loadExpressionDensity(POG, log));
  
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
  
};

// Load in the expression denisty images
let loadExpressionDensity = (POG, log) => {

  let deferred = Q.defer();
  let expDenProm = [];


  glob(imagePath + '/expr_density/*.png', (err, files) => {

    _.forEach(files, (file) => {
      // Ignore Legend
      if(file.indexOf('expr_histo_legend.png') !== -1) return;
      // Read in each file, and put into DB.
      expDenProm.push(processExpDensityImages(POG, file, log));
    });

    Q.all(expDenProm).then(
      (result) => {
        log('Finished processing Expression Density images');
        deferred.resolve({expDensityImages: true});
      },
      (err) => {
        console.log('Failed Exp Density Image Processing', err);
      }
    );

  });

  // Return master promise
  return deferred.promise;
};

// Process all Expression Density Images
let processExpDensityImages = (POG, img, log) => {

  let deferred = Q.defer();

  let imgData = "";
  let geneName = img.split('/')[img.split('/').length-1].split('.')[0];

  let process = exec('convert '+img+ ' -resize 450x450 PNG:- | base64');

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
      format: 'PNG',
      filename: _.last(img.split('/')),
      key: "expDensity."+geneName,
      data: imgData
    })
      .then(
        (result) => {
          log('Loaded image: ' + "expDensity."+geneName);
          deferred.resolve(true);
        },
        (err) => {
          deferred.reject({reason: 'failedDBInsert'});
        }
      );
  });

  return deferred.promise;
};