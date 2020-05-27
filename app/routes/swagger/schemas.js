const {JsonSchemaManager, OpenApi3Strategy} = require('@alt3/sequelize-to-json-schemas');
const db = require('../../models');
const {BASE_EXCLUDE} = require('../../schemas/exclude');

const schemaManager = new JsonSchemaManager({secureSchemaUri: false});

// TODO: Fix user schemas after https://www.bcgsc.ca/jira/browse/DEVSU-908
const user = schemaManager.generate(db.models.user, new OpenApi3Strategy(), {
  title: 'user',
  associations: false,
  exclude: [],
});

const newUser = schemaManager.generate(db.models.user, new OpenApi3Strategy(), {
  title: 'newUser',
  associations: false,
  exclude: [...BASE_EXCLUDE, 'jiraToken', 'jiraXsrf', 'lastLogin', 'settings'],
});

const group = schemaManager.generate(db.models.userGroup, new OpenApi3Strategy(), {
  title: 'group',
  associations: true,
  exclude: [...BASE_EXCLUDE, 'owner_id', 'jiraToken', 'jiraXsrf', 'lastLogin', 'settings'],
});

const project = schemaManager.generate(db.models.project, new OpenApi3Strategy(), {
  title: 'project',
  associations: true,
  exclude: [...BASE_EXCLUDE],
});

const analysis_report = schemaManager.generate(db.models.analysis_report, new OpenApi3Strategy(), {
  title: 'analysis_report',
  exclude: ['createdBy_id', ...BASE_EXCLUDE],
  associations: true,
  excludeAssociations: ['ReportUserFilter', 'createdBy', 'probe_signature', 'presentation_discussion', 'presentation_slides', 'users', 'analystComments', 'projects'],
});

const genes = schemaManager.generate(db.models.genes, new OpenApi3Strategy(), {
  title: 'genes',
  associations: false,
  exclude: [...BASE_EXCLUDE],
});

const tumourAnalysis = schemaManager.generate(db.models.tumourAnalysis, new OpenApi3Strategy(), {
  title: 'tumourAnalysis',
  associations: false,
  exclude: [...BASE_EXCLUDE],
});

const variantCounts = schemaManager.generate(db.models.variantCounts, new OpenApi3Strategy(), {
  title: 'variantCounts',
  associations: false,
  exclude: [...BASE_EXCLUDE],
});

const structuralVariants = schemaManager.generate(db.models.structuralVariants, new OpenApi3Strategy(), {
  title: 'structuralVariants',
  associations: false,
  exclude: [...BASE_EXCLUDE],
});

const genomicAlterationsIdentified = schemaManager.generate(db.models.genomicAlterationsIdentified, new OpenApi3Strategy(), {
  title: 'genomicAlterationsIdentified',
  associations: false,
  exclude: [...BASE_EXCLUDE],
});

const probeResults = schemaManager.generate(db.models.probeResults, new OpenApi3Strategy(), {
  title: 'probeResults',
  associations: false,
  exclude: [...BASE_EXCLUDE],
});

// TODO: Rename table to camel case in models
const summary_microbial = schemaManager.generate(db.models.summary_microbial, new OpenApi3Strategy(), {
  title: 'summary_microbial',
  associations: false,
  exclude: [...BASE_EXCLUDE],
});

// TODO: Ask clarification about mutation summary v2 difference
const mutationSummary = schemaManager.generate(db.models.mutationSummary, new OpenApi3Strategy(), {
  title: 'mutationSummary',
  associations: false,
  exclude: [...BASE_EXCLUDE],
});

const mutationSummaryv2 = schemaManager.generate(db.models.mutationSummaryv2, new OpenApi3Strategy(), {
  title: 'mutationSummaryv2',
  associations: false,
  exclude: [...BASE_EXCLUDE],
});

const smallMutations = schemaManager.generate(db.models.smallMutations, new OpenApi3Strategy(), {
  title: 'smallMutations',
  associations: false,
  exclude: [...BASE_EXCLUDE],
});

const mutationSignature = schemaManager.generate(db.models.mutationSignature, new OpenApi3Strategy(), {
  title: 'mutationSignature',
  associations: false,
  exclude: [...BASE_EXCLUDE],
});

const copyVariants = schemaManager.generate(db.models.copyVariants, new OpenApi3Strategy(), {
  title: 'copyVariants',
  associations: false,
  exclude: [...BASE_EXCLUDE],
});

const mavis = schemaManager.generate(db.models.mavis, new OpenApi3Strategy(), {
  title: 'mavis',
  associations: false,
  exclude: [...BASE_EXCLUDE],
});

const expressionVariants = schemaManager.generate(db.models.expressionVariants, new OpenApi3Strategy(), {
  title: 'expressionVariants',
  associations: false,
  exclude: [...BASE_EXCLUDE],
});

const kbMatches = schemaManager.generate(db.models.kbMatches, new OpenApi3Strategy(), {
  title: 'kbMatches',
  associations: false,
  exclude: [...BASE_EXCLUDE],
});

const probe_test_information = schemaManager.generate(db.models.probe_test_information, new OpenApi3Strategy(), {
  title: 'probe_test_information',
  associations: false,
  exclude: [...BASE_EXCLUDE],
});

const reportProject = schemaManager.generate(db.models.reportProject, new OpenApi3Strategy(), {
  title: 'reportProject',
  associations: false,
  exclude: [...BASE_EXCLUDE],
});

const analysis_reports_user = schemaManager.generate(db.models.analysis_reports_user, new OpenApi3Strategy(), {
  title: 'analysis_reports_user',
  associations: false,
  exclude: [...BASE_EXCLUDE],
});

const analystComments = schemaManager.generate(db.models.analystComments, new OpenApi3Strategy(), {
  title: 'analystComments',
  associations: false,
  exclude: [...BASE_EXCLUDE],
});

const presentation_discussion = schemaManager.generate(db.models.presentation_discussion, new OpenApi3Strategy(), {
  title: 'presentation_discussion',
  associations: false,
  exclude: [...BASE_EXCLUDE],
});

const presentation_slides = schemaManager.generate(db.models.presentation_slides, new OpenApi3Strategy(), {
  title: 'presentation_slides',
  associations: false,
  exclude: [...BASE_EXCLUDE],
});

const probe_signature = schemaManager.generate(db.models.probe_signature, new OpenApi3Strategy(), {
  title: 'probe_signature',
  associations: false,
  exclude: [...BASE_EXCLUDE],
});


const user_project = schemaManager.generate(db.models.user_project, new OpenApi3Strategy(), {
  title: 'user_project',
  associations: false,
  exclude: [...BASE_EXCLUDE],
});

const patientInformation = schemaManager.generate(db.models.patientInformation, new OpenApi3Strategy(), {
  title: 'patientInformation',
  associations: false,
  exclude: [...BASE_EXCLUDE],
});

const pathwayAnalysis = schemaManager.generate(db.models.pathwayAnalysis, new OpenApi3Strategy(), {
  title: 'pathwayAnalysis',
  associations: false,
  exclude: [...BASE_EXCLUDE],
});

const therapeuticTarget = schemaManager.generate(db.models.therapeuticTarget, new OpenApi3Strategy(), {
  title: 'therapeuticTarget',
  associations: false,
  exclude: [...BASE_EXCLUDE],
});

const germline_small_mutation = schemaManager.generate(db.models.germline_small_mutation, new OpenApi3Strategy(), {
  title: 'germline_small_mutation',
  associations: false,
  exclude: [...BASE_EXCLUDE],
});


// TODO: Ask about probeResults vs probeTarget

module.exports = {
  user,
  newUser,
  group,
  project,
  analysis_report,
  genes,
  tumourAnalysis,
  variantCounts,
  structuralVariants,
  genomicAlterationsIdentified,
  probeResults,
  summary_microbial,
  mutationSummary,
  mutationSummaryv2,
  smallMutations,
  mutationSignature,
  copyVariants,
  mavis,
  expressionVariants,
  kbMatches,
  probe_test_information,
  reportProject,
  analysis_reports_user,
  analystComments,
  presentation_discussion,
  presentation_slides,
  probe_signature,
  user_project,
  patientInformation,
  pathwayAnalysis,
  therapeuticTarget,
  germline_small_mutation,
};
