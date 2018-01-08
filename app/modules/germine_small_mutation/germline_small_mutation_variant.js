"use strict";

const db          = require(process.cwd() + '/app/models');
const lodash      = require('lodash');
const logger      = process.logger;
const p2s         = require(process.cwd() + '/app/libs/pyToSql');
const _           = require('lodash');

module.exports = {
  
  
  /**
   * Process Germline small mutation variants
   *
   * Takes in the germline report object and includes the id in each row's object
   *
   * @param {object} report - Germline report model object
   * @param {array} variants - Collection of germline small mutation variants
   *
   * @returns {Array} - Returns a collection of processed variants
   */
  processVariants: (report, variants) => {
    
    let processed_variants;
    
    // Map result values
    processed_variants = _.map(variants, (v) => {
      
      v.germline_report_id = report.id;
      v.cgl_category = p2s(v.cgl_category);
      v.preferred_transcript = p2s(v.preferred_transcript);
      v.gmaf = p2s(v.gmaf);
      
      return v;
    });
    
    return processed_variants;
  },
  
  /**
   * Generate Export Headers
   *
   * @return {array} - Return a collection
   */
  createHeaders: () => {
  
    return [
      {
        header: 'Sample Name',
        key: 'sample'
      },
      {
        header: 'Biopsy',
        key: 'biopsy'
      },
      {
        header: 'Flagged',
        key: 'flagged'
      },
      {
        header: 'ClinVar',
        key: 'clinvar'
      },
      {
        header: 'CGL Category',
        key: 'cgl_category'
      },
      {
        header: 'Mutation Landscape',
        key: 'mutation_landscape'
      },
      {
        header: 'GMAF',
        key: 'gmaf'
      },
      {
        header: 'Trancript',
        key: 'transcript'
      },
      {
        header: 'Gene',
        key: 'gene'
      },
      {
        header: 'Variant',
        key: 'variant'
      },
      {
        header: 'Impact',
        key: 'impact'
      },
      {
        header: 'Chr',
        key: 'chromosome'
      },
      {
        header: 'Pos',
        key: 'position'
      },
      {
        header: 'dbSNP',
        key: 'dbSNP'
      },
      {
        header: 'Ref',
        key: 'reference'
      },
      {
        header: 'Alt',
        key: 'alteration'
      },
      {
        header: 'Score',
        key: 'score'
      },
      {
        header: 'Zygosity in germline',
          key: 'zygosity_germline'
      },
      {
        header: 'HGVS-cDNA',
        key: 'hgvs_cdna'
      },
      {
        header: 'HGVS-protein',
        key: 'hgvs_protein'
      },
      {
        header: 'Zygosity in tumour',
        key: 'zygosity_tumour'
      },
      {
        header: 'Genomic variant reads (alt/total)',
        key: 'genomic_variant_reads'
      },
      {
        header: 'RNA variant reads (alt/total)',
        key: 'rna_variant_reads'
      },
      {
        header: 'Gene somatic aberration?',
        key: 'gene_somatic_abberation'
      },
      {
        header: 'Notes',
        key: 'notes'
      },
      {
        header: 'Type',
        key: 'type'
      },
      {
        header: 'Patient History',
        key: 'patient_history'
      },
      {
        header: 'Family History',
        key: 'family_history'
      },
      {
        header: 'TCGA Comparator',
        key: 'tcga_comp'
      },
      {
        header: `tcga_comp_[tcga_comparator]_percentile`,
        key: 'tcga_comp_average_percentile'
      },
      {
        header: 'tcga_comp_average_norm_percentile',
        key: 'tcga_comp_average_norm_percentile'
      },
      {
        header: `tcga_comp_[tcga_comparator]_norm_percentile`,
        key: 'tcga_comp_norm_percentile'
      },
      {
        header: `tcga_comp_average_percentile`,
        key: 'gtex_comp_average_percentile'
      },
      {
        header: `tcga_comp_[tcga_comparator]_percentile`,
        key: 'tcga_comp_percentile'
      },
      {
        header: 'GTex Comparator',
        key: 'gtex_comp'
      },
      {
        header: `gtex_comp_[gtex_comparator]_average_percentile`,
        key: 'gtex_comp_percentile'
      },
      {
        header: `fc_bodymap`,
        key: 'fc_bodymap'
      },
      {
        header: 'Gene Expression RPKM',
        key: 'gene_expression_rpkm'
      },
      {
        header: 'Additional Info',
        key: 'additional_info'
      }
    ];
  },
  
  processVariant: (headers, variant) => {
    
    let resp = {};
    
    // Replace Headers
    _.forEach(variant, (c, k) => {
      let i = _.find(headers, {key: k});
      
      if(c === null || c === undefined) c = 'NA';
      
      // If a header map value is found, set the mapped key to the cell value;
      if(i) resp[i.header] = c;
    });
    
    return resp;
  }
  
};