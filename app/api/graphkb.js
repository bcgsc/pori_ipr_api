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

  let query;
  const mapping = {
    evidence: 'EvidenceLevel',
    variant: 'Variant',
    therapy: 'Therapy',
  };

  if (targetType === 'context') {
    query = {
      target: 'Vocabulary',
      queryType: 'ancestors',
      filters: {name: 'therapeutic efficacy'},
    };
  } else {
    query = {target: mapping[targetType], limit: AUTOCOMPLETE_LIMIT};
    if (keyword) {
      query.keyword = keyword;
      query.queryType = 'keyword';
    }
  }
  const data = await request({
    uri: `${uri}/query`,
    method: 'POST',
    body: {
      ...query,
      neighbors: 1,
      limit: AUTOCOMPLETE_LIMIT,
      returnProperties: ['@class', '@rid', 'displayName'],
      orderBy: ['@class', 'displayName'],
    },
    json: true,
    headers: {
      Authorization: graphkbToken,
    },
  });
  return data;
};

module.exports = {graphkbAutocomplete};
