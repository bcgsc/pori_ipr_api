"use strict";

let p2s = require('../../app/libs/pyToSql'),
    assert = require('assert');


describe('PythonToSQL', () => {
  it('Parses Python values into SQL-Safe values', (done) => {
    let hashmap = {
      naTest: 'na',
      infTest: 'inf',
      ninfTest: '-inf',
      falsPos: 'falsPos',
      ignored: 'ignored'
    };

    // Test Hash Mapping
    let results = p2s(hashmap, ['naTest', 'infTest', 'ninfTest', 'falsPos']);

    assert.equal(results.naTest, null);
    assert.equal(results.infTest, '+infinity');
    assert.equal(results.ninfTest, '-infinity');
    assert.equal(results.falsPos, 'falsPos');
    assert.equal(results.ignored, 'ignored');

    assert.equal(p2s('inf'), '+infinity');

    done();
  });
});