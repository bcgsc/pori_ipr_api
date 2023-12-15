const {v4: uuidv4} = require('uuid');

module.exports = {
  up: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async () => {
      let germlineAccessGroup = await queryInterface.sequelize.query(
        // eslint-disable-next-line no-multi-str
        'select distinct * from user_groups u\
          where name = \'Germline Access\' and deleted_at is null',
        {
          type: queryInterface.sequelize.QueryTypes.SELECT,
        },
      );

      if (germlineAccessGroup.length === 0) {
        let user = await queryInterface.sequelize.query(
          // eslint-disable-next-line no-multi-str
          'select distinct u.id from users u\
            where (username = \'ipr-bamboo-admin\' or username = \'iprdemo\')\
            and deleted_at is null',
          {
            type: queryInterface.sequelize.QueryTypes.SELECT,
          },
        );

        user = user[0];

        await queryInterface.sequelize.query(
        // eslint-disable-next-line no-multi-str
          `INSERT INTO user_groups (name, owner_id, created_at, updated_at, ident)\
          VALUES('Germline Access',\
          '${user.id}',\
          '${new Date().toLocaleString()}',\
          '${new Date().toLocaleString()}',\
          '${uuidv4()}');`,
        );

        germlineAccessGroup = await queryInterface.sequelize.query(
          // eslint-disable-next-line no-multi-str
          'select distinct * from user_groups u\
            where name = \'Germline Access\' and deleted_at is null',
          {
            type: queryInterface.sequelize.QueryTypes.SELECT,
          },
        );
      }

      germlineAccessGroup = germlineAccessGroup[0];

      const userUpdateList = await queryInterface.sequelize.query(
        // eslint-disable-next-line no-multi-str
        'select distinct u.id from users u\
          join user_group_members ugm on (u.id = ugm.user_id)\
          join user_groups ug on (ugm.group_id = ug.id)\
          where not ug.name = \'Clinician\' and not ug.name = \'Collaborator\'',
        {
          type: queryInterface.sequelize.QueryTypes.SELECT,
        },
      );

      if (userUpdateList.length > 0) {
        let bulkInsertList = [];

        for (const element of userUpdateList) {
          bulkInsertList.push(
            `(${element.id},\
              ${germlineAccessGroup.id},\
              '${new Date().toLocaleString()}',\
              '${new Date().toLocaleString()}')`,
          );
        }

        bulkInsertList = bulkInsertList.join(', ');

        const insertReturn = await queryInterface.sequelize.query(
          // eslint-disable-next-line no-multi-str
          `INSERT INTO user_group_members (user_id, group_id, created_at, updated_at)\
            VALUES ${bulkInsertList};`,
        );

        console.log(`${insertReturn[1]} users updated`);
      } else {
        console.log('No users to be updated');
      }
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};
