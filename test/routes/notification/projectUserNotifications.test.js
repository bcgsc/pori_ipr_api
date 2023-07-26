const getPort = require('get-port');
const supertest = require('supertest');
const { v4: uuidv4 } = require('uuid');
const HTTP_STATUS = require('http-status-codes');

const db = require('../../../app/models');
// get test user info
const CONFIG = require('../../../app/config');
const { listen } = require('../../../app');

CONFIG.set('env', 'test');
const { username, password } = CONFIG.get('testing');

const punProperties = [
    'ident', 'createdAt', 'updatedAt', 'projectId',
    'userId', 'templateId', 'eventType',
];

const checkPun = (punObject) => {
    punProperties.forEach((element) => {
        expect(punObject).toHaveProperty(element);
    });
};

const checkPuns = (puns) => {
    puns.forEach((pun) => {
        checkPun(pun);
    });
};

let server;
let request;

// Start API
beforeAll(async () => {
    const port = await getPort({ port: CONFIG.get('web:port') });
    server = await listen(port);
    request = supertest(server);
});

// Tests for project user endpoints
describe('/notification/project-user-notifications', () => {
    let testUser;
    let project;
    let template;
    let user01;
    let user02;

    beforeAll(async () => {
        // get test user
        testUser = await db.models.user.findOne({
            where: { username },
        });

        // Create projects
        project = await db.models.project.create({ name: 'pun-project-test01' });
        project2 = await db.models.project.create({ name: 'pun-project-test02' });

        // Create template
        const templateData = {
            name: 'PUN test template',
            organization: 'Test Create Org',
            description: 'This is a template used for running tests',
            sections: [
                'microbial',
                'msi',
                'small-mutation',
            ],
        };
        template = await db.models.template.create(templateData);

        // Create users
        user01 = await db.models.user.create({
            ident: uuidv4(),
            username: uuidv4(),
            firstName: 'userProjectUser01',
            lastName: 'userProjectUser01',
            email: 'userProjectUser01@email.com',
        });

        user02 = await db.models.user.create({
            ident: uuidv4(),
            username: uuidv4(),
            firstName: 'userProjectUser02',
            lastName: 'userProjectUser02',
            email: 'userProjectUser02@email.com',
        });

        // Bind users to project
        binding1 = await db.models.userProject.create({ project_id: project.id, user_id: testUser.id });
        binding2 = await db.models.userProject.create({ project_id: project.id, user_id: user01.id });
        binding3 = await db.models.userProject.create({ project_id: project2.id, user_id: user01.id });

        pun1 = await db.models.projectUserNotification.create({
            ident: uuidv4(),
            projectId: project.id,
            userId: testUser.id,
            templateId: template.id,
            eventType: 'test event 1'
        })

        pun2 = await db.models.projectUserNotification.create({
            ident: uuidv4(),
            projectId: project.id,
            userId: user01.id,
            templateId: template.id,
            eventType: 'test event 2'
        })

        pun3 = await db.models.projectUserNotification.create({
            ident: uuidv4(),
            projectId: project2.id,
            userId: testUser.id,
            templateId: template.id,
            eventType: 'test event 3'
        })
    });

    afterAll(async () => {
        return Promise.all([
            project.destroy({ force: true }),
            user01.destroy({ force: true }),
            project2.destroy({ force: true }),
            template.destroy({ force: true }),
        ]);
    });

    describe('GET', () => {
        test('/ - 200 Success', async () => {
            const res = await request
                .get('/api/notification/project-user-notifications')
                .auth(username, password)
                .type('json')
                .send({ project: project.ident })
                .expect(HTTP_STATUS.OK);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(2);
            checkPuns(res.body);
        });
    });

    describe('GET', () => {
        test('/ - 200 Success', async () => {
            const res = await request
                .get('/api/notification/project-user-notifications')
                .auth(username, password)
                .type('json')
                .send({ project: project.ident, user: testUser.ident })
                .expect(HTTP_STATUS.OK);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(1);
            checkPuns(res.body);
        });
    });

    describe('GET', () => {
        test('/ - 200 Success', async () => {
            const res = await request
                .get('/api/notification/project-user-notifications')
                .auth(username, password)
                .type('json')
                .send({ user: testUser.ident })
                .expect(HTTP_STATUS.OK);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(2);
            checkPuns(res.body);
        });
    });


    describe('POST', () => {
        test('/ - 200 Success', async () => {
            await request
                .post('/api/notification/project-user-notifications')
                .auth(username, password)
                .type('json')
                .send({ user: testUser.ident, project: project.ident, event_type: 'test event', template: template.ident })
                .expect(HTTP_STATUS.CREATED);

            // Check the binding was created
            const result = await db.models.projectUserNotification.findOne({
                where: { project_id: project.id, user_id: testUser.id, event_type: 'test event' },
            });

            expect(result).not.toBeNull();

            // Remove the just created test user-project binding
            await db.models.projectUserNotification.destroy({
                where: { id: result.id },
                force: true,
            });
        });

        test('/ - 404 Not Found - Cannot find provided user', async () => {
            await request
                .post('/api/notification/project-user-notifications')
                .auth(username, password)
                .type('json')
                .send({ user: uuidv4(), project: project.ident, event_type: 'test event 2', template: template.ident })
                .expect(HTTP_STATUS.NOT_FOUND);
        });
    });

    describe('DELETE', () => {
        test('/ - 204 Success', async () => {
            // create pun
            const pun = await db.models.projectUserNotification.create({
                ident: uuidv4(),
                projectId: project.id,
                userId: testUser.id,
                templateId: template.id,
                eventType: 'test event to delete'
            });

            await request
                .delete('api/notification/project-user-notifications')
                .auth(username, password)
                .type('json')
                .send({ ident: pun.ident })
                .expect(HTTP_STATUS.NO_CONTENT);

            // Verify user-project binding is soft-deleted
            const deletedPun = await db.models.projectUserNotification.findOne({
                where: { id: pun.id },
                paranoid: false,
            });

            expect(deletedPun.deletedAt).not.toBeNull();

            await deletedPun.destroy({ force: true });
        });

        test('/ - 404 Not Found - Cannot find provided notification', async () => {
            await request
                .delete('api/notification/project-user-notifications')
                .auth(username, password)
                .type('json')
                .send({ ident: uuidv4() })
                .expect(HTTP_STATUS.NOT_FOUND);
        });
    });
});

afterAll(async () => {
    await server.close();
});
