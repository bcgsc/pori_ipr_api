"use strict";

module.exports = class FailedFindQuery extends Error {
  constructor(m) {
    // Invoke stderr response
    super(m);
  }

};