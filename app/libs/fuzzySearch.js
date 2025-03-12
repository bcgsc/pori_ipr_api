/* eslint-disable max-len */
const {Op, literal} = require('sequelize');

const PARAM_TABLE_MAP = {
  patientId: 'reports',
  projectName: 'projects',
  diagnosis: 'reports_patient_information',
  keyVariant: 'reports_summary_genomic_alterations_identified',
  kbVariant: 'reports_kb_matches',
};

// const PARAM_MODEL_MAP = {
//   patientId: 'report',
//   projectName: 'projects',
//   diagnosis: 'patientInformation',
//   keyVariant: 'genomicAlterationsIdentified',
//   kbVariant: 'kbMatches',
// };

const PARAM_COLUMN_MAP = {
  patientId: 'patient_id',
  projectName: 'name',
  diagnosis: 'diagnosis',
  keyVariant: 'geneVariant',
  kbVariant: 'kb_variant',
};

const fuzzySearchQuery = (searchParams) => {
  try {
    const params = searchParams.match(/(?<=\[).+?(?=\])/g);
    let fuzzyQuery;
    params.forEach((param) => {
      // Extract search categories, keywords, and matching thresholds from search params
      const [paramCategory, paramKeyword, matchingThreshold] = param.split('|');

      // Map out appropriate model, table, and column names for each category
      // const modelName = PARAM_MODEL_MAP[paramCategory];
      const tableName = PARAM_TABLE_MAP[paramCategory];
      const columnName = PARAM_COLUMN_MAP[paramCategory];

      // Construct fuzzy search query
      if (tableName === 'reports') {
        const newFuzzyQuery = `SELECT "id"
                              FROM (SELECT id, patient_id, word_similarity('${paramKeyword}', "patient_id") 
                                    FROM reports) AS subquery
                              WHERE word_similarity >= ${matchingThreshold}
                              ${fuzzyQuery ? 'INTERSECT' : ''}
                              ${fuzzyQuery ?? ''}`;
        fuzzyQuery = newFuzzyQuery;
      } else if (tableName === 'projects') {
        const newFuzzyQuery = `SELECT "search_report_id"
                              FROM (SELECT reports.id AS search_report_id, projects.name, word_similarity('${paramKeyword}', projects.name) 
                                    FROM projects 
                                    JOIN report_projects ON projects.id = report_projects.project_id 
                                    JOIN reports ON reports.id = report_projects.report_id) AS subquery
                              WHERE word_similarity >= ${matchingThreshold}
                              ${fuzzyQuery ? 'INTERSECT' : ''}
                              ${fuzzyQuery ?? ''}`;
        fuzzyQuery = newFuzzyQuery;
      } else {
        const newFuzzyQuery = `SELECT "search_report_id"
                              FROM (SELECT reports.id AS search_report_id, "${columnName}", word_similarity('${paramKeyword}', "${columnName}") 
                                    FROM ${tableName} JOIN reports ON reports.id = ${tableName}.report_id) AS subquery
                              WHERE word_similarity >= ${matchingThreshold}
                              ${fuzzyQuery ? 'INTERSECT' : ''}
                              ${fuzzyQuery ?? ''}`;
        fuzzyQuery = newFuzzyQuery;
      }
    });
    const filterObj = {
      '$report.id$': {[Op.in]: literal(`(${fuzzyQuery})`)},
    };
    return filterObj;
  } catch (error) {
    throw new Error(`Unable to look up reports: ${error.message || error}`);
  }
};

const fuzzySearchIncludeKeyVariant = (searchParams, db) => {
  try {
    const params = searchParams.match(/(?<=\[).+?(?=\])/g);
    const paramCategories = params.map((param) => {return param.split('|')[0];});

    // Include only necessary models depending on search categories
    if (paramCategories.includes('keyVariant')) {
      return ([
        {
          model: db.models.genomicAlterationsIdentified.scope('public'),
          as: 'genomicAlterationsIdentified',
        },
      ]);
    }
    return ([]);
  } catch (error) {
    throw new Error(`Unable to include models: ${error.message || error}`);
  }
};

const fuzzySearchIncludeKbVariant = (searchParams, db) => {
  try {
    const params = searchParams.match(/(?<=\[).+?(?=\])/g);
    const paramCategories = params.map((param) => {return param.split('|')[0];});

    // Include only necessary models depending on search categories
    if (paramCategories.includes('kbVariant')) {
      return ([
        {
          model: db.models.kbMatches.scope('minimal'),
          as: 'kbMatches',
        },
      ]);
    }
    return ([]);
  } catch (error) {
    throw new Error(`Unable to include models: ${error.message || error}`);
  }
};

module.exports = {fuzzySearchQuery, fuzzySearchIncludeKeyVariant, fuzzySearchIncludeKbVariant};
