const {Op} = require('sequelize');
const db = require('../models');

/**
 * Get content related to a given gene
 *
 * @param {object} options - Gene options
 * @property {integer} options.reportId - The id of the report this gene belongs to
 * @property {string} options.name - Gene name
 * @property {integer} options.id - Gene id
 *
 * @returns {object} - The gene related records by section
 */
const getGeneRelatedContent = async ({reportId, name, id}) => {
  const [
    smallMutations,
    copyNumber,
    expRNA,
    expDensityGraph,
    structuralVariants,
  ] = await Promise.all([
    db.models.smallMutations.scope('public').findAll({
      attributes: {include: ['id']},
      where: {
        geneId: id,
      },
    }),
    db.models.copyVariants.scope('public').findAll({
      attributes: {include: ['id']},
      where: {
        geneId: id,
      },
    }),
    db.models.expressionVariants.scope('public').findAll({
      attributes: {include: ['id']},
      where: {
        geneId: id,
      },
    }),
    db.models.imageData.scope('public').findAll({
      where: {
        key: {[Op.iLike]: `%expDensity.${name}%`},
        reportId,
      },
    }),
    db.models.structuralVariants.scope('public').findAll({
      attributes: {include: ['id']},
      where: {
        [Op.or]: [{gene1Id: id}, {gene2Id: id}],
      },
    }),
  ]);

  const popIdField = (record) => {
    const {dataValues: {id: recordId}} = record;
    delete record.id;
    delete record.dataValues.id;
    return recordId;
  };

  // do after so that we can use the variant Ids for filtering
  const kbMatches = await db.models.kbMatches.scope('public').findAll({
    where: {
      [Op.and]: [
        {reportId},
        {
          [Op.or]: [
            {variantType: 'exp', variantId: {[Op.in]: expRNA.map(popIdField)}},
            {variantType: 'sv', variantId: {[Op.in]: structuralVariants.map(popIdField)}},
            {variantType: 'cnv', variantId: {[Op.in]: copyNumber.map(popIdField)}},
            {variantType: 'mut', variantId: {[Op.in]: smallMutations.map(popIdField)}},
          ],
        },
      ],
    },
  });

  return {
    kbMatches,
    smallMutations,
    copyNumber,
    expRNA,
    expDensityGraph,
    structuralVariants,
  };
};

module.exports = {
  getGeneRelatedContent,
};
