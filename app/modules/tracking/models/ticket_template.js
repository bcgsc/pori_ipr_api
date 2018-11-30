const Sq = require('sequelize');

module.exports = sequelize => sequelize.define('tracking_ticket_template',
  {
    id: {
      type: Sq.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    ident: {
      type: Sq.UUID,
      unique: true,
      defaultValue: Sq.UUIDV4,
    },
    definition_id: {
      type: Sq.INTEGER,
      references: {
        model: 'pog_tracking_state_definitions',
        key: 'id',
      },
    },
    project: {
      type: Sq.STRING,
      allowNull: false,
    },
    name: {
      type: Sq.STRING,
      allowNull: false,
    },
    summary: {
      type: Sq.STRING,
      allowNull: false,
    },
    body: {
      type: Sq.TEXT,
      allowNull: true,
    },
    priority: {
      type: Sq.STRING,
      allowNull: false,
      default: 'medium',
    },
    security: {
      type: Sq.INTEGER,
      defaultValue: null,
      allowNull: true,
    },
    issueType: {
      type: Sq.STRING,
      allowNull: false,
    },
    status: {
      type: Sq.STRING,
      defaultValue: 'open',
    },
    components: {
      type: Sq.JSONB,
      default: [],
    },
    tags: {
      type: Sq.JSONB,
      default: [],
    },
  },
  {
    tableName: 'pog_tracking_ticket_template',
    // Automatically create createdAt, updatedAt, deletedAt
    timestamps: true,
    // Use soft-deletes!
    paranoid: true,
    scopes: {
      public: {
        attributes: {
          exclude: ['deletedAt'],
        },
        include: [
          {model: sequelize.models.tracking_state_definition.scope('public'), as: 'definition'},
        ],
      },
    },
  });
