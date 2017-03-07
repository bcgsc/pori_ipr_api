"use strict";

module.exports = (sequelize, Sq) => {
  let POGUser = sequelize.define('POGUser', {
    id: {
      type: Sq.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    ident: {
      type: Sq.UUID,
      unique: true,
      defaultValue: Sq.UUIDV4
    },
    role: {
      type: Sq.ENUM('clinician', 'bioinformatician', 'analyst', 'reviewer', 'admin'),
      allowNull: false
    },
    pog_id: {
      type: Sq.INTEGER,
      references: {
        model: 'POGs',
        key: 'id',
      }
    },
    user_id: {
      type: Sq.INTEGER,
      references: {
        model: 'users',
        key: 'id',
      }
    },
    addedBy_id: {
      type: Sq.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      }
    }

  },
  {
    // Automatically create createdAt, updatedAt, deletedAt
    timestamps: true,
    // Use soft-deletes
    paranoid: true,
  });

  return POGUser;
};

