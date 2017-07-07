"use strict";

module.exports = class FailedCreateQuery extends Error {
  constructor(m) {
    // Invoke stderr response
    super(m);
  }

};