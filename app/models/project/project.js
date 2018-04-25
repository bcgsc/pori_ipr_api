"use strict";

module.exports = (sequelize, Sq) => {
  let project = sequelize.define('project', {
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
      name: {
        type: Sq.STRING,
        unique: true,
        allowNull: false
      },
    },
    {
      // Automatically create createdAt, updatedAt, deletedAt
      timestamps: true,
      // Use soft-deletes!
      paranoid: true,
      scopes: {
        public: {
          attributes: {
            exclude: ['deletedAt']
          },
        }
      },
      hooks: {
          afterCreate: function(project) {
            // every new project should be associated with control sample COLO829
            sequelize.models.POG.findOne({where: {"POGID": 'COLO829'}})
            .then((pog) => {
              return sequelize.models.pog_project.create({project_id: project.id, pog_id: pog.id});
            })
            .catch((err) => {
              console.log('Unable to bind COLO829 to project');
              console.log(err);
            });
          }
      }
    });

  return project;
};

