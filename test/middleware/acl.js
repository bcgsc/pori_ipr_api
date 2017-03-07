"use strict";

let acl = require('../../app/middleware/oldAcl'),
  assert = require('assert');

// Pseudo response object
let res = {
  status : (status) => {
    return status;
  },
  json: (val) => {
    return val;
  }
};

// Pseudo request object
let req = {
  method: '',
  user: {},
  POG: {}
};



describe('ACL - Check standard GET', () => {
  it('Will determine if by default a user can READ a GET endpoint', (done) => {

    // Setup Request & Response pseudo objects
    req.method = 'GET';
    req.user = {ident: 'testcase'};

    // Check Standard POG GET endpoint
    check = acl().construct(req,res).check();

    assert.equal(check, true);

    done();
  });
});

describe('ACL - Check standard GET request for POG', () => {
  it('Will determine if by default a user can READ a GET endpoint', (done) => {

    // Setup Request & Response pseudo objects
    req.method = 'GET';
    req.user = {ident: 'testcase'};
    req.pog = {
      POGUsers: [
        {
          role: "bioinformatician",
          user: {
            ident: 'testcase'
          }
        },
        {
          role: "analyst",
          user: {
            ident: 'testcase'
          }
        }
      ]
    };

    // Check Standard POG GET endpoint
    check = acl().construct(req,res).isPog().check();

    assert.equal(check, true);

    done();
  });
});