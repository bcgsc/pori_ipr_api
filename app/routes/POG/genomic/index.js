const express = require('express');

const summary = require('./summary');
const appendices = require('./appendices');
const copyNumberAnalyses = require('./copyNumberAnalyses');
const detailedGenomicAnalysis = require('./detailedGenomicAnalysis');
const expressionAnalysis = require('./expressionAnalysis');
const mavis = require('./mavis');
const presentation = require('./presentation');
const somaticMutations = require('./somaticMutations');
const structuralVariation = require('./structuralVariation');
const therapeuticTargets = require('./therapeuticTargets');

const router = express.Router({mergeParams: true});

router.use('/summary', summary);
router.use('/appendices', appendices);
router.use('/copyNumberAnalyses', copyNumberAnalyses);
router.use('/detailedGenomicAnalysis', detailedGenomicAnalysis);
router.use('/expressionAnalysis', expressionAnalysis);
router.use('/mavis', mavis);
router.use('/presentation', presentation);
router.use('/somaticMutations', somaticMutations);
router.use('/structuralVariation', structuralVariation);
router.use('/therapeuticTargets', therapeuticTargets);

module.exports = router;
