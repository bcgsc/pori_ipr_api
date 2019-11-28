const express = require('express');

const router = express.Router({mergeParams: true});

// Handle requests for API version
router.route('/')
  .get((req, res) => {
    const API_VERSION = `v${process.env.npm_package_version || '1.0'}`;
    // Get API version
    return res.json({apiVersion: API_VERSION});
  });

module.exports = router;
