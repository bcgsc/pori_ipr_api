const db = require('../app/models');
// get test user info
const CONFIG = require('../app/config');

CONFIG.set('env', 'test');
const {user, managerUsername, bioinformaticianUsername} = CONFIG.get('testing');

// TODO: move uuid creation to defaults for ident fields in the db;
// remove fixed idents here

beforeAll(async () => {
  // let managerUser;

  // managerUser = await db.models.user.findOne({
  //  where: {username: managerUsername},
  // });
  const adminUser = await db.models.user.findOne({where:{username: user}});
  const [managerUser] = await db.models.user.findOrCreate({
    where: {
      username: managerUsername,
      firstName: managerUsername,
      lastName: managerUsername,
      email: 'ipr@bcgsc.ca',
    },
  });

  const [managerGroup] = await db.models.userGroup.findOrCreate({
    where: {
      name: 'manager',
      owner_id: adminUser.id,
    },
  });

  await db.models.userGroupMember.findOrCreate({
    where: {user_id: managerUser.id, group_id: managerGroup.id},
  });

  const [bioinformaticianUser] = await db.models.user.findOrCreate({
    where: {
      username: bioinformaticianUsername,
      firstName: bioinformaticianUsername,
      lastName: bioinformaticianUsername,
      email: 'ipr@bcgsc.ca',
    },
  });

  const [bioinformaticianGroup] = await db.models.userGroup.findOrCreate({
    where: {
      name: 'Bioinformatician',
      owner_id: adminUser.id,
    },
  });

  await db.models.userGroupMember.findOrCreate({
    where: {user_id: bioinformaticianUser.id, group_id: bioinformaticianGroup.id},
  });
});
