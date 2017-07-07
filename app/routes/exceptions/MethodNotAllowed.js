"use strict";

module.exports = class MethodNotAllowed extends Error {
  constructor(m) {
    // Invoke stderr response
    super(m);
  }

};