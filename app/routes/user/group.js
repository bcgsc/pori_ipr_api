const express = require('express');
const {USER_GROUPS} = require('../../constants');

const router = express.Router({mergeParams: true});

// Routes for operating on all user groups
router.route('/')
  // Get all user groups
  .get(async (req, res) => {
    // Format return to be as close as possible to the previous version
    const returnArray = [];

    for (const group of USER_GROUPS) {
      returnArray.push({name: group});
    }

    return res.json(returnArray);
  });

module.exports = router;
