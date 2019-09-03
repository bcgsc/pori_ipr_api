const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('./base');

module.exports = sequelize => sequelize.define('POG', {
  ...DEFAULT_COLUMNS,
  POGID: {
    type: Sq.STRING,
    unique: false,
  },
  nonPOG: {
    type: Sq.BOOLEAN,
    defaultValue: false,
  },
  project: {
    type: Sq.STRING,
    defaultValue: 'POG',
  },
  alternate_identifier: {
    type: Sq.STRING,
  },
  age_of_consent: {
    type: Sq.INTEGER,
  },
},
{
  ...DEFAULT_OPTIONS,
  scopes: {
    public: {
      attributes: {
        exclude: ['deletedAt'],
      },
    },
  },
});
