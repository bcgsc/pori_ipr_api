"use strict";

module.exports = class InvalidTaskOperation extends Error {
  constructor(m) {
    // Invoke stderr response
    super(m);
  }

};