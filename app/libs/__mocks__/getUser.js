const db = require('../../models');

const include = [
  {
    model: db.models.userGroup,
    as: 'groups',
    attributes: {
      exclude: ['id', 'deletedAt', 'updatedAt', 'createdAt', 'updatedBy'],
    },
    through: {attributes: []},
  },
  {
    model: db.models.project,
    as: 'projects',
    attributes: {
      exclude: ['id', 'deletedAt', 'updatedAt', 'createdAt', 'updatedBy'],
    },
    through: {attributes: []},
  },
  {
    model: db.models.userMetadata,
    as: 'metadata',
    attributes: {
      exclude: ['id', 'deletedAt', 'updatedAt', 'createdAt', 'updatedBy', 'userId'],
    },
  },
];

const getUser = async (req) => {
  const token = req.header('Authorization') || '';

  const credentials = Buffer.from(token.split(' ')[1], 'base64').toString('utf-8').split(':');
  const respUser = await db.models.user.findOne({
    where: {username: credentials[0]},
    attributes: {exclude: ['password']},
    include,
  });
  return respUser;
};

module.exports = {
  getUser,
};
