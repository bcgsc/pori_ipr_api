const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const db = require('../../models');
const {getGeneRelatedContent} = require('../../libs/genes');
const logger = require('../../log');

const router = express.Router({mergeParams: true});

router.get('/:geneName', async (req, res) => {
  const {report, params: {geneName}} = req;
  // get the geneId from the gene name and report
  let gene;
  try {
    gene = await db.models.genes.findOne({
      where: {reportId: report.id, name: geneName},
    });
    if (!gene) {
      throw new Error(`gene (${geneName}) not found`);
    }
  } catch (error) {
    logger.error(error);
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: error.message}});
  }

  try {
    const result = await getGeneRelatedContent(gene);
    return res.json(result);
  } catch (error) {
    logger.error(`There was an error when getting the viewer results ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'There was an error when getting the viewer results'}});
  }
});

module.exports = router;
