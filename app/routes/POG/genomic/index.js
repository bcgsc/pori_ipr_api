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
router.use('/copyNumberAnalyses', copyNumberAnalyses);
router.use('/detailedGenomicAnalysis', detailedGenomicAnalysis); // TODO: remove line when the client has been updated to match
router.use('/expressionAnalysis', expressionAnalysis);
router.use('/mavis', mavis);
router.use('/presentation', presentation);
router.use('/somaticMutations', somaticMutations);
router.use('/structuralVariation', structuralVariation);
router.use('/therapeuticTargets', therapeuticTargets);

// TODO: remove line below when the client has updated to match
router.use('/testInformation', probeTestInformation);

router.use('/probeTestInformation', probeTestInformation);

module.exports = router;
