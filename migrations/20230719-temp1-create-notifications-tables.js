const { addUniqueActiveFieldIndex } = require('../migrationTools/index');

const USERNOTIFICATIONS = 'project_user_notifications';
const USERGROUPNOTIFICATIONS = 'project_user_group_notifications';
const { DEFAULT_COLUMNS } = require('../app/models/base');

module.exports = {
    up: (queryInterface, Sq) => {
        // Create table
        return queryInterface.sequelize.transaction(async (transaction) => {
            // Remove all deleted tmbur entries and create new tmbur_mutation_burden table
            await queryInterface.createTable(USERNOTIFICATIONS, {
                ...DEFAULT_COLUMNS,
                projectId: {
                    name: 'projectId',
                    field: 'project_id',
                    type: Sq.INTEGER,
                    references: {
                        model: 'projects',
                        key: 'id',
                    },
                    onDelete: 'CASCADE',
                    onUpdate: 'CASCADE',
                    allowNull: false,
                },
                userId: {
                    name: 'userId',
                    field: 'user_id',
                    type: Sq.INTEGER,
                    references: {
                        model: 'users',
                        key: 'id',
                    },
                    onDelete: 'CASCADE',
                    onUpdate: 'CASCADE',
                    allowNull: false,
                },
                templateId: {
                    name: 'templateId',
                    field: 'template_id',
                    type: Sq.INTEGER,
                    references: {
                        model: 'templates',
                        key: 'id',
                    },
                    onDelete: 'CASCADE',
                    onUpdate: 'CASCADE',
                    allowNull: false,
                },
                eventType: {
                    name: 'eventType',
                    field: 'event_type',
                    type: Sq.STRING,
                    allowNull: false,
                }
            }, { transaction });

            await queryInterface.createTable(USERGROUPNOTIFICATIONS, {
                ...DEFAULT_COLUMNS,
                projectId: {
                    name: 'projectId',
                    field: 'project_id',
                    type: Sq.INTEGER,
                    references: {
                        model: 'projects',
                        key: 'id',
                    },
                    onDelete: 'CASCADE',
                    onUpdate: 'CASCADE',
                    allowNull: false,
                },
                userId: {
                    name: 'userGroupId',
                    field: 'user_group_id',
                    type: Sq.INTEGER,
                    references: {
                        model: 'user_groups',
                        key: 'id',
                    },
                    onDelete: 'CASCADE',
                    onUpdate: 'CASCADE',
                    allowNull: false,
                },
                templateId: {
                    name: 'templateId',
                    field: 'template_id',
                    type: Sq.INTEGER,
                    references: {
                        model: 'templates',
                        key: 'id',
                    },
                    onDelete: 'CASCADE',
                    onUpdate: 'CASCADE',
                    allowNull: false,
                },
                eventType: {
                    name: 'eventType',
                    field: 'event_type',
                    type: Sq.STRING,
                    allowNull: false,
                }
            }, { transaction });

            // TODO; indexes?
        });
    },

    down: () => {
        throw new Error('Not Implemented!');
    },
};
