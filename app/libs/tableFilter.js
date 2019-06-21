const {Op} = require('sequelize');

/**
 * Takes a base sequelize opts object and attaches filters from the request to it
 * Request should be a GET request of the format ?column=operation:value
 * @param {Object} req - Query base request
 * @param {Object} opts - Sequelize options to be passed to find method
 * @param {Object.<Object>} columnMapping - Object containing table and column info
 * @returns {Object} - Returns the opts object with filters attached to where field
 */
const tableFilter = (req, opts, columnMapping) => {
  const tempOpts = opts;
  const allowedOperatorsMapping = {
    equals: Op.eq,
    notEqual: Op.ne,
  };

  /* Grab the filters and check to see if the columns are in the list of filterable ones */
  const queryFilters = Object.entries(req.query)
    .filter(([key]) => Object.keys(columnMapping).includes(key));

  if (queryFilters.length) {
    /* Get the column, operation, and value for each filter */
    queryFilters.forEach(([column, value]) => {
      const columnName = columnMapping[column].column;
      const tableName = columnMapping[column].table;

      /* Case where there is no boolean operators */
      if (!(value.includes('||') || value.includes('&&'))) {
        const [operation, text] = value.split(':');

        /* Check to see if there's a table associated with the column */
        /* Used to check the case where the column belongs to the base model */
        /* If it doesn't belong to the base model, then attach the table name */
        const mappedOp = allowedOperatorsMapping[operation];

        if (tableName) {
          tempOpts.where[`$${tableName}.${columnName}$`] = {[mappedOp]: text};
        } else {
          tempOpts.where[`$${columnName}$`] = {[mappedOp]: text};
        }
      } else {
        /* Case where there are multiple filters on a single column using AND/OR */
        const rawCondition = value.split(/\|\||&&/);

        rawCondition.forEach((condition) => {
          const [operator, text] = condition.split(':');
          const boolOp = value.includes('||') ? Op.or : Op.and;
          const mappedOp = allowedOperatorsMapping[operator];

          /* Make sure the array is defined before pushing to it */
          if (!Array.isArray(tempOpts.where[boolOp])) {
            tempOpts.where[boolOp] = [];
          }

          if (tableName) {
            tempOpts.where[boolOp].push({
              [`$${tableName}.${columnName}$`]: {
                [mappedOp]: text,
              },
            });
          } else {
            tempOpts.where[boolOp].push({
              [`$${columnName}$`]: {
                [mappedOp]: text,
              },
            });
          }
        });
      }
    });
  }
  return tempOpts;
};

module.exports = tableFilter;
