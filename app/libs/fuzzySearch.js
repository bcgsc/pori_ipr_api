/* eslint-disable max-len */
const {Op, literal} = require('sequelize');

const PARAM_TABLE_MAP = {
  patientId: 'reports',
  projectName: 'projects',
  diagnosis: 'reports_patient_information',
  keyVariant: 'reports_summary_genomic_alterations_identified',
  kbVariant: 'reports_kb_matches',
  structuralVariant: 'reports_structural_variants',
  smallMutation: 'reports_small_mutations',
  therapeuticTarget: 'reports_therapeutic_targets',
};

const PARAM_COLUMN_MAP = {
  patientId: 'patient_id',
  projectName: 'name',
  diagnosis: 'diagnosis',
  keyVariant: 'geneVariant',
  kbVariant: 'kb_variant',
  structuralVariant: 'display_name',
  smallMutation: 'display_name',
  therapeuticTarget: 'therapy',
};

const PARAM_MODEL_MAP = {
  patientId: 'report',
  projectName: 'projects',
  diagnosis: 'patientInformation',
  keyVariant: 'genomicAlterationsIdentified',
  kbVariant: 'kbMatches',
  structuralVariant: 'structuralVariants',
  smallMutation: 'smallMutations',
  therapeuticTarget: 'therapeuticTarget',
};

const PARAM_ATTRIBUTE_MAP = {
  patientId: ['id'],
  projectName: ['name'],
  diagnosis: ['diagnosis'],
  keyVariant: ['geneVariant'],
  kbVariant: ['kbVariant'],
  structuralVariant: ['displayName'],
  smallMutation: ['displayName'],
  therapeuticTarget: ['therapy', 'context'],
};

const fuzzySearchQuery = (searchParams) => {
  try {
    const params = searchParams.match(/(?<=\[).+?(?=\])/g);
    let fuzzyQuery;
    params.forEach((param) => {
      try {
        const delimiter = /[|]/;
        if (delimiter.test(param)) {
          // Extract search categories, keywords, and matching thresholds from search params
          const [paramCategory, paramKeyword, matchingThreshold] = param.split('|');

          // Map out appropriate table, and column names for each category
          const tableName = PARAM_TABLE_MAP[paramCategory];
          const columnName = PARAM_COLUMN_MAP[paramCategory];

          // Construct fuzzy search query
          if (tableName === 'reports') {
            const newFuzzyQuery = `SELECT "id"
                                  FROM (SELECT id, word_similarity('${paramKeyword}', "patient_id") 
                                        FROM reports) AS subquery
                                  WHERE word_similarity >= ${matchingThreshold}
                                  ${fuzzyQuery ? 'INTERSECT' : ''}
                                  ${fuzzyQuery ?? ''}`;
            fuzzyQuery = newFuzzyQuery;
          } else if (tableName === 'projects') {
            const newFuzzyQuery = `SELECT "search_report_id"
                                  FROM (SELECT reports.id AS search_report_id, word_similarity('${paramKeyword}', projects.name) 
                                        FROM projects 
                                        JOIN report_projects ON projects.id = report_projects.project_id 
                                        JOIN reports ON reports.id = report_projects.report_id) AS subquery
                                  WHERE word_similarity >= ${matchingThreshold}
                                  ${fuzzyQuery ? 'INTERSECT' : ''}
                                  ${fuzzyQuery ?? ''}`;
            fuzzyQuery = newFuzzyQuery;
          } else {
            const newFuzzyQuery = `SELECT "report_id"
                                  FROM (SELECT report_id, word_similarity('${paramKeyword}', "${columnName}"), ${tableName}.deleted_at AS dlt 
                                        FROM ${tableName}) AS subquery
                                  WHERE word_similarity >= ${matchingThreshold} AND dlt IS NULL
                                  ${fuzzyQuery ? 'INTERSECT' : ''}
                                  ${fuzzyQuery ?? ''}`;
            fuzzyQuery = newFuzzyQuery;
          }
        } else {
          throw new Error('Invalid search parameters');
        }
      } catch (error) {
        throw new Error(`Unable to process parameters: ${error.message || error}`);
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

const fuzzySearchInclude = (searchParams, db, searchCategory) => {
  try {
    const params = searchParams.match(/(?<=\[).+?(?=\])/g);
    const paramCategories = params.map((param) => {return param.split('|')[0];});
    let fuzzyQuery;

    // Include only necessary models depending on search categories and only values that match with search keyword
    if (paramCategories.includes(searchCategory)) {
      params.forEach((param) => {
        // Extract search categories, keywords, and matching thresholds from search params
        const [paramCategory, paramKeyword, matchingThreshold] = param.split('|');
        if (paramCategory === searchCategory) {
          // Map out appropriate table, and column names for each category
          const tableName = PARAM_TABLE_MAP[paramCategory];
          const columnName = PARAM_COLUMN_MAP[paramCategory];
          // Construct fuzzy search query
          const newFuzzyQuery = `SELECT "${columnName}"
                                FROM (SELECT "${columnName}", word_similarity('${paramKeyword}', "${columnName}") 
                                      FROM ${tableName}) AS subquery
                                WHERE word_similarity >= ${matchingThreshold}
                                ${fuzzyQuery ? 'UNION' : ''}
                                ${fuzzyQuery ?? ''}`;
          fuzzyQuery = newFuzzyQuery;
        }
      });

      // Determine the model to return based on the variant type
      const model = db.models[PARAM_MODEL_MAP[searchCategory]];
      const attributes = PARAM_ATTRIBUTE_MAP[searchCategory];

      return ([
        {
          model,
          as: PARAM_MODEL_MAP[searchCategory],
          attributes,
          separate: true,
          where: {
            [attributes[0]]: {[Op.in]: literal(`(${fuzzyQuery})`)},
          },
        },
      ]);
    }
    return ([]);
  } catch (error) {
    throw new Error(`Unable to include models: ${error.message || error}`);
  }
};

module.exports = {fuzzySearchQuery, fuzzySearchInclude};
