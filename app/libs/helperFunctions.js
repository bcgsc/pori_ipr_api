const sanitize = require('sanitize-html');
const {MASTER_ACCESS, MANAGER_ACCESS, ALL_PROJECTS_ACCESS} = require('../constants');

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
      'nl', 'li', 'b', 'i', 'strong', 'em', 'u', 'strike', 'abbr', 'code', 'hr', 'br', 'div',
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
  return user.groups?.some((group) => {
    return group.name.toLowerCase() === 'admin';
  });
};

/**
 * Checks if user is an admin
 *
 * @param {object} user - Sequelize user model
 * @returns {boolean} - Returns a boolean indicating if the user is an admin
 */
const isManager = (user) => {
  return user.groups?.some((group) => {
    return group.name.toLowerCase() === 'admin' || group.name.toLowerCase() === 'manager';
  });
};

/**
 * Checks if user has access to non-prod repots
 *
 * @param {object} user - Sequelize user model
 * @returns {boolean} - Returns a boolean indicating if the user has access to non-prod reports
 */
const hasAccessToNonProdReports = (user) => {
  return user.groups?.some((group) => {
    return group.name.toLowerCase() === 'admin'
    || group.name.toLowerCase() === 'manager'
    || group.name.toLowerCase() === 'non-production access';
  });
};

/**
 * Checks if user has access to unreviewed repots
 *
 * @param {object} user - Sequelize user model
 * @returns {boolean} - Returns a boolean indicating if the user has access to unreviewed reports
 */
const hasAccessToUnreviewedReports = (user) => {
  return user.groups?.some((group) => {
    return group.name.toLowerCase() === 'admin'
    || group.name.toLowerCase() === 'manager'
    || group.name.toLowerCase() === 'unreviewed access';
  });
};

/**
 * Checks if user has access to germline repots
 *
 * @param {object} user - Sequelize user model
 * @returns {boolean} - Returns a boolean indicating if the user has access to germline reports
 */
const hasAccessToGermlineReports = (user) => {
  return user.groups?.some((group) => {
    return group.name.toLowerCase() === 'admin'
    || group.name.toLowerCase() === 'manager'
    || group.name.toLowerCase() === 'germline access';
  });
};

/**
 * Checks if user has access to appendix edit
 *
 * @param {object} user - Sequelize user model
 * @returns {boolean} - Returns a boolean indicating if the user has access to appendix edit
 */
const hasAccessToAppendixEdit = (user) => {
  return user.groups?.some((group) => {
    return group.name.toLowerCase() === 'admin'
    || group.name.toLowerCase() === 'manager'
    || group.name.toLowerCase() === 'appendix edit access';
  });
};

/**
 * Checks if a user belongs to atleast one
 * of the access groups
 *
 * @param {object} user - Sequelize user model
 * @param {Array<string>} accessGroups - Groups that have access
 * @returns {boolean} - Returns true if user belongs to one of the access groups
 */
const hasAccess = (user, accessGroups) => {
  return user.groups?.some((group) => {
    return accessGroups.includes(group.name.toLowerCase());
  });
};

/**
 * Checks if user has master access
 *
 * @param {object} user - Sequelize user model
 * @returns {boolean} - Returns a boolean indicating if the user has master access
 */
const hasMasterAccess = (user) => {
  return hasAccess(user, MASTER_ACCESS);
};

/**
 * Checks if user has manager access
 *
 * @param {object} user - Sequelize user model
 * @returns {boolean} - Returns a boolean indicating if the user has master access
 */
const hasManagerAccess = (user) => {
  return hasAccess(user, MANAGER_ACCESS);
};

/**
 * Checks if user has all-projects access
 *
 * @param {object} user - Sequelize user model
 * @returns {boolean} - Returns a boolean indicating if the user has all-projects access
 */
const hasAllProjectsAccess = (user) => {
  return hasAccess(user, ALL_PROJECTS_ACCESS);
};

/**
 * Checks if user has access to the project
 * that the report belongs to
 *
 * @param {object} user - Sequelize user model
 * @param {object} report - Sequelize report model
 * @returns {boolean} - Returns true if user is allowed to access report
 */
const projectAccess = (user, report) => {
  if (hasMasterAccess(user) || hasAllProjectsAccess(user)) {
    return true;
  }
  return isIntersectionBy(user.projects, report.projects, 'ident');
};

/**
 * Get all of the projects a user has access to
 *
 * @param {object} project - Sequelize project model
 * @param {object} user - Sequelize user model
 * @returns {Array<string>} - Returns an array of projects
 */
const getUserProjects = async (project, user) => {
  if (hasMasterAccess(user) || hasAllProjectsAccess(user)) {
    return project.scope('public').findAll();
  }

  return user.projects;
};

const removeKeys = (obj, targetKey) => {
  if (Array.isArray(obj)) {
    return obj.map((item) => {return removeKeys(item, targetKey);});
  } if (typeof obj === 'object' && obj !== null) {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([key]) => {return key !== targetKey;})
        .map(([key, value]) => {return [key, removeKeys(value, targetKey)];}),
    );
  }
  return obj;
};

module.exports = {
  includesAll,
  sanitizeHtml,
  getUserProjects,
  isAdmin,
  isManager,
  hasAccess,
  hasAccessToNonProdReports,
  hasAccessToUnreviewedReports,
  hasAccessToGermlineReports,
  hasAccessToAppendixEdit,
  hasMasterAccess,
  hasManagerAccess,
  hasAllProjectsAccess,
  projectAccess,
  isIntersectionBy,
  removeKeys,
};
