"use strict";

// Dependencies
let db = require(process.cwd() + '/app/models'),
    fs = require('fs'),
    _ = require('lodash'),
    Q = require('q'),
    im = require('imagemagick'),
    exec = require('child_process').exec,
    glob = require('glob'),
    nconf = require('nconf').argv().env().file({file: process.cwd() + '/config/columnMaps.json'});

// Image Path
let imagePath;

// Map of images to be loaded
let images = require(process.cwd() + '/config/images.json');

/**
 * Parse Image Data
 *
 * Process POG Report images, and store in database
 *
 * @param {object} report - Report model object
 * @param {object} dir - working base directory
 * @param {object} logger - Console logging interface
 */
module.exports = (report, dir, logger) => {

  // Set Image Path
  imagePath = dir + '/images';
  
  // Create promise
  let deferred = Q.defer();
  
  // Setup Logger
  let log = logger.loader(report.ident, 'Images');
  
  let promises = [];
  
  // Read in images, process and insert into DB
  images.forEach((image) => {

    // Check that image exists
    if(!fs.existsSync(imagePath + image.file)) {
      // If it's not optional, hard fail.
      if(!image.optional) {
        log('Failed to read in required image file: ' + image.name, logger.ERROR);
        deferred.reject({loader: 'image', message: 'Failed to find the required image: ' + image.file});
        return;
      }
      // Optional, soft fail
      if(image.optional) return log('Failed to find optional image file: ' + image.name, logger.WARNING);
    }

    // Create Promise
    promises.push(processImage(report, image, log));
    
  });
  
  promises.push(loadExpressionDensity(report, log));
  promises.push(loadSummaryImage(report, log));
  
  Q.all(promises)
    .then((results) => {
        
        log('Loaded all images', logger.SUCCESS);
        deferred.resolve({loader: 'images', result: true});
        
      },
      (error) => {
        log('Unable to load images.', logger.ERROR);
        deferred.reject({loader: 'image', message: 'Unable to load image entries: ' + err.message});
      }
    );
  
  return deferred.promise;
  
}

// Read, Resize, and Insert Image Data
let processImage = (report, image, log) => {
  
  let deferred = Q.defer();

  let imgData = "";

  // Call Resize
  let format = image.format || 'PNG';
  let process = exec('convert "'+imagePath + image.file+ '" -resize ' + image.dimensions.w+'x'+image.dimensions.h + ' ' + format + ':- | base64');

  // On data, chunk
  process.stdout.on('data', (res) => {
    imgData = imgData + res;
  });

  process.stderr.on('data', (err) => {
    console.log('Imagemagick Processing Error', err);
    deferred.reject({loader: 'image', message: 'ImageMagick failed to convert: ' + image.file});
  });

  // Done executing
  process.on('close', (resp) => {

    // Write to DB
    // Add to database
    db.models.imageData.create({
      pog_id: report.pog_id,
      pog_report_id: report.id,
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
          deferred.reject({loader: 'image', message: 'failed to create database entry for: ' + image.file});
        }
      );
  });

  
  return deferred.promise;
  
};

/**
 * Load all mutation summary images
 *
 * @param {object} report - Report model object
 * @param {object} log - Logger interface
 *
 * @returns {Promise}
 */
let loadSummaryImage = (report, log) => {
  
  return new Promise((resolve, reject) => {
    
    glob(imagePath + '/mut_summary_image/*.png', (err, files) => {
      
      if(err) {
        reject({message: 'Failed to find any mutation summary image files in ' + imagePath + '/mut_summary_image/', cause: err, loader: 'image'});
        log('Failed to find mutation summary images');
        return;
      }
      
      Promise.all(_.map(files, (f) => { return processSummaryImage(report, f, log)}))
        .then((result) => {
          log('Finished loading all mutation summary images');
          resolve({loader: 'mutation_summary', status: true});
        })
        .catch((err) => {
          console.log(err);
          log('Failed to load all mutation summary images: ' + err.message);
          reject(({loader: 'image', reason: 'failed to load all mutation summary images'}));
        });
      
    });
    
  });
  
};


/**
 * Process Mutation Summary Images
 *
 * @param {object} report - Report model object
 * @param {string} file - Path to file
 * @param {object} log - Logging interface
 *
 * @returns {Promise}
 */
let processSummaryImage = (report, file, log) => {
  return new Promise((resolve, reject) => {
    
    
    let process = exec('convert "' + file + '" -resize 560x151 PNG:- | base64');
    let imgData = ""; // Image data chunk string
    
    let filename = _.last(file.split('/'));
    
    let image_string = filename.substring(17,filename.lastIndexOf('.png'));
    
    // Chunk data
    process.stdout.on('data', (res) => {
      imgData += res;
    });
    
    // Imagemagick command failed
    process.stderr.on('data', (err) => {
      console.log('Imagemagick Processing Error for', file, err);
      reject({loader: 'image', message: 'ImageMagick was unable to convert the image: ' + file});
    });
    
    // On close of process
    process.on('close', (result) => {
      // Write result to DB
  
      db.models.imageData.create({
        pog_id: report.pog_id,
        pog_report_id: report.id,
        format: 'PNG',
        filename: _.last(file.split('/')),
        key: "mutation_summary."+image_string,
        data: imgData
      })
        .then((result) => {
          log('Loaded image: ' + "mutation_summary."+image_string);
          resolve(true);
        })
        .catch((err) => {
          // DB Error
          console.log('Failed to insert image file for: ' + "mutation_summary."+image_string);
          console.log(err);
          reject({})
        });
    });
    
  
  });
};


// Load in the expression denisty images
let loadExpressionDensity = (report, log) => {

  let deferred = Q.defer();
  let expDenProm = [];


  glob(imagePath + '/expr_density/*.png', (err, files) => {

    _.forEach(files, (file) => {
      // Ignore Legend
      if(file.indexOf('expr_histo_legend.png') !== -1) return;
      // Read in each file, and put into DB.
      expDenProm.push(processExpDensityImages(report, file, log));
    });

    Q.all(expDenProm).then(
      (result) => {
        log('Finished processing Expression Density images');
        deferred.resolve({expDensityImages: true});
      },
      (err) => {
        console.log('Failed Exp Density Image Processing', err);
        deferred.reject({loader: 'image', reason: 'failed to created database entry for: ' + img});
      }
    );

  });

  // Return master promise
  return deferred.promise;
};

// Process all Expression Density Images
let processExpDensityImages = (report, img, log) => {

  let deferred = Q.defer();

  let imgData = "";
  let geneName = img.split('/')[img.split('/').length-1].split('.')[0];

  let process = exec('convert "'+img+ '" -resize 450x450 PNG:- | base64');

  // On data, chunk
  process.stdout.on('data', (res) => {
    imgData = imgData + res;
  });

  process.stderr.on('data', (err) => {
    console.log('Imagemagick Processing Error for',img, err);
    deferred.reject({loader: 'image', message: 'ImageMagick was unable to convert the image: ' + img});
  });

  // Done executing
  process.on('close', (resp) => {

    // Write to DB
    // Add to database
    db.models.imageData.create({
      pog_id: report.pog_id,
      pog_report_id: report.id,
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
          deferred.reject({loader: 'image', reason: 'failed to created database entry for: ' + img});
        }
      );
  });

  return deferred.promise;
};