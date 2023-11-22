module.exports = {
  up: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async () => {
      let unreviewedAcessGroup = await queryInterface.sequelize.query(
        // eslint-disable-next-line no-multi-str
        'select distinct * from user_groups u\
          where name = \'Unreviewed Access\' and deleted_at is null',
        {
          type: queryInterface.sequelize.QueryTypes.SELECT,
        },
      );

      if (unreviewedAcessGroup.length === 0) {
        let user = await queryInterface.sequelize.query(
          // eslint-disable-next-line no-multi-str
          'select distinct * from users u\
            where deleted_at is null',
          {
            type: queryInterface.sequelize.QueryTypes.SELECT,
          },
        );

        console.log(user);
        // user = user[0];
        throw new Error();
        await queryInterface.sequelize.query(
        // eslint-disable-next-line no-multi-str
          `INSERT INTO user_groups (name, owner_id, created_at, updated_at)\
          VALUES('Unreviewed Access', '${user.id}', '${new Date().toLocaleString()}', '${new Date().toLocaleString()}');`,
        );

        unreviewedAcessGroup = await queryInterface.sequelize.query(
          // eslint-disable-next-line no-multi-str
          'select distinct * from user_groups u\
            where name = \'Unreviewed Access\' and deleted_at is null',
          {
            type: queryInterface.sequelize.QueryTypes.SELECT,
          },
        );
      }

      unreviewedAcessGroup = unreviewedAcessGroup[0];

      const userUpdateList = await queryInterface.sequelize.query(
        // eslint-disable-next-line no-multi-str
        'select distinct u.id from users u\
          join user_group_members ugm on (u.id = ugm.user_id)\
          join user_groups ug on (ugm.group_id = ug.id)\
          where ug.name = \'Bioinformatician\' or ug.name = \'Report Manager\'',
        {
          type: queryInterface.sequelize.QueryTypes.SELECT,
        },
      );

      let bulkInsertList = [];

      for (const element of userUpdateList) {
        bulkInsertList.push(
          `(${element.id},\
            ${unreviewedAcessGroup.id},\
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
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};
