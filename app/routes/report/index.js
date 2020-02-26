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
const probeTestInformation = require('./probeTestInformation');
const genomicEventsTherapeutic = require('./summary/genomicEventsTherapeutic');

const router = express.Router({mergeParams: true});

router.use('/summary', summary);

// TODO: remove line below when the client has updated to match
router.use('/genomicEventsTherapeutic', genomicEventsTherapeutic);

router.use('/appendices', appendices);
router.use('/copy-number-analyses', copyNumberAnalyses);
router.use('/expression-analysis', expressionAnalysis);
router.use('/mavis', mavis);
router.use('/presentation', presentation);
router.use('/somatic-mutations', somaticMutations);
router.use('/structural-variation', structuralVariation);
router.use('/therapeutic-targets', therapeuticTargets);

// TODO: remove line below when the client has updated to match
router.use('/testInformation', probeTestInformation);

router.use('/probeTestInformation', probeTestInformation);

// TODO: modify 2 lines below when the client has been updated to match
router.use('/detailedGenomicAnalysis', detailedGenomicAnalysis); // genomic report pattern
router.use('/', detailedGenomicAnalysis); // probe report pattern

module.exports = router;
