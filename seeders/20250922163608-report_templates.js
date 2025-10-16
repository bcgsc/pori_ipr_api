const {v4: uuidv4} = require('uuid');
const images = require('./constants/images.json');
const templates = require('./constants/templates.json');
const projects = require('./constants/projects.json');
const users = require('./constants/users.json');
const userGroups = require('./constants/user_groups.json');

const addBaseColumns = (records) => {
  return records.map((record) => {
    return {
      ...record,
      ident: uuidv4(),
      created_at: new Date(),
      updated_at: new Date(),
    };
  });
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const templatesData = templates.map((template) => {
      template.sections = JSON.stringify(template.sections);
      return template;
    });
    await queryInterface.bulkInsert('images', addBaseColumns(images), {});
    await queryInterface.bulkInsert('templates', addBaseColumns(templatesData), {});
    await queryInterface.bulkInsert('projects', addBaseColumns(projects), {});
    await queryInterface.bulkInsert('users', addBaseColumns(users), {});
    await queryInterface.bulkInsert('user_groups', addBaseColumns(userGroups), {});

    // give admin permission to user pori_admin
    const usersData = await queryInterface.sequelize.query(
      'SELECT id, username FROM users;',
      {type: Sequelize.QueryTypes.SELECT},
    );
    const poriAdmin = usersData.find((u) => {return u.username === 'pori_admin';});
    const groupsData = await queryInterface.sequelize.query(
      'SELECT id, name FROM user_groups;',
      {type: Sequelize.QueryTypes.SELECT},
    );
    const adminGroup = groupsData.find((g) => {return g.name === 'admin';});
    const userGroupData = [{
      user_id: poriAdmin.id,
      group_id: adminGroup.id,
      created_at: new Date(),
      updated_at: new Date(),
    }];

    await queryInterface.bulkInsert('user_group_members', userGroupData);
    await queryInterface.bulkInsert('user_metadata', addBaseColumns([{user_id: poriAdmin.id}]));
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('user_metadata', null, {});
    await queryInterface.bulkDelete('user_group_members', null, {});
    await queryInterface.bulkDelete('templates', null, {});
    await queryInterface.bulkDelete('images', null, {});
    await queryInterface.bulkDelete('projects', null, {});
    await queryInterface.bulkDelete('users', null, {});
    await queryInterface.bulkDelete('user_groups', null, {});
  },
};
