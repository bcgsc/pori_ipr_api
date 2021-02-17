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
    variant.germlineReportId = report.id;
    variant.cglCategory = p2s(variant.cglCategory);
    variant.preferredTranscript = p2s(variant.preferredTranscript);
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
      key: 'cglCategory',
    },
    {
      header: 'Mutation Landscape',
      key: 'mutationLandscape',
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
      key: 'dbSnp',
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
      key: 'zygosityGermline',
    },
    {
      header: 'HGVS-cDNA',
      key: 'hgvsCdna',
    },
    {
      header: 'HGVS-protein',
      key: 'hgvsProtein',
    },
    {
      header: 'Zygosity in tumour',
      key: 'zygosityTumour',
    },
    {
      header: 'Genomic variant reads (alt/total)',
      key: 'genomicVariantReads',
    },
    {
      header: 'RNA variant reads (alt/total)',
      key: 'rnaVariantReads',
    },
    {
      header: 'Gene somatic aberration?',
      key: 'geneSomaticAbberation',
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
      key: 'patientHistory',
    },
    {
      header: 'Family History',
      key: 'familyHistory',
    },
    {
      header: 'TCGA Comparator',
      key: 'tcgaComp',
    },
    {
      header: 'tcga_comp_[tcga_comparator]_percentile',
      key: 'tcgaCompAveragePercentile',
    },
    {
      header: 'tcga_comp_average_norm_percentile',
      key: 'tcgaCompAverageNormPercentile',
    },
    {
      header: 'tcga_comp_[tcga_comparator]_norm_percentile',
      key: 'tcgaCompNormPercentile',
    },
    {
      header: 'tcga_comp_average_percentile',
      key: 'gtexCompAveragePercentile',
    },
    {
      header: 'tcga_comp_[tcga_comparator]_percentile',
      key: 'tcgaCompPercentile',
    },
    {
      header: 'GTex Comparator',
      key: 'gtexComp',
    },
    {
      header: 'gtex_comp_[gtex_comparator]_average_percentile',
      key: 'gtexCompPercentile',
    },
    {
      header: 'fc_bodymap',
      key: 'fcBodymap',
    },
    {
      header: 'Gene Expression RPKM',
      key: 'geneExpressionRpkm',
    },
    {
      header: 'Additional Info',
      key: 'additionalInfo',
    },
  ];
};

module.exports = {
  processVariants,
  createHeaders,
};
