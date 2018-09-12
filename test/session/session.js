"use strict";

// chai dependencies
const chai          = require('chai');
const chaiHttp      = require('chai-http');
const chaiAsPromised = require('chai-as-promised');
// supertest dependencies
const supertest     = require('supertest');

chai.use(chaiAsPromised);
const should        = chai.should();
const expect        = chai.expect;

const api           = supertest('http://localhost:8081');

const Session       = require(`${process.cwd()}/app/libs/Session`);
const testData    = require("../setupTestData.js");


describe('Session Creation and Authentication', function() {
    before(function(done) {
        //Initialize testing data
        testData.createTestAccounts();

        done();
    });

    after(function() {
        // Delete testing data
        testData.deleteTestAccounts();
    });
  
    const fakeUser      = 'fakeUser';
    const fakePassword  = 'fakePassword';
    const fakeSession   = new Session(fakeUser, fakePassword);

    const realUser = "aUserForTesting";
    const realPassword ="aVerySecurePassword";
    const realSession   = new Session(realUser, realPassword);

    it('Returns a new session instance', function(done) {
        expect(fakeSession.username).to.equal(fakeUser);
        expect(fakeSession.password).to.equal(fakePassword);

        done();
    });

    it('Cannot find user with credentials', function(done) {
        const userNotFoundError = {
            message: 'Unable to find a user with the provided credentials',
            code: 'userNotFound'
        }

        expect(fakeSession.authenticate()).to.be.rejectedWith(userNotFoundError);

        done();
    });

    it('Can find user with credentials', function(done) {   // TODO: rewrite test when authentication is decoupled from http requests
        const noRequestHeaderError = {
            message: 'Unable to authenticate with the provided credentials',
            code: 'failedAuthentication'
        }

        expect(realSession.authenticate()).to.be.rejectedWith(noRequestHeaderError);
        
        done();
    })
  
});
