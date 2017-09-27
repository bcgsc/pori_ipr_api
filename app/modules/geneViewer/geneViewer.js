"use strict";

const _                       = require('lodash');
const db                      = require('../../models/');
const FailedCreateQuery       = require('../../models/exceptions/FailedCreateQuery');

module.exports = class GeneViewer {
  
  /**
   * Constructor
   *
   * @param {object} pog - Pass in POGID
   * @param {object} report - Pass in report ident
   * @param {string} gene - Gene symbol to search for
   *
   */
  constructor(pog, report, gene) {
    this.pog = pog;
    this.report = report;
    this.gene = gene;
    
    this.results = {
      kbMatches: [],
      smallMutations: [],
      copyNumber: [],
      structuralVariants: [],
      expRNA: [],
      expProtein: [],
      expDrugTarget: [],
      expDensityGraph: []
    }
  }
  
  /**
   * Run promises and get all results
   *
   * @returns {Promise}
   */
  getAll() {
    return new Promise((resolve, reject) => {
      
      let promises = [
        this._getKbMatches(),
        this._getSmallMutations(),
        this._getCopyNumber(),
        this._getExpRNA(),
        this._getExpDrugTarget(),
        this._getExpDensityGraph()
      ];
      
      Promise.all(promises).then(
        (result) => {
          resolve(this.results);
        }
      ).catch((err) => {
        console.log('Unable to get gene viewer data', err);
      });
      
    });
  }
  
  /**
   * KB Matches
   *
   * @returns {Promise}
   * @private
   */
  _getKbMatches() {
    return new Promise((resolve, reject) => {
      let opts = {
        where: {
          gene: {$ilike: '%' + this.gene + '%'},
          pog_report_id: this.report.id
        }
      };
      
      db.models.alterations.scope('public').findAll(opts).then(
        (results) => {
          this.results.kbMatches = results;
          resolve('kbMatches');
        }
      ).catch((err) => {
        console.log('Failed to get KB Matches for gene viewer call', err);
        reject({message: 'Failed to get KB matches for gene viewer call', cause: err.message});
      });
      
    });
  }
  
  /**
   * Small Mutations
   *
   * @returns {Promise}
   * @private
   */
  _getSmallMutations() {
    return new Promise((resolve, reject) => {
    
      let opts = {
        where: {
          gene: {$ilike: '%' + this.gene + '%'},
          pog_report_id: this.report.id
        }
      };
    
      db.models.smallMutations.scope('public').findAll(opts).then(
        (results) => {
          this.results.smallMutations = results;
          resolve('smallMutations');
        }
      ).catch((err) => {
        console.log('Failed to get Small Mutations for gene viewer call', err);
        reject({message: 'Failed to get Small Mutations for gene viewer call', cause: err.message});
      });
    
    });
  }
  
  /**
   * Copy Number Analyses
   *
   * @returns {Promise}
   * @private
   */
  _getCopyNumber() {
    return new Promise((resolve, reject) => {
    
      let opts = {
        where: {
          gene: {$ilike: '%' + this.gene + '%'},
          pog_report_id: this.report.id
        }
      };
    
      db.models.cnv.scope('public').findAll(opts).then(
        (results) => {
          this.results.copyNumber = results;
          resolve('copyNumber');
        }
      ).catch((err) => {
        console.log('Failed to get Copy Number for gene viewer call', err);
        reject({message: 'Failed to get Copy Number for gene viewer call', cause: err.message});
      });
    
    });
  }
  
  /**
   * Structural Variants
   *
   * @returns {Promise}
   * @private
   */
  _getStructuralVariants() {
    return new Promise((resolve, reject) => {
    
      let opts = {
        where: {
          gene: {$ilike: '%' + this.gene + '%'},
          pog_report_id: this.report.id
        }
      };
    
      db.models.sv.scope('public').findAll(opts).then(
        (results) => {
          this.results.structuralVariants = results;
          resolve('structuralVariants');
        }
      ).catch((err) => {
        console.log('Failed to get Structural Variants for gene viewer call', err);
        reject({message: 'Failed to get Structural Variants for gene viewer call', cause: err.message});
      });
    
    });
  }
  
  /**
   * Expression - RNA
   *
   * @returns {Promise}
   * @private
   */
  _getExpRNA() {
    return new Promise((resolve, reject) => {
    
      let opts = {
        where: {
          gene: {$ilike: '%' + this.gene + '%'},
          pog_report_id: this.report.id
        }
      };
    
      db.models.outlier.scope('public').findAll(opts).then(
        (results) => {
          this.results.expRNA = results;
          resolve('expRNA');
        }
      ).catch((err) => {
        console.log('Failed to get RNA Expression for gene viewer call', err);
        reject({message: 'Failed to get RNA Expression for gene viewer call', cause: err.message});
      });
    
    });
  }
  
  /**
   * Expression - Protein
   *
   * @returns {Promise}
   * @private
   */
  _getExpProtein() {
    return new Promise((resolve, reject) => {
    
      let opts = {
        where: {
          gene: {$ilike: '%' + this.gene + '%'},
          pog_report_id: this.report.id
        }
      };
    
      db.models.proteinExpression.scope('public').findAll(opts).then(
        (results) => {
          this.results.expProtein = results;
          resolve('expProtein');
        }
      ).catch((err) => {
        console.log('Failed to get Protein Expression for gene viewer call', err);
        reject({message: 'Failed to get Protein Expression for gene viewer call', cause: err.message});
      });
    
    });
  }
  
  /**
   * Expression - Drug Targetable
   *
   * @returns {Promise}
   * @private
   */
  _getExpDrugTarget() {
    return new Promise((resolve, reject) => {
    
      let opts = {
        where: {
          gene: {$ilike: this.gene },
          pog_report_id: this.report.id
        }
      };
    
      db.models.drugTarget.scope('public').findAll(opts).then(
        (results) => {
          this.results.expDrugTarget = results;
          resolve('expDrugTarget');
        }
      ).catch((err) => {
        console.log('Failed to get Drug Target for gene viewer call', err);
        reject({message: 'Failed to get Drug Target for gene viewer call', cause: err.message});
      });
    
    });
  }
  
  /**
   * Expression - Density Graph
   *
   * @returns {Promise}
   * @private
   */
  _getExpDensityGraph() {
    return new Promise((resolve, reject) => {
    
      let opts = {
        where: {
          key: {$ilike: 'expDensity.' + this.gene + '%'},
          pog_report_id: this.report.id
        }
      };
    
      db.models.imageData.findAll(opts).then(
        (results) => {
          this.results.expDensityGraph = results;
          resolve('expDensityGraph');
        }
      ).catch((err) => {
        console.log('Failed to get Density Graphs for gene viewer call', err);
        reject({message: 'Failed to get Density Graphs for gene viewer call', cause: err.message});
      });
    
    });
  }
  
};