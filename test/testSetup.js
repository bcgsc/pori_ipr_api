const {v4: uuidv4} = require('uuid');

const db = require('../app/models');
// get test user info
const CONFIG = require('../app/config');

CONFIG.set('env', 'test');
const {managerUsername, bioinformaticianUsername} = CONFIG.get('testing');

// TODO: move uuid creation to defaults for ident fields in the db;
// remove fixed idents here

beforeAll(async () => {
  let managerUser;
  let managerGroup;
  let bioinformaticianUser;
  let bioinformaticianGroup;
  managerUser = await db.models.user.findOne({
    where: {username: managerUsername},
  });
  if (!managerUser) {
    managerUser = await db.models.user.findOrCreate({
      where: {
      ident: '2a46cd1e-913f-4e7c-a055-0050d0586ed2',
      username: managerUsername,
      firstName: managerUsername,
      lastName: managerUsername,
      email: 'dat@bcgsc.ca',
      }
    });
  }
  managerGroup = await db.models.userGroup.findOne({
    where: {name: 'manager'},
  });
  if (!managerGroup) {
    managerGroup = await db.models.userGroup.findOrCreate({
      where: {
      ident: 'c748c8d9-af5b-4a53-b94f-410eef89f8d0',
      name: 'manager',
      }
    });
  }
  const managerAddedToGroup = await db.models.userGroupMember.findOrCreate({
    where: {user_id: managerUser.id, group_id: managerGroup.id},
  });

  bioinformaticianUser = await db.models.user.findOne({
    where: {username: bioinformaticianUsername},
  });
  if (!bioinformaticianUser) {
    bioinformaticianUser = await db.models.user.findOrCreate({
      where: {
      ident: '5080af7a-8b6b-4249-b026-d2e781bd8efa',
      username: bioinformaticianUsername,
      firstName: bioinformaticianUsername,
      lastName: bioinformaticianUsername,
      email: 'dat@bcgsc.ca',
      }
    });
  }
  bioinformaticianGroup = await db.models.userGroup.findOne({
    where: {name: 'Bioinformatician'},
  });
  if (!bioinformaticianGroup) {
    bioinformaticianGroup = await db.models.userGroup.findOrCreate({
      where: {
      ident: '3dfcf75e-fed8-11e6-bc64-92361f002671',
      name: 'Bioinformatician',
      owner_id: managerUser.id,
      }
    });
  }
  await db.models.userGroupMember.findOrCreate({
    where: {user_id: bioinformaticianUser.id, group_id: bioinformaticianGroup.id},
  });
});
