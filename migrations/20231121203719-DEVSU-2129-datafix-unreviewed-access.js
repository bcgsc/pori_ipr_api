const db = require('../app/models');

module.exports = {
  up: async (queryInterface, Sq) => {
    const user = await db.models.user.findOne({
      where: {username: 'ipr-bamboo-admin'},
      attributes: ['id', 'ident'],
    });

    const unreviewedAcessGroup = await db.models.userGroup.findOrCreate({
      where: {
        name: 'Unreviewed Access',
        owner_id: user.id,
      },
    });

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

    const bulkInsertList = [];

    for (const element of userUpdateList) {
      bulkInsertList.push({
        user_id: element.id,
        group_id: unreviewedAcessGroup[0].id,
      });
    }

    const insertReturn = await db.models.userGroupMember.bulkCreate(
      bulkInsertList,
    );

    console.log(`${insertReturn.length} users updated`);
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};
