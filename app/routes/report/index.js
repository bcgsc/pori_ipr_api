const express = require('express');

const summary = require('./summary');
const appendices = require('./appendices');
const copyVariants = require('./copyVariants');
const kbMatches = require('./kbMatches');
const probeResults = require('./probeResults');
const expressionVariants = require('./expressionVariants');
const mavis = require('./mavis');
const presentation = require('./presentation');
const structuralVariants = require('./structuralVariants');
const smallMutations = require('./smallMutations');
const therapeuticTargets = require('./therapeuticTargets');
const probeTestInformation = require('./probeTestInformation');
const geneViewer = require('./geneViewer');
const mutationSignatures = require('./mutationSignatures');

const router = express.Router({mergeParams: true});

router.use('/summary', summary);

router.use('/appendices', appendices);
router.use('/copy-variants', copyVariants);
router.use('/expression-variants', expressionVariants);
router.use('/mavis', mavis);
router.use('/presentation', presentation);
router.use('/structural-variants', structuralVariants);
router.use('/small-mutations', smallMutations);
router.use('/mutation-signatures', mutationSignatures);
router.use('/therapeutic-targets', therapeuticTargets);

router.use('/probe-test-information', probeTestInformation);
router.use('/kb-matches', kbMatches);
router.use('/probe-results', probeResults);
router.use('/gene-viewer', geneViewer);

module.exports = router;
