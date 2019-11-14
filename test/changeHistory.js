process.env.NODE_ENV = 'test';

const chai = require('chai');
const chaiHttp = require('chai-http');
const uuidv4 = require('uuid/v4');
const getPort = require('get-port');

chai.should();

chai.use(chaiHttp);
chai.use(require('chai-things'));

// get test user info
const CONFIG = require('../app/config');
const {listen} = require('../app');

CONFIG.set('env', 'test');

const {username, password} = CONFIG.get('testing');

// new project info
const projectData = {
  name: `TEST-PROJECT-${uuidv4()}`,
};

// data for update project
const update = {
  // Can't have duplicate project name so I'm appending a UUID
  name: `UPDATED-TEST-PROJECT-${uuidv4()}`,
};

let server;
// Start API
before(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
});

// Tests history changes and update changes
describe('Tests for update changes', () => {
  let ident;

  before(async () => {
    // create project record
    let res = await chai.request(server)
      .post('/api/1.0/project')
      .auth(username, password)
      .type('json')
      .send(projectData);
    res.should.have.status(201);
    ident = res.body.ident;


    // check that the created project record exists
    res = await chai.request(server)
      .get(`/api/1.0/project/search?query=${projectData.name}`)
      .auth(username, password)
      .type('json');

    res.should.have.status(200);
    res.body = res.body[0];

    res.body.should.have.property('ident');
    res.body.should.have.property('name');
    res.body.should.have.property('createdAt');
    res.body.should.have.property('updatedAt');

    res.body.ident.should.equal(ident);
  });

  // Test update changes
  it('Test update changes', async () => {
    // update project name for given ident
    let res = await chai.request(server)
      .put(`/api/1.0/project/${ident}`)
      .auth(username, password)
      .type('json')
      .send({...update});

    res.should.have.status(200);

    // get updated project and compare to update values
    res = await chai.request(server)
      .get(`/api/1.0/project/search?query=${update.name}`)
      .auth(username, password)
      .type('json');

    res.should.have.status(200);
    res.body.should.be.a('array');
    res.body = res.body[0];

    // Should equal updated values
    res.body.name.should.equal(update.name);
  });

  // Remove newly created/updated project
  after(async () => {
    // delete newly created project
    let res = await chai.request(server)
      .delete(`/api/1.0/project/${ident}`)
      .auth(username, password)
      .type('json');

    res.should.have.status(204);

    // verify project is deleted
    res = await chai.request(server)
      .get(`/api/1.0/POG/project/search?query=${projectData.name}`)
      .auth(username, password)
      .type('json');

    res.should.have.status(404);
  });
});

after(async () => {
  await server.close();
});
