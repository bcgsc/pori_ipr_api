const p2s = require('../../../libs/pyToSql');

/**
 * Process Germline small mutation variants
 *
 * Takes in the germline report object and includes the id in each row's object
 *
 * @param {object} report - Germline report model object
 * @param {Array.<object>} variants - Collection of germline small mutation variants
 *
 * @returns {Array.<object>} - Returns a collection of processed variants
 */
const processVariants = (report, variants) => {
  const processedVariants = variants.map((variant) => {
    variant.germline_report_id = report.id;
    variant.cgl_category = p2s(variant.cgl_category);
    variant.preferred_transcript = p2s(variant.preferred_transcript);
    variant.gmaf = p2s(variant.gmaf);

    return variant;
  });

  return processedVariants;
};

/**
 * Generate Export Headers
 *
 * @return {Array.<object>} - Returns a collection of export headers
 */
const createHeaders = () => {
  return [
    {
      header: 'Sample Name',
      key: 'sample',
    },
    {
      header: 'Biopsy',
      key: 'biopsy',
    },
    {
      header: 'Flagged',
      key: 'flagged',
    },
    {
      header: 'ClinVar',
      key: 'clinvar',
    },
    {
      header: 'CGL Category',
      key: 'cgl_category',
    },
    {
      header: 'Mutation Landscape',
      key: 'mutation_landscape',
    },
    {
      header: 'GMAF',
      key: 'gmaf',
    },
    {
      header: 'Trancript',
      key: 'transcript',
    },
    {
      header: 'Gene',
      key: 'gene',
    },
    {
      header: 'Variant',
      key: 'variant',
    },
    {
      header: 'Impact',
      key: 'impact',
    },
    {
      header: 'Chr',
      key: 'chromosome',
    },
    {
      header: 'Pos',
      key: 'position',
    },
    {
      header: 'dbSNP',
      key: 'dbSNP',
    },
    {
      header: 'Ref',
      key: 'reference',
    },
    {
      header: 'Alt',
      key: 'alteration',
    },
    {
      header: 'Score',
      key: 'score',
    },
    {
      header: 'Zygosity in germline',
      key: 'zygosity_germline',
    },
    {
      header: 'HGVS-cDNA',
      key: 'hgvs_cdna',
    },
    {
      header: 'HGVS-protein',
      key: 'hgvs_protein',
    },
    {
      header: 'Zygosity in tumour',
      key: 'zygosity_tumour',
    },
    {
      header: 'Genomic variant reads (alt/total)',
      key: 'genomic_variant_reads',
    },
    {
      header: 'RNA variant reads (alt/total)',
      key: 'rna_variant_reads',
    },
    {
      header: 'Gene somatic aberration?',
      key: 'gene_somatic_abberation',
    },
    {
      header: 'Notes',
      key: 'notes',
    },
    {
      header: 'Type',
      key: 'type',
    },
    {
      header: 'Patient History',
      key: 'patient_history',
    },
    {
      header: 'Family History',
      key: 'family_history',
    },
    {
      header: 'TCGA Comparator',
      key: 'tcga_comp',
    },
    {
      header: 'tcga_comp_[tcga_comparator]_percentile',
      key: 'tcga_comp_average_percentile',
    },
    {
      header: 'tcga_comp_average_norm_percentile',
      key: 'tcga_comp_average_norm_percentile',
    },
    {
      header: 'tcga_comp_[tcga_comparator]_norm_percentile',
      key: 'tcga_comp_norm_percentile',
    },
    {
      header: 'tcga_comp_average_percentile',
      key: 'gtex_comp_average_percentile',
    },
    {
      header: 'tcga_comp_[tcga_comparator]_percentile',
      key: 'tcga_comp_percentile',
    },
    {
      header: 'GTex Comparator',
      key: 'gtex_comp',
    },
    {
      header: 'gtex_comp_[gtex_comparator]_average_percentile',
      key: 'gtex_comp_percentile',
    },
    {
      header: 'fc_bodymap',
      key: 'fc_bodymap',
    },
    {
      header: 'Gene Expression RPKM',
      key: 'gene_expression_rpkm',
    },
    {
      header: 'Additional Info',
      key: 'additional_info',
    },
  ];
};

module.exports = {
  processVariants,
  createHeaders,
};
