"use strict";

module.exports = class InvalidStateDefinition extends Error {
  constructor(m) {
    // Invoke stderr response
    super(m);
  }

};