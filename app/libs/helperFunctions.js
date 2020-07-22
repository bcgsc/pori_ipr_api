const _ = require('lodash');
const sanitize = require('sanitize-html');

/**
 * Checks that all target values exist
 * in an array
 *
 * @param {Array<any>} arr - Array of values to see if targets exist in
 * @param {Array<any>} targets - Array of values to check if they exist
 * @returns {boolean} - Returns true if all targets exist in array
 */
const includesAll = (arr, targets) => {
  return targets.every((value) => {
    return arr.includes(value);
  });
};

/**
 * Performs a case insensitice intersection on
 * two arrays of strings
 *
 * @param {Array<string>} array1 - First array of strings
 * @param {Array<string>} array2 - Second array of strings
 * @returns {Array<string>} - Returns a new array of intersecting values
 */

const caseInsensitiveIntersect = (array1, array2) => {
  return _.intersectionBy(array1, array2, _.lowerCase);
};

/**
 * Sanitizes "dirty" html with our sanitization rules and
 * returns the "clean"/sanitized html
 *
 * @param {string} html - A string of "dirty" (hasn't been sanitized) html
 * @returns {string} - A string of "clean" (sanitized) html
 */
const sanitizeHtml = (html) => {
  return sanitize(html, {
    allowedTags: ['h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
      'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'abbr', 'code', 'hr', 'br', 'div',
      'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'img'],
  });
};

module.exports = {
  includesAll,
  caseInsensitiveIntersect,
  sanitizeHtml,
};
