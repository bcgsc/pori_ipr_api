// Mock graphkb middleware calls
jest.mock('../app/middleware/graphkb', () => {
  const nconf = require('../app/config');
  return {
    graphkbLoginMiddleware: async (req, res, next) => {
      const {username, password} = nconf.get('graphkb');
      if (username && password) {
        req.graphkbToken = 'Valid token';
      }
      return next();
    },
  };
});

// Mock graphkb api calls
jest.mock('../app/api/graphkb', () => {
  return {
    graphkbAutocomplete: async (targetType, graphkbToken, keyword = null) => {
      if (!graphkbToken) {
        throw new Error('Invalid token');
      }

      let classValue = 'Variant';

      switch (targetType) {
        case 'context':
          classValue = 'Vocabulary';
          break;
        case 'evidenceLevel':
          classValue = 'EvidenceLevel';
          break;
        case 'therapy':
          classValue = 'Therapy';
          break;
      }

      return {
        result: [{
          '@rid': '#108:30',
          '@class': classValue,
          displayName: (keyword) ? `${keyword} display name` : 'Random display name',
        }],
      };
    },
    graphkbEvidenceLevels: async (graphkbToken) => {
      if (!graphkbToken) {
        throw new Error('Invalid token');
      }

      return {
        result: [{
          '@rid': '#108:31',
          '@class': 'EvidenceLevel',
          displayName: 'IPR-A',
          description: 'Some description',
        }],
      };
    },
    graphkbReviewStatus: async (graphkbToken, graphkbEntries) => {
      if (!graphkbToken) {
        throw new Error('Invalid token');
      }

      if (!graphkbEntries) {
        return [];
      }

      return [{
        '@rid': '#108:32',
        '@class': 'Statement',
        reviewStatus: 'not required',
      }];
    },
  };
});
