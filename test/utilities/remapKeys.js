"use strict";

let keyMap = require('../../app/libs/remapKeys'),
    _ = require('lodash'),
    assert = require('chai').assert,
    should = require('chai').should();


describe('RemapHashmapKeys', () => {
  it('Remaps collection keys based on a provided map', (done) => {
    let map = {
      'cola': 'cola',   // test no change
      'col2': 'colb',   // Test lowercase
      'COL3': 'colc',   // Test uppercase
      'COL 4': 'cold',  // Test space
      'COL_5': 'cole',  // Test underscores
      'COL~6': 'colf',  // Test single colon replacement to tilde
      'COL~7': 'colg'   // Test double colon replacement to tilde
    };

    let inputs = [
      {
        'col0': 'Value 0',
        'cola': 'Value 1',
        'col2': 'Value 2',
        'COL3': 'Value 3',
        'COL 4': 'Value 4',
        'COL_5': 'Value 5',
        'COL:6': 'value 6',
        'COL::7': 'value 7'
      },
      {
        'col0': 'Value 0',
        'cola': 'Value 1',
        'col2': 'Value 2',
        'COL3': 'Value 3',
        'COL 4': 'Value 4',
        'COL_5': 'Value 5',
        'COL:6': 'value 6',
        'COL::7': 'value 7'
      }
    ];

    // Test Hash Mapping
    let results = keyMap(inputs, map);

    // Loop over results and test
    _.forEach(results, (v) => {
      v.should.have.keys(['col0', 'cola', 'colb', 'colc', 'cold', 'cole', 'colf', 'colg']);
    });

    done();
  });
});