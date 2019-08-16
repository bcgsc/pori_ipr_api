process.env.NODE_ENV = 'local';

const nconf = require('nconf').argv();
const chai = require('chai');
const chaiHttp = require('chai-http');

chai.should();


chai.use(chaiHttp);
chai.use(require('chai-things'));

// Get a copy number analysis
describe('Basic Test Suite', () => {
  let server;
  before(async () => {
    server = await require('../app.js');
  });
  it('Test Case', (done) => {
    [1, 2, 3].indexOf(5).should.equal(-1);
    console.log('Finished');

    done();
  });
  after(() => {
    server.close();
  });
});
