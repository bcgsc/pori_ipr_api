const express = require('express');

const summary = require('./summary');
const appendices = require('./appendices');
const copyNumberAnalyses = require('./copyNumberAnalyses');
const kbMatches = require('./kbMatches');
const probeResults = require('./probeResults');
const expressionAnalysis = require('./expressionAnalysis');
const mavis = require('./mavis');
const presentation = require('./presentation');
const smallMutations = require('./smallMutations');
const structuralVariation = require('./structuralVariation');
const therapeuticTargets = require('./therapeuticTargets');
const probeTestInformation = require('./probeTestInformation');
const geneViewer = require('./geneViewer');
const mutationSignatures = require('./mutationSignatures');

const router = express.Router({mergeParams: true});

router.use('/summary', summary);

router.use('/appendices', appendices);
router.use('/copy-number-analyses', copyNumberAnalyses);
router.use('/expression-analysis', expressionAnalysis);
router.use('/mavis', mavis);
router.use('/presentation', presentation);
router.use('/small-mutations', smallMutations);
router.use('/mutation-signatures', mutationSignatures);
router.use('/structural-variation', structuralVariation);
router.use('/therapeutic-targets', therapeuticTargets);

router.use('/probe-test-information', probeTestInformation);
router.use('/kb-matches', kbMatches);
router.use('/probe-results', probeResults);
router.use('/gene-viewer', geneViewer);

module.exports = router;
