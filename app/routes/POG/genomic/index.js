const express = require('express');

const router = express.Router({mergeParams: true});

router.use('/summary', require('./summary'));
router.use('/appendices', require('./appendices'));
router.use('/copyNumberAnalyses', require('./copyNumberAnalyses'));
router.use('/detailedGenomicAnalysis', require('./detailedGenomicAnalysis'));
router.use('/expressionAnalysis', require('./expressionAnalysis'));
router.use('/mavis', require('./mavis'));
router.use('/presentation', require('./presentation'));
router.use('/somaticMutations', require('./somaticMutations'));
router.use('/structuralVariation', require('./structuralVariation'));
router.use('/therapeuticTargets', require('./therapeuticTargets'));

module.exports = router;
