"use strict";

module.exports = class InvalidStateStatus extends Error {
  constructor(m) {
    // Invoke stderr response
    super(m);
  }

};