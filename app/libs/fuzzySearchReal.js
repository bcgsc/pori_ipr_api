/* eslint-disable max-len */
const {Op, literal} = require('sequelize');

const PARAM_TABLE_MAP = {
  patientId: 'reports',
  projectName: 'projects',
  diagnosis: 'reports_patient_information',
  keyVariant: 'reports_summary_genomic_alterations_identified',
  kbVariant: 'reports_kb_matches',
};

const PARAM_MODEL_MAP = {
  patientId: 'report',
  projectName: 'projects',
  diagnosis: 'patientInformation',
  keyVariant: 'genomicAlterationsIdentified',
  kbVariant: 'kbMatches',
};

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
    const allFilterObjs = [];
    params.forEach((param) => {
      const filterObj = {};
      // Extract search categories, keywords, and matching thresholds from search params
      const [paramCategory, paramKeyword, matchingThreshold] = param.split('|');

      // Map out appropriate model, table, and column names for each category
      const modelName = PARAM_MODEL_MAP[paramCategory];
      const tableName = PARAM_TABLE_MAP[paramCategory];
      const columnName = PARAM_COLUMN_MAP[paramCategory];
      // Construct fuzzy search query
      filterObj[`$${modelName}.${columnName}$`] = {
        [Op.in]: literal(
          `(SELECT "${columnName}"
                  FROM (SELECT "${columnName}", word_similarity('${paramKeyword}', "${columnName}") FROM ${tableName}) AS subquery
                  WHERE word_similarity >= ${matchingThreshold})`,
        ),
      };
      allFilterObjs.push(filterObj);
    });
    return {[Op.and]: allFilterObjs};
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
