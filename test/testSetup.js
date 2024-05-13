const {v4: uuidv4} = require('uuid');

const db = require('../app/models');
// get test user info
const CONFIG = require('../app/config');

CONFIG.set('env', 'test');
const {managerUsername, bioinformaticianUsername} = CONFIG.get('testing');

// Start API
module.exports(async () => {
  let managerUser;
  let managerGroup;
  let bioinformaticianUser;
  let bioinformaticianGroup;
  managerUser = await db.models.user.findOne({
    where: {username: managerUsername},
  });
  if (!managerUser) {
    managerUser = await db.models.user.create({
      ident: uuidv4(),
      username: 'ipr-bamboo-manager',
      firstName: 'ipr-bamboo-manager',
      lastName: 'ipr-bamboo-manager',
      email: 'dat@bcgsc.ca',
    });
  }
  managerGroup = await db.models.userGroup.findOne({
    where: {name: 'manager'},
  });
  if (!managerGroup) {
    managerGroup = await db.models.userGroup.create({
      ident: uuidv4(),
      name: 'manager',
    });
  }
  await db.models.userGroupMember.findOrCreate({
    where: {user_id: managerUser.id, group_id: managerGroup.id},
  });

  bioinformaticianUser = await db.models.user.findOne({
    where: {username: bioinformaticianUsername},
  });
  if (!bioinformaticianUser) {
    bioinformaticianUser = await db.models.user.create({
      ident: uuidv4(),
      username: 'ipr-bamboo-bioinformatician',
      firstName: 'ipr-bamboo-bioinformatician',
      lastName: 'ipr-bamboo-bioinformatician',
      email: 'dat@bcgsc.ca',
    });
  }
  bioinformaticianGroup = await db.models.userGroup.findOne({
    where: {name: 'Bioinformatician'},
  });
  if (!bioinformaticianGroup) {
    bioinformaticianGroup = await db.models.userGroup.create({
      ident: uuidv4(),
      name: 'Bioinformatician',
    });
  }
  await db.models.userGroupMember.findOrCreate({
    where: {user_id: bioinformaticianUser.id, group_id: bioinformaticianGroup.id},
  });
});
