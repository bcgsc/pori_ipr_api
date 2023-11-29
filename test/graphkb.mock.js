// Mock graphkb middleware calls
jest.mock('../app/middleware/graphkb', () => {
  const nconf = require('../app/config');
  return async (req, res, next) => {
    const {username, password} = nconf.get('graphkb');
    if (username && password) {
      req.graphkbToken = 'Valid token';
    }
    return next();
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

    graphkbStatement: async (graphkbToken, statementId) => {
      if (!graphkbToken) {
        throw new Error('Invalid token');
      }
      if (!statementId) {
        throw new Error('No statementId given');
      }

      return {
        metadata: {
          records: 1,
        },
        result: [
          {
            conditions: [
              {
                '@class': 'PositionalVariant',
                '@rid': '#159:5455',
                displayName: 'BRAF:p.V600E',
                reference1: {
                  displayName: 'BRAF',
                },
                reference2: null,
                type: {
                  displayName: 'missense mutation',
                },
              },
              {
                '@class': 'Therapy',
                '@rid': '#123:40604',
                displayName: 'panitumumab [DB01269]',
                reference1: null,
                reference2: null,
                type: null,
              },
              {
                '@class': 'Disease',
                '@rid': '#135:19439',
                displayName: 'colorectal adenocarcinoma [COADREAD]',
                reference1: null,
                reference2: null,
                type: null,
              },
            ],
            relevance: {
              '@rid': '#146:46',
              displayName: 'resistance',
            },
          },
        ],
      };
    },
  };
});
