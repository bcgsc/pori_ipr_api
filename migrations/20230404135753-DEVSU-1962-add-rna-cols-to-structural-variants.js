const STRUCTURAL_VARIANTS = 'reports_structural_variants';

module.exports = {
    up: async (queryInterface, Sq) => {
        return queryInterface.sequelize.transaction(async (transaction) => {
            await queryInterface.addColumn(
                STRUCTURAL_VARIANTS,
                'rnaAltCount',
                {
                    type: Sq.INTEGER,
                },
                { transaction },
            );
            await queryInterface.addColumn(
                STRUCTURAL_VARIANTS,
                'rnaDepth',
                {
                    type: Sq.INTEGER,
                },
                { transaction },
            );
        });
    },

    down: async () => {
        throw new Error('Not Implemented!');
    },
};
