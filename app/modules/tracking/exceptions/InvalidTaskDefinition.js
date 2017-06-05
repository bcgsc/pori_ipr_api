"use strict";

module.exports = class InvalidTaskDefinition extends Error {
  constructor(m) {
    // Invoke stderr response
    super(m);
  }

};