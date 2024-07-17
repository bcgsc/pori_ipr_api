const germline = 'Germline Access';
const nonprod = 'non-production access';
const unreviewed = 'Unreviewed Access';
const createAccess = 'create report access';
const reportAssign = 'report assignment access';

const groupMappings = {
  Bioinformatician: [germline, nonprod, unreviewed, createAccess],
  Analyst: [germline, nonprod, unreviewed, createAccess],
  'Report Manager': [reportAssign, germline, nonprod, unreviewed, createAccess],
  Collaborator: [],
  Clinician: [],
  'External Analyst': [],
  Projects: [germline, nonprod, unreviewed],
  Pipelines: [germline, nonprod, unreviewed],
  Biopsies: [germline, nonprod, unreviewed],
  LIMS: [germline, nonprod, unreviewed],
  Research: [germline, nonprod, unreviewed],
  BioApps: [germline, nonprod, unreviewed],
};

module.exports = {
  up: async (queryInterface) => {
    try {
      await queryInterface.sequelize.transaction(async (transaction) => {
        for (const [key, value] of Object.entries(groupMappings)) {
          const startingGroupName = key;
          for (const targetGroupName of value) {
            await queryInterface.sequelize.query(
              // eslint-disable-next-line no-multi-str
              `insert into user_group_members
              (created_at, updated_at, user_id, group_id)
              select now(), now(), user_id, target_group_id
              from
                (select distinct user_id
                  from user_group_members
                  join user_groups on group_id = user_groups.id
                  where user_group_members.deleted_at is null
                  and user_groups.name = '${startingGroupName}' ) starting_group_users
              cross join (
                  select id as target_group_id from user_groups
                  where name = '${targetGroupName}'
                  and deleted_at is null
              ) t
              where user_id not in (
                select distinct user_id
                  from user_group_members
                  join user_groups on group_id = user_groups.id
                  where user_group_members.deleted_at is null
                  and user_groups.name = '${targetGroupName}'
              )`,
              {
                type: queryInterface.sequelize.QueryTypes.SELECT,
                transaction,
              },
            );
          }
        }
        for (const key of Object.keys(groupMappings)) {
          await queryInterface.sequelize.query(
            // eslint-disable-next-line no-multi-str
            `delete from user_groups where name = '${key}'`,
            {
              transaction,
            },
          );
        }
      });
    } catch (err) {
      console.log(err);
      throw err;
    }
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};
