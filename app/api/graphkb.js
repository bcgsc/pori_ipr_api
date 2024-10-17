const request = require('../request');
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
    query.filters = {name: 'therapeutic indicator'};
  } else {
    if (targetType === 'evidenceLevel') {
      query.target = 'EvidenceLevel';
      delete query.limit; // short list with short names, just return all
    } else if (targetType === 'therapy') {
      query.target = 'Therapy';
    } else if (targetType === 'signature') {
      query.target = 'Signature';
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

  const res = await request({
    url: `${uri}/query`,
    method: 'POST',
    body: JSON.stringify(query),
    json: true,
    headers: {
      Authorization: graphkbToken,
      'Content-Type': 'application/json',
    },
  });

  // DEVSU-2344; Filtering results for context route
  // Needs to be done after the query since cannot be combined with ancestors as a subquery
  if (targetType === 'context') {
    res.result = res.result.filter((term) => {
      return [
        'resistance', 'sensitivity', 'toxicity',
      ].includes(term.displayName);
    });
    res.metadata.records = res.result.length;
  }

  return res;
};

/* Get IPR evidence level descriptions from GraphKB
 *
 * @param {string} graphkbToken the Authorization token for the connection to GraphKB
 *
 * @returns {object} response body from graphkb
 */
const graphkbEvidenceLevels = async (graphkbToken) => {
  const {uri} = CONFIG.get('graphkb');

  const query = {
    filters: {
      source: {
        target: 'Source',
        filters: {name: 'ipr'},
      },
    },
    limit: 100,
    skip: 0,
    target: 'EvidenceLevel',
    returnProperties: ['@class', '@rid', 'displayName', 'description'],
  };

  return request({
    url: `${uri}/query`,
    method: 'POST',
    body: JSON.stringify(query),
    json: true,
    headers: {
      Authorization: graphkbToken,
      'Content-Type': 'application/json',
    },
  });
};

/* Get Statement info from GraphKB
 *
 * @param {string} graphkbToken the Authorization token for the connection to GraphKB
 * @param {string} statementId the statement RID to query GraphKB with
 *
 * @returns {object} response body from graphkb
 */
const graphkbStatement = async (graphkbToken, statementId) => {
  const {uri} = CONFIG.get('graphkb');

  const query = {
    filters: [
      {'@rid': `${statementId}`},
    ],
    limit: 1,
    target: 'Statement',
    returnProperties: [
      'conditions.@rid',
      'conditions.@class',
      'conditions.displayName',
      'conditions.reference1.displayName',
      'conditions.type.displayName',
      'conditions.reference2.displayName',
      'relevance.@rid',
      'relevance.displayName',
    ],
  };

  return request({
    url: `${uri}/query`,
    method: 'POST',
    body: JSON.stringify(query),
    json: true,
    headers: {
      Authorization: graphkbToken,
      'Content-Type': 'application/json',
    },
  });
};

const graphkbGetReadonlyGroupId = async (graphkbToken) => {
  const {uri} = CONFIG.get('graphkb');

  const query = {
    filters: [
      {name: 'readonly'},
    ],
    target: 'UserGroup',
    returnProperties: [
      '@rid',
    ],
  };

  return request({
    url: `${uri}/query`,
    method: 'POST',
    body: JSON.stringify(query),
    json: true,
    headers: {
      Authorization: graphkbToken,
      'Content-Type': 'application/json',
    },
  });
};

const graphkbAddUser = async (graphkbToken, userName, userEmail, groupId) => {
  const {uri} = CONFIG.get('graphkb');

  const query = {
    name: userName,
    email: userEmail,
    groups: [groupId],
  };

  return request({
    url: `${uri}/users`,
    method: 'POST',
    body: JSON.stringify(query),
    json: true,
    headers: {
      Authorization: graphkbToken,
      'Content-Type': 'application/json',
    },
  });
};

module.exports = {
  graphkbAutocomplete,
  graphkbEvidenceLevels,
  graphkbStatement,
  graphkbGetReadonlyGroupId,
  graphkbAddUser,
};
