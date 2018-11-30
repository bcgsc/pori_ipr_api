module.exports = (sequelize, Sq) => sequelize.define('change_history', {
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
  type: {
    type: Sq.ENUM('create', 'update', 'delete'),
  },
  entry_ident: {
    type: Sq.TEXT,
    allowNull: false,
  },
  model_name: {
    type: Sq.TEXT,
    allowNull: false,
  },
  table_name: {
    type: Sq.TEXT,
    allowNull: false,
  },
  field_name: {
    type: Sq.TEXT,
  },
  display_name: {
    type: Sq.TEXT,
  },
  previous_value: {
    type: Sq.TEXT,
  },
  new_value: {
    type: Sq.TEXT,
  },
  deleted_content: {
    type: Sq.JSONB,
  },
  user_id: {
    type: Sq.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  comment: {
    type: Sq.TEXT,
  },

},
{
  tableName: 'change_history',
  // Automatically create created_at, updated_at, deleted_at
  timestamps: true,
  underscored: true,
});
