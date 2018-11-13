module.exports = (sequelize, Sq) => sequelize.define('alterations', {
    id: {
        type: Sq.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    ident: {
        type: Sq.UUID,
        unique: false,
        defaultValue: Sq.UUIDV4,
    },
    dataVersion: {
        type: Sq.INTEGER,
        defaultValue: 0,
    },
    pog_id: {
        type: Sq.INTEGER,
        references: {
            model: 'POGs',
            key: 'id',
        },
    },
    pog_report_id: {
        type: Sq.INTEGER,
        references: {
            model: 'pog_analysis_reports',
            key: 'id',
        },
    },
    reportType: {
        type: Sq.ENUM('genomic', 'probe'),
        defaultValue: 'genomic',
    },
    alterationType: {
        type: Sq.ENUM('therapeutic', 'prognostic', 'diagnostic', 'biological', 'unknown', 'novel'),
        allowNull: false,
    },
    newEntry: {
        type: Sq.BOOLEAN,
        defaultValue: true,
    },
    approvedTherapy: {
        type: Sq.TEXT,
        allowNull: true,
        defaultValue: null,
    },
    gene: {
        type: Sq.TEXT,
    },
    variant: {
        type: Sq.TEXT,
    },
    kbVariant: {
        type: Sq.TEXT,
    },
    disease: {
        type: Sq.TEXT,
    },
    effect: {
        type: Sq.TEXT,
    },
    association: {
        type: Sq.TEXT,
    },
    therapeuticContext: {
        type: Sq.TEXT,
    },
    status: {
        type: Sq.TEXT,
    },
    reference: {
        type: Sq.TEXT,
    },
    expression_tissue_fc: {
        type: Sq.TEXT,
    },
    expression_cancer_percentile: {
        type: Sq.TEXT,
    },
    copyNumber: {
        type: Sq.TEXT,
    },
    sample: {
        type: Sq.TEXT,
    },
    LOHRegion: {
        type: Sq.TEXT,
    },
    zygosity: {
        type: Sq.TEXT,
    },
    evidence: {
        type: Sq.TEXT,
    },
    matched_cancer: {
        type: Sq.TEXT,
    },
    pmid_ref: {
        type: Sq.TEXT,
    },
    variant_type: {
        type: Sq.TEXT,
    },
    kb_type: {
        type: Sq.TEXT,
    },
    kb_entry_type: {
        type: Sq.TEXT,
    },
    kb_event_key: {
        type: Sq.TEXT,
    },
    kb_entry_key: {
        type: Sq.TEXT,
    },
    kb_data: {
        type: Sq.JSONB,
    },
}, {
    // Table Name
    tableName: 'pog_analysis_reports_dga_alterations',
    // Automatically create createdAt, updatedAt, deletedAt
    timestamps: true,
    // Use soft-deletes!
    paranoid: true,
    scopes: {
        public: {
            attributes: {exclude: ['id', 'deletedAt', 'pog_report_id', 'pog_id']},
        },
    },
});
