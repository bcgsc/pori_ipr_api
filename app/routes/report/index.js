const express = require('express');

const summary = require('./summary');
const appendices = require('./appendices');
const copyNumberAnalyses = require('./copyNumberAnalyses');
const expressionAnalysis = require('./expressionAnalysis');
const mavis = require('./mavis');
const presentation = require('./presentation');
const somaticMutations = require('./somaticMutations');
const structuralVariation = require('./structuralVariation');
const therapeuticTargets = require('./therapeuticTargets');
const probeTestInformation = require('./probeTestInformation');

const router = express.Router({mergeParams: true});

router.use('/summary', summary);

router.use('/appendices', appendices);
router.use('/copy-number-analyses', copyNumberAnalyses);
router.use('/expression-analysis', expressionAnalysis);
router.use('/mavis', mavis);
router.use('/presentation', presentation);
router.use('/somatic-mutations', somaticMutations);
router.use('/structural-variation', structuralVariation);
router.use('/therapeutic-targets', therapeuticTargets);

router.use('/probe-test-information', probeTestInformation);

module.exports = router;
