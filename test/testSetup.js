const db = require('../app/models');

const CONFIG = require('../app/config');

CONFIG.set('env', 'test');
const {managerUsername, bioinformaticianUsername} = CONFIG.get('testing');

beforeAll(async () => {
  const [managerUser] = await db.models.user.findOrCreate({
    where: {
      username: managerUsername,
      firstName: managerUsername,
      lastName: managerUsername,
      email: 'ipr@bcgsc.ca',
    },
  });

  await db.models.userGroup.findOrCreate({
    where: {userId: managerUser.id, name: 'manager'},
  });

  await db.models.user.findOrCreate({
    where: {
      username: bioinformaticianUsername,
      firstName: bioinformaticianUsername,
      lastName: bioinformaticianUsername,
      email: 'ipr@bcgsc.ca',
    },
  });
});
