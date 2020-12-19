const request = require('request-promise-native');

const CONFIG = require('../config');


const AUTOCOMPLETE_LIMIT = 50;

/**
 * Get therapeutic options auto-completes from the GraphKB AUTOCOMPLETE_LIMIT
 *
 * @param {string} targetType the type of record being auto-completed
 * @param {string} graphkbToken the Authorization token for the connection to GraphKB
 * @param {string} keyword the keyword being searched for (optional)
 *
 * @returns {object} response body from graphkb
 */
const graphkbAutocomplete = async (targetType, graphkbToken, keyword = null) => {
  const {uri} = CONFIG.get('graphkb');

  const query = {
    returnProperties: ['@class', '@rid', 'displayName'],
    neighbors: 1,
    limit: AUTOCOMPLETE_LIMIT,
    orderBy: ['@class', 'displayName'],
  };

  if (targetType === 'context') {
    query.target = 'Vocabulary';
    query.queryType = 'ancestors';
    query.filters = {name: 'therapeutic efficacy'};
  } else {
    if (targetType === 'evidenceLevel') {
      query.target = 'EvidenceLevel';
      delete query.limit; // short list with short names, just return all
    } else if (targetType === 'therapy') {
      query.target = 'Therapy';
    } else {
      query.target = 'Variant';
      query.returnProperties.push(...[
        'reference1.displayName',
        'reference2.displayName',
        'type.displayName',
      ]);
    }

    if (keyword) {
      query.keyword = keyword;
      query.queryType = 'keyword';
    }
  }
  const data = await request({
    uri: `${uri}/query`,
    method: 'POST',
    body: query,
    json: true,
    headers: {
      Authorization: graphkbToken,
    },
  });
  return data;
};

/**
 * Get review status of entries from GraphKB
 *
 * @param {string} graphkbToken the Authorization token for the connection to GraphKB
 * @param {array} graphkbEntries array of graphkb results from IPR database
 *
 * @returns {object} response body from graphkb
 */
const graphkbReviewStatus = async (graphkbToken, graphkbEntries) => {
  const {uri} = CONFIG.get('graphkb');

  const filters = {
    '@rid': graphkbEntries.map(({kbStatementId}) => {
      return kbStatementId;
    }),
    operator: 'IN',
  };
  const query = {
    target: 'Statement',
    filters,
    returnProperties: ['@class', '@rid', 'reviewStatus'],
    orderBy: ['@rid'],
  };

  const {result} = await request({
    uri: `${uri}/query`,
    method: 'POST',
    body: query,
    json: true,
    headers: {
      Authorization: graphkbToken,
    },
  });

  return result;
};


module.exports = {graphkbAutocomplete, graphkbReviewStatus};
