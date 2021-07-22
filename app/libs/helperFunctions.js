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
  const dict = {};

  arr.forEach((val) => {
    dict[val] = true;
  });

  return targets.every((value) => {
    return dict[value];
  });
};

/**
 * Checks for any intersecting values in two arrays
 * of objects, both containing the specified key
 *
 * @param {Array<object>} arr1 - First array of objects
 * @param {Array<object>} arr2 - Second array of objects
 * @param {string} key - Key to use, which should be present in both arrays
 * @returns {boolean} - Returns a boolean indicating if there is an intersection or not
 */
const isIntersectionBy = (arr1, arr2, key) => {
  const dict = {};

  arr1.forEach((val) => {
    dict[val[key]] = true;
  });

  return arr2.some((value) => {
    return dict[value[key]];
  });
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
      'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'img', 'cite'],
    allowedAttributes: {
      blockquote: ['cite'],
    },
  });
};

/**
 * Checks if user is an admin
 *
 * @param {object} user - Sequelize user model
 * @returns {boolean} - Returns a boolean indicating if the user is an admin
 */
const isAdmin = (user) => {
  return user.groups.some((group) => {
    return group.name.toLowerCase() === 'admin';
  });
};

/**
 * Checks if user has master access
 *
 * @param {object} user - Sequelize user model
 * @returns {boolean} - Returns a boolean indicating if the user has master access
 */
const hasMasterAccess = (user) => {
  return user.groups.some((group) => {
    return group.name.toLowerCase() === 'admin'
    || group.name.toLowerCase() === 'manager';
  });
};

/**
 * Get all of the projects a user has access to
 *
 * @param {object} project - Sequelize project model
 * @param {object} user - Sequelize user model
 * @returns {Array<string>} - Returns an array of projects
 */
const getUserProjects = async (project, user) => {
  if (hasMasterAccess(user)) {
    return project.scope('public').findAll();
  }

  return user.projects;
};

module.exports = {
  includesAll,
  sanitizeHtml,
  getUserProjects,
  isAdmin,
  hasMasterAccess,
  isIntersectionBy,
};
