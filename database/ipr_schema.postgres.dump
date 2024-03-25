--
-- PostgreSQL database dump
--

-- Dumped from database version 11.18
-- Dumped by pg_dump version 11.17

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: development; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA development;


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: enum_user_access; Type: TYPE; Schema: development; Owner: -
--

CREATE TYPE development.enum_user_access AS ENUM (
    'public',
    'bioinformatician',
    'analyst',
    'admin'
);


--
-- Name: enum_user_type; Type: TYPE; Schema: development; Owner: -
--

CREATE TYPE development.enum_user_type AS ENUM (
    'bcgsc',
    'local'
);


--
-- Name: enum_users_access; Type: TYPE; Schema: development; Owner: -
--

CREATE TYPE development.enum_users_access AS ENUM (
    'public',
    'bioinformatician',
    'analyst',
    'admin'
);


--
-- Name: enum_users_type; Type: TYPE; Schema: development; Owner: -
--

CREATE TYPE development.enum_users_type AS ENUM (
    'bcgsc',
    'local'
);


--
-- Name: enum_POGUsers_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."enum_POGUsers_role" AS ENUM (
    'clinician',
    'bioinformatician',
    'analyst',
    'reviewer',
    'admin'
);


--
-- Name: enum_detailedGenomicAnalysis.alterations_alterationType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."enum_detailedGenomicAnalysis.alterations_alterationType" AS ENUM (
    'therapeutic',
    'prognostic',
    'diagnostic',
    'biological',
    'unknown',
    'novel',
    'pharmacogenomic',
    'cancer predisposition'
);


--
-- Name: enum_germline_report_users_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_germline_report_users_role AS ENUM (
    'clinician',
    'bioinformatician',
    'analyst',
    'reviewer',
    'admin'
);


--
-- Name: enum_germline_small_mutations_state; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_germline_small_mutations_state AS ENUM (
    'ready',
    'active',
    'uploaded',
    'signedoff',
    'archived',
    'reviewed',
    'nonproduction'
);


--
-- Name: enum_germline_small_mutations_variant_cgl_review_result; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_germline_small_mutations_variant_cgl_review_result AS ENUM (
    'pathogenic',
    'likely pathogenic',
    'VUS',
    'likely benign',
    'benign'
);


--
-- Name: enum_germline_small_mutations_variant_known_to_hcp; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_germline_small_mutations_variant_known_to_hcp AS ENUM (
    'yes',
    'no'
);


--
-- Name: enum_germline_small_mutations_variant_previously_reported; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_germline_small_mutations_variant_previously_reported AS ENUM (
    'yes',
    'no'
);


--
-- Name: enum_germline_small_mutations_variant_referral_hcp; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_germline_small_mutations_variant_referral_hcp AS ENUM (
    'yes',
    'no'
);


--
-- Name: enum_germline_small_mutations_variant_returned_to_clinician; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_germline_small_mutations_variant_returned_to_clinician AS ENUM (
    'yes',
    'no'
);


--
-- Name: enum_imageData_format; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."enum_imageData_format" AS ENUM (
    'PNG',
    'JPG'
);


--
-- Name: enum_reports_comparators_analysis_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_reports_comparators_analysis_role AS ENUM (
    'cibersort (primary)',
    'cibersort (secondary)',
    'mixcr (primary)',
    'mixcr (secondary)',
    'HRD (primary)',
    'HRD (secondary)',
    'expression (disease)',
    'expression (disease QC)',
    'expression (primary site)',
    'expression (primary site QC)',
    'expression (biopsy site)',
    'expression (biopsy site QC)',
    'mutation burden (primary)',
    'mutation burden (secondary)',
    'mutation burden (tertiary)',
    'mutation burden (quaternary)',
    'protein expression (primary)',
    'protein expression (secondary)',
    'mutation burden SV (primary)',
    'mutation burden SV (secondary)',
    'mutation burden SV (tertiary)',
    'mutation burden SV (quaternary)',
    'expression (internal pancancer cohort)',
    'expression (internal pancancer cohort QC)'
);


--
-- Name: enum_reports_hla_types_pathology; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_reports_hla_types_pathology AS ENUM (
    'diseased',
    'normal'
);


--
-- Name: enum_reports_hla_types_protocol; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_reports_hla_types_protocol AS ENUM (
    'DNA',
    'RNA'
);


--
-- Name: enum_reports_kb_matches_variant_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_reports_kb_matches_variant_type AS ENUM (
    'sv',
    'mut',
    'cnv',
    'exp',
    'probe',
    'protein',
    'msi',
    'tmb'
);


--
-- Name: enum_reports_mutation_burden_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_reports_mutation_burden_role AS ENUM (
    'primary',
    'secondary',
    'tertiary',
    'quaternary'
);


--
-- Name: enum_reports_state; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_reports_state AS ENUM (
    'ready',
    'active',
    'uploaded',
    'signedoff',
    'archived',
    'reviewed',
    'nonproduction'
);


--
-- Name: enum_reports_summary_pathway_analysis_legend; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_reports_summary_pathway_analysis_legend AS ENUM (
    'v1',
    'v2',
    'custom'
);


--
-- Name: enum_somaticMutations.smallMutations_mutationType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."enum_somaticMutations.smallMutations_mutationType" AS ENUM (
    'clinical',
    'nostic',
    'biological',
    'unknown'
);


--
-- Name: enum_therapeuticTargets_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."enum_therapeuticTargets_type" AS ENUM (
    'therapeutic',
    'chemoresistance'
);


--
-- Name: enum_users_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_users_type AS ENUM (
    'bcgsc',
    'local'
);


SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: user; Type: TABLE; Schema: development; Owner: -
--

CREATE TABLE development."user" (
    id integer NOT NULL,
    ident uuid,
    username character varying(255) NOT NULL,
    password character varying(255),
    type development.enum_user_type DEFAULT 'local'::development.enum_user_type,
    "firstName" character varying(255),
    "lastName" character varying(255),
    email character varying(255),
    access development.enum_user_access DEFAULT 'public'::development.enum_user_access NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "deletedAt" timestamp with time zone
);


--
-- Name: user_id_seq; Type: SEQUENCE; Schema: development; Owner: -
--

CREATE SEQUENCE development.user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_id_seq; Type: SEQUENCE OWNED BY; Schema: development; Owner: -
--

ALTER SEQUENCE development.user_id_seq OWNED BY development."user".id;


--
-- Name: reports_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports_users (
    id integer NOT NULL,
    ident uuid,
    role public."enum_POGUsers_role" NOT NULL,
    user_id integer,
    "addedBy_id" integer,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    report_id integer NOT NULL,
    updated_by integer
);


--
-- Name: POGUsers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."POGUsers_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: POGUsers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."POGUsers_id_seq" OWNED BY public.reports_users.id;


--
-- Name: SequelizeMeta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SequelizeMeta" (
    name character varying(255) NOT NULL
);


--
-- Name: reports_copy_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports_copy_variants (
    id integer NOT NULL,
    ident uuid NOT NULL,
    copy_change integer,
    loh_state text,
    cnv_state text,
    chromosome_band text,
    start integer,
    "end" integer,
    size double precision,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    report_id integer NOT NULL,
    gene_id integer NOT NULL,
    kb_category text,
    log2_cna numeric,
    cna numeric,
    updated_by integer,
    germline boolean,
    library text,
    comments text,
    display_name text
);


--
-- Name: copyNumberAnalysis.cnv_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."copyNumberAnalysis.cnv_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: copyNumberAnalysis.cnv_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."copyNumberAnalysis.cnv_id_seq" OWNED BY public.reports_copy_variants.id;


--
-- Name: reports_kb_matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports_kb_matches (
    id integer NOT NULL,
    ident uuid NOT NULL,
    category public."enum_detailedGenomicAnalysis.alterations_alterationType" NOT NULL,
    approved_therapy boolean NOT NULL,
    kb_variant text,
    disease text,
    relevance text,
    context text,
    status text,
    reference text,
    sample text,
    evidence_level text,
    matched_cancer boolean NOT NULL,
    pmid_ref text,
    variant_type public.enum_reports_kb_matches_variant_type NOT NULL,
    kb_variant_id text,
    kb_statement_id text,
    kb_data jsonb,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    report_id integer NOT NULL,
    variant_id integer NOT NULL,
    inferred boolean,
    updated_by integer,
    external_source text,
    external_statement_id text,
    review_status text,
    ipr_evidence_level text
);


--
-- Name: detailedGenomicAnalysis.alterations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."detailedGenomicAnalysis.alterations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: detailedGenomicAnalysis.alterations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."detailedGenomicAnalysis.alterations_id_seq" OWNED BY public.reports_kb_matches.id;


--
-- Name: reports_expression_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports_expression_variants (
    id integer NOT NULL,
    ident uuid NOT NULL,
    location text,
    rna_reads text,
    rpkm double precision,
    primary_site_fold_change double precision,
    disease_percentile double precision,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    report_id integer NOT NULL,
    disease_kiqr double precision,
    disease_qc double precision,
    expression_state text,
    gene_id integer NOT NULL,
    kb_category text,
    biopsy_site_fold_change double precision,
    biopsy_site_kiqr double precision,
    biopsy_site_percentile double precision,
    biopsy_site_qc double precision,
    biopsy_site_zscore double precision,
    disease_fold_change double precision,
    disease_zscore double precision,
    primary_site_kiqr double precision,
    primary_site_percentile double precision,
    primary_site_qc double precision,
    primary_site_zscore double precision,
    tpm double precision,
    updated_by integer,
    germline boolean,
    library text,
    internal_pancancer_percentile double precision,
    internal_pancancer_kiqr double precision,
    internal_pancancer_qc double precision,
    internal_pancancer_fold_change double precision,
    internal_pancancer_zscore double precision,
    comments text,
    display_name text
);


--
-- Name: expression.outlier_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."expression.outlier_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: expression.outlier_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."expression.outlier_id_seq" OWNED BY public.reports_expression_variants.id;


--
-- Name: germline_report_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.germline_report_users (
    id integer NOT NULL,
    ident uuid NOT NULL,
    role public.enum_germline_report_users_role NOT NULL,
    germline_report_id integer NOT NULL,
    user_id integer NOT NULL,
    added_by_id integer,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    updated_by integer
);


--
-- Name: germline_report_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.germline_report_users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: germline_report_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.germline_report_users_id_seq OWNED BY public.germline_report_users.id;


--
-- Name: germline_reports_to_projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.germline_reports_to_projects (
    id integer NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    germline_report_id integer NOT NULL,
    project_id integer NOT NULL
);


--
-- Name: germline_reports_to_projects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.germline_reports_to_projects_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: germline_reports_to_projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.germline_reports_to_projects_id_seq OWNED BY public.germline_reports_to_projects.id;


--
-- Name: germline_small_mutations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.germline_small_mutations (
    id integer NOT NULL,
    ident uuid,
    source_version text NOT NULL,
    source_path text NOT NULL,
    biofx_assigned_id integer,
    exported boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    patient_id text NOT NULL,
    biopsy_name text,
    normal_library text,
    updated_by integer,
    state public.enum_germline_small_mutations_state DEFAULT 'uploaded'::public.enum_germline_small_mutations_state
);


--
-- Name: germline_small_mutations_review; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.germline_small_mutations_review (
    id integer NOT NULL,
    ident uuid,
    germline_report_id integer,
    reviewer_id integer,
    type text NOT NULL,
    comment text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    updated_by integer
);


--
-- Name: germline_small_mutations_variant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.germline_small_mutations_variant (
    id integer NOT NULL,
    ident uuid,
    germline_report_id integer,
    hidden boolean DEFAULT false NOT NULL,
    flagged text,
    clinvar text,
    cgl_category text,
    gmaf text,
    transcript text,
    gene text NOT NULL,
    variant text,
    impact text,
    chromosome text,
    "position" text,
    reference text,
    alteration text,
    score text,
    zygosity_germline text,
    preferred_transcript boolean,
    hgvs_cdna text,
    hgvs_protein text,
    zygosity_tumour text,
    genomic_variant_reads text,
    rna_variant_reads text,
    gene_somatic_abberation text,
    notes text,
    type text,
    patient_history text,
    family_history text,
    tcga_comp_norm_percentile text,
    tcga_comp_percentile text,
    gtex_comp_percentile text,
    fc_bodymap text,
    gene_expression_rpkm double precision,
    additional_info text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    updated_by integer,
    db_snp_ids text,
    clinvar_ids text,
    cosmic_ids text,
    cgl_review_result public.enum_germline_small_mutations_variant_cgl_review_result,
    returned_to_clinician public.enum_germline_small_mutations_variant_returned_to_clinician,
    referral_hcp public.enum_germline_small_mutations_variant_referral_hcp,
    known_to_hcp public.enum_germline_small_mutations_variant_known_to_hcp,
    reason_no_hcp_referral text,
    previously_reported public.enum_germline_small_mutations_variant_previously_reported
);


--
-- Name: reports_image_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports_image_data (
    id integer NOT NULL,
    ident uuid,
    format public."enum_imageData_format" DEFAULT 'PNG'::public."enum_imageData_format",
    filename text NOT NULL,
    key text NOT NULL,
    data text NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    report_id integer NOT NULL,
    deleted_at timestamp with time zone,
    title text,
    caption text,
    updated_by integer
);


--
-- Name: imageData_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."imageData_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: imageData_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."imageData_id_seq" OWNED BY public.reports_image_data.id;


--
-- Name: images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.images (
    id integer NOT NULL,
    ident uuid NOT NULL,
    type character varying(255) NOT NULL,
    filename text NOT NULL,
    data text NOT NULL,
    format character varying(255) NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    updated_by integer
);


--
-- Name: images_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.images_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.images_id_seq OWNED BY public.images.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    ident uuid NOT NULL,
    updated_by integer,
    id integer NOT NULL,
    created_at timestamp with time zone,
    deleted_at timestamp with time zone,
    updated_at timestamp with time zone,
    project_id integer NOT NULL,
    user_id integer,
    user_group_id integer,
    template_id integer NOT NULL,
    event_type character varying(255) NOT NULL
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: pog_analysis_germline_small_mutations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pog_analysis_germline_small_mutations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pog_analysis_germline_small_mutations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pog_analysis_germline_small_mutations_id_seq OWNED BY public.germline_small_mutations.id;


--
-- Name: pog_analysis_germline_small_mutations_review_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pog_analysis_germline_small_mutations_review_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pog_analysis_germline_small_mutations_review_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pog_analysis_germline_small_mutations_review_id_seq OWNED BY public.germline_small_mutations_review.id;


--
-- Name: pog_analysis_germline_small_mutations_variant_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pog_analysis_germline_small_mutations_variant_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pog_analysis_germline_small_mutations_variant_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pog_analysis_germline_small_mutations_variant_id_seq OWNED BY public.germline_small_mutations_variant.id;


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports (
    id integer NOT NULL,
    ident character varying(255) NOT NULL,
    "createdBy_id" integer,
    "sampleInfo" jsonb,
    "seqQC" jsonb,
    config text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    "reportVersion" character varying,
    "kbVersion" character varying,
    state public.enum_reports_state DEFAULT 'ready'::public.enum_reports_state NOT NULL,
    expression_matrix character varying DEFAULT 'v8'::character varying NOT NULL,
    alternate_identifier character varying(255),
    age_of_consent integer,
    patient_id character varying(255) NOT NULL,
    biopsy_date timestamp with time zone,
    biopsy_name character varying(255),
    presentation_date timestamp with time zone,
    kb_disease_match character varying(255) DEFAULT NULL::character varying,
    kb_url character varying(255) DEFAULT NULL::character varying,
    tumour_content double precision,
    ploidy text,
    subtyping text,
    analysis_started_at timestamp with time zone,
    template_id integer NOT NULL,
    updated_by integer,
    pediatric_ids text,
    oncotree_tumour_type text,
    m1m2_score double precision,
    captiv8_score integer
);


--
-- Name: pog_analysis_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pog_analysis_reports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pog_analysis_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pog_analysis_reports_id_seq OWNED BY public.reports.id;


--
-- Name: reports_mavis_summary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports_mavis_summary (
    id integer NOT NULL,
    ident uuid,
    product_id text NOT NULL,
    report_id integer NOT NULL,
    summary jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    updated_by integer
);


--
-- Name: pog_analysis_reports_mavis_summary_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pog_analysis_reports_mavis_summary_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pog_analysis_reports_mavis_summary_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pog_analysis_reports_mavis_summary_id_seq OWNED BY public.reports_mavis_summary.id;


--
-- Name: reports_presentation_discussion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports_presentation_discussion (
    id integer NOT NULL,
    ident uuid,
    report_id integer NOT NULL,
    user_id integer,
    body text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    updated_by integer
);


--
-- Name: pog_analysis_reports_presentation_discussion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pog_analysis_reports_presentation_discussion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pog_analysis_reports_presentation_discussion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pog_analysis_reports_presentation_discussion_id_seq OWNED BY public.reports_presentation_discussion.id;


--
-- Name: reports_presentation_slides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports_presentation_slides (
    id integer NOT NULL,
    ident uuid,
    report_id integer NOT NULL,
    user_id integer,
    name text NOT NULL,
    object text,
    object_type text NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    updated_by integer
);


--
-- Name: pog_analysis_reports_presentation_slides_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pog_analysis_reports_presentation_slides_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pog_analysis_reports_presentation_slides_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pog_analysis_reports_presentation_slides_id_seq OWNED BY public.reports_presentation_slides.id;


--
-- Name: reports_signatures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports_signatures (
    id integer NOT NULL,
    ident uuid NOT NULL,
    report_id integer NOT NULL,
    reviewer_id integer,
    reviewer_signed_at timestamp with time zone,
    author_id integer,
    author_signed_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    updated_by integer,
    creator_id integer,
    creator_signed_at timestamp with time zone
);


--
-- Name: pog_analysis_reports_probe_signature_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pog_analysis_reports_probe_signature_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pog_analysis_reports_probe_signature_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pog_analysis_reports_probe_signature_id_seq OWNED BY public.reports_signatures.id;


--
-- Name: reports_probe_test_information; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports_probe_test_information (
    id integer NOT NULL,
    ident uuid,
    report_id integer NOT NULL,
    "kbVersion" text NOT NULL,
    "snpProbe" text NOT NULL,
    "snpGenes" text NOT NULL,
    "snpVars" text NOT NULL,
    "fusionProbe" text NOT NULL,
    "fusionGenes" text NOT NULL,
    "fusionVars" text NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    updated_by integer,
    germline_genes integer DEFAULT '-1'::integer NOT NULL,
    germline_vars integer DEFAULT '-1'::integer NOT NULL,
    pharmacogenomic_genes integer DEFAULT '-1'::integer NOT NULL,
    pharmacogenomic_vars integer DEFAULT '-1'::integer NOT NULL,
    cancer_genes integer DEFAULT '-1'::integer NOT NULL,
    cancer_vars integer DEFAULT '-1'::integer NOT NULL
);


--
-- Name: pog_analysis_reports_probe_test_information_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pog_analysis_reports_probe_test_information_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pog_analysis_reports_probe_test_information_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pog_analysis_reports_probe_test_information_id_seq OWNED BY public.reports_probe_test_information.id;


--
-- Name: reports_summary_microbial; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports_summary_microbial (
    id integer NOT NULL,
    ident uuid NOT NULL,
    report_id integer NOT NULL,
    species text,
    "integrationSite" text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    updated_by integer
);


--
-- Name: pog_analysis_reports_summary_microbial_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pog_analysis_reports_summary_microbial_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pog_analysis_reports_summary_microbial_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pog_analysis_reports_summary_microbial_id_seq OWNED BY public.reports_summary_microbial.id;


--
-- Name: reports_mutation_burden; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports_mutation_burden (
    id integer NOT NULL,
    ident uuid NOT NULL,
    report_id integer NOT NULL,
    coding_snv_count integer,
    truncating_snv_count integer,
    coding_indels_count integer,
    frameshift_indels_count integer,
    quality_sv_count integer,
    quality_sv_expressed_count integer,
    coding_snv_percentile integer,
    coding_indel_percentile integer,
    quality_sv_percentile integer,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    role public.enum_reports_mutation_burden_role,
    total_snv_count integer,
    total_indel_count integer,
    total_mutations_per_mb double precision,
    updated_by integer
);


--
-- Name: pog_analysis_reports_summary_mutation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pog_analysis_reports_summary_mutation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pog_analysis_reports_summary_mutation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pog_analysis_reports_summary_mutation_id_seq OWNED BY public.reports_mutation_burden.id;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id integer NOT NULL,
    ident uuid,
    name character varying(255) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    updated_by integer,
    description text
);


--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.projects_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- Name: report_projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_projects (
    id integer NOT NULL,
    report_id integer NOT NULL,
    project_id integer NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    additional_project boolean DEFAULT false NOT NULL
);


--
-- Name: report_projects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.report_projects_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: report_projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.report_projects_id_seq OWNED BY public.report_projects.id;


--
-- Name: reports_comparators; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports_comparators (
    id integer NOT NULL,
    created_at timestamp with time zone,
    deleted_at timestamp with time zone,
    updated_at timestamp with time zone,
    ident uuid NOT NULL,
    report_id integer NOT NULL,
    analysis_role public.enum_reports_comparators_analysis_role NOT NULL,
    name text NOT NULL,
    version text,
    description text,
    size integer,
    updated_by integer
);


--
-- Name: reports_comparators_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reports_comparators_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reports_comparators_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reports_comparators_id_seq OWNED BY public.reports_comparators.id;


--
-- Name: reports_genes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports_genes (
    id integer NOT NULL,
    ident uuid NOT NULL,
    report_id integer NOT NULL,
    name text NOT NULL,
    tumour_suppressor boolean DEFAULT false,
    oncogene boolean DEFAULT false,
    cancer_related boolean DEFAULT false,
    drug_targetable boolean DEFAULT false,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    known_fusion_partner boolean DEFAULT false,
    therapeutic_associated boolean DEFAULT false,
    known_small_mutation boolean DEFAULT false,
    updated_by integer,
    cancer_gene boolean
);


--
-- Name: reports_genes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reports_genes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reports_genes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reports_genes_id_seq OWNED BY public.reports_genes.id;


--
-- Name: reports_hla_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports_hla_types (
    id integer NOT NULL,
    created_at timestamp with time zone,
    deleted_at timestamp with time zone,
    updated_at timestamp with time zone,
    ident uuid NOT NULL,
    report_id integer NOT NULL,
    library text NOT NULL,
    pathology public.enum_reports_hla_types_pathology NOT NULL,
    protocol public.enum_reports_hla_types_protocol NOT NULL,
    a1 text,
    a2 text,
    b1 text,
    b2 text,
    c1 text,
    c2 text,
    reads double precision,
    objective double precision,
    updated_by integer
);


--
-- Name: reports_hla_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reports_hla_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reports_hla_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reports_hla_types_id_seq OWNED BY public.reports_hla_types.id;


--
-- Name: reports_immune_cell_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports_immune_cell_types (
    ident uuid NOT NULL,
    id integer NOT NULL,
    created_at timestamp with time zone,
    deleted_at timestamp with time zone,
    updated_at timestamp with time zone,
    report_id integer NOT NULL,
    cell_type text NOT NULL,
    kb_category text,
    score double precision,
    percentile double precision,
    updated_by integer
);


--
-- Name: reports_immune_cell_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reports_immune_cell_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reports_immune_cell_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reports_immune_cell_types_id_seq OWNED BY public.reports_immune_cell_types.id;


--
-- Name: reports_msi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports_msi (
    ident uuid NOT NULL,
    id integer NOT NULL,
    created_at timestamp with time zone,
    deleted_at timestamp with time zone,
    updated_at timestamp with time zone,
    report_id integer NOT NULL,
    score double precision NOT NULL,
    kb_category text,
    updated_by integer,
    comments text,
    display_name text
);


--
-- Name: reports_msi_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reports_msi_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reports_msi_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reports_msi_id_seq OWNED BY public.reports_msi.id;


--
-- Name: reports_mutation_signature; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports_mutation_signature (
    id integer NOT NULL,
    ident uuid NOT NULL,
    signature text,
    pearson double precision,
    nnls double precision,
    associations text,
    features text,
    num_cancer_types integer,
    cancer_types text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    report_id integer NOT NULL,
    kb_category text,
    selected boolean DEFAULT false,
    updated_by integer
);


--
-- Name: reports_pairwise_expression_correlation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports_pairwise_expression_correlation (
    id integer NOT NULL,
    created_at timestamp with time zone,
    deleted_at timestamp with time zone,
    updated_at timestamp with time zone,
    ident uuid NOT NULL,
    report_id integer NOT NULL,
    patient_id text NOT NULL,
    library text,
    correlation double precision NOT NULL,
    tumour_type text,
    tissue_type text,
    tumour_content double precision,
    updated_by integer
);


--
-- Name: reports_pairwise_expression_correlation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reports_pairwise_expression_correlation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reports_pairwise_expression_correlation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reports_pairwise_expression_correlation_id_seq OWNED BY public.reports_pairwise_expression_correlation.id;


--
-- Name: reports_patient_information; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports_patient_information (
    id integer NOT NULL,
    ident uuid NOT NULL,
    physician character varying(255) NOT NULL,
    gender character varying(255),
    age character varying(255),
    "caseType" character varying(255) NOT NULL,
    diagnosis character varying(255),
    "reportDate" character varying(255),
    "biopsySite" character varying(255),
    "tumourSample" character varying(255),
    "tumourProtocol" character varying(255),
    "constitutionalSample" character varying(255),
    "constitutionalProtocol" character varying(255),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    report_id integer NOT NULL,
    updated_by integer,
    internal_pancancer_cohort text
);


--
-- Name: reports_probe_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports_probe_results (
    id integer NOT NULL,
    ident uuid NOT NULL,
    variant text NOT NULL,
    sample text NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    report_id integer NOT NULL,
    gene_id integer NOT NULL,
    comments text,
    updated_by integer,
    display_name text
);


--
-- Name: reports_protein_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports_protein_variants (
    id integer NOT NULL,
    created_at timestamp with time zone,
    deleted_at timestamp with time zone,
    updated_at timestamp with time zone,
    ident uuid NOT NULL,
    report_id integer NOT NULL,
    gene_id integer NOT NULL,
    percentile double precision,
    kiqr double precision,
    qc double precision,
    comparator text,
    total_sample_observed integer,
    secondary_percentile double precision,
    secondary_comparator text,
    kb_category text,
    updated_by integer,
    germline boolean,
    library text,
    comments text,
    display_name text
);


--
-- Name: reports_protein_variants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reports_protein_variants_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reports_protein_variants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reports_protein_variants_id_seq OWNED BY public.reports_protein_variants.id;


--
-- Name: reports_small_mutations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports_small_mutations (
    id integer NOT NULL,
    ident uuid NOT NULL,
    mutation_type public."enum_somaticMutations.smallMutations_mutationType",
    transcript text,
    protein_change text,
    zygosity text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    report_id integer NOT NULL,
    gene_id integer NOT NULL,
    detected_in text,
    hgvs_protein text,
    hgvs_cds text,
    hgvs_genomic text,
    tumour_alt_count integer,
    tumour_ref_count integer,
    tumour_depth integer,
    normal_alt_count integer,
    normal_ref_count integer,
    normal_depth integer,
    rna_alt_count integer,
    rna_ref_count integer,
    rna_depth integer,
    start_position integer,
    end_position integer,
    ncbi_build text,
    chromosome text,
    ref_seq text,
    alt_seq text,
    germline boolean,
    tumour_alt_copies integer,
    tumour_ref_copies integer,
    updated_by integer,
    library text,
    comments text,
    display_name text
);


--
-- Name: reports_structural_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports_structural_variants (
    id integer NOT NULL,
    ident uuid NOT NULL,
    breakpoint text,
    "eventType" text,
    "detectedIn" text,
    "conventionalName" text,
    svg text,
    "svgTitle" text,
    name text DEFAULT NULL::character varying,
    frame text DEFAULT NULL::character varying,
    "ctermGene" text DEFAULT NULL::character varying,
    "ntermGene" text DEFAULT NULL::character varying,
    "ctermTranscript" text DEFAULT NULL::character varying,
    "ntermTranscript" text DEFAULT NULL::character varying,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    report_id integer NOT NULL,
    mavis_product_id text,
    exon1 integer,
    exon2 integer,
    gene1_id integer,
    gene2_id integer,
    omic_support boolean,
    high_quality boolean,
    updated_by integer,
    germline boolean,
    library text,
    tumour_alt_count integer,
    tumour_depth integer,
    comments text,
    rna_alt_count integer,
    rna_depth integer,
    display_name text
);


--
-- Name: reports_summary_analyst_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports_summary_analyst_comments (
    id integer NOT NULL,
    ident uuid NOT NULL,
    comments text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    report_id integer NOT NULL,
    updated_by integer
);


--
-- Name: reports_summary_genomic_alterations_identified; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports_summary_genomic_alterations_identified (
    id integer NOT NULL,
    ident uuid NOT NULL,
    "geneVariant" text NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    report_id integer NOT NULL,
    updated_by integer,
    germline boolean
);


--
-- Name: reports_summary_pathway_analysis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports_summary_pathway_analysis (
    id integer NOT NULL,
    ident uuid NOT NULL,
    pathway text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    report_id integer NOT NULL,
    legend public.enum_reports_summary_pathway_analysis_legend DEFAULT 'v1'::public.enum_reports_summary_pathway_analysis_legend NOT NULL,
    updated_by integer
);


--
-- Name: reports_summary_variant_counts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports_summary_variant_counts (
    id integer NOT NULL,
    ident uuid NOT NULL,
    "smallMutations" integer NOT NULL,
    "CNVs" integer NOT NULL,
    "SVs" integer NOT NULL,
    "expressionOutliers" integer NOT NULL,
    "variantsUnknown" integer DEFAULT 0,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    report_id integer NOT NULL,
    updated_by integer
);


--
-- Name: reports_therapeutic_targets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports_therapeutic_targets (
    id integer NOT NULL,
    ident uuid NOT NULL,
    type public."enum_therapeuticTargets_type" NOT NULL,
    rank integer DEFAULT 0,
    notes text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    report_id integer NOT NULL,
    gene text,
    gene_graphkb_id text,
    variant text NOT NULL,
    variant_graphkb_id text,
    therapy text NOT NULL,
    therapy_graphkb_id text,
    context text NOT NULL,
    context_graphkb_id text,
    evidence_level text,
    evidence_level_graphkb_id text,
    kb_statement_ids text,
    updated_by integer,
    ipr_evidence_level text
);


--
-- Name: reports_tmbur_mutation_burden; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports_tmbur_mutation_burden (
    ident uuid NOT NULL,
    updated_by integer,
    id integer NOT NULL,
    created_at timestamp with time zone,
    deleted_at timestamp with time zone,
    updated_at timestamp with time zone,
    report_id integer NOT NULL,
    tumour character varying(255) DEFAULT NULL::character varying,
    normal character varying(255) DEFAULT NULL::character varying,
    non_n_bases_in_1_to_22_and_x_and_y text,
    total_genome_snvs integer,
    total_genome_indels integer,
    genome_snv_tmb double precision,
    genome_indel_tmb double precision,
    cds_bases_in_1_to_22_and_x_and_y text,
    cds_snvs integer,
    cds_indels integer,
    cds_snv_tmb double precision,
    cds_indel_tmb double precision,
    protein_snvs integer,
    protein_indels integer,
    protein_snv_tmb double precision,
    protein_indel_tmb double precision,
    msi_score double precision,
    comments text,
    kb_category text,
    display_name text
);


--
-- Name: reports_tmbur_mutation_burden_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reports_tmbur_mutation_burden_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reports_tmbur_mutation_burden_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reports_tmbur_mutation_burden_id_seq OWNED BY public.reports_tmbur_mutation_burden.id;


--
-- Name: somaticMutations.mutationSignature_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."somaticMutations.mutationSignature_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: somaticMutations.mutationSignature_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."somaticMutations.mutationSignature_id_seq" OWNED BY public.reports_mutation_signature.id;


--
-- Name: somaticMutations.smallMutations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."somaticMutations.smallMutations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: somaticMutations.smallMutations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."somaticMutations.smallMutations_id_seq" OWNED BY public.reports_small_mutations.id;


--
-- Name: structuralVariation.sv_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."structuralVariation.sv_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: structuralVariation.sv_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."structuralVariation.sv_id_seq" OWNED BY public.reports_structural_variants.id;


--
-- Name: summary.analystComments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."summary.analystComments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: summary.analystComments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."summary.analystComments_id_seq" OWNED BY public.reports_summary_analyst_comments.id;


--
-- Name: summary.genomicAlterationsIdentified_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."summary.genomicAlterationsIdentified_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: summary.genomicAlterationsIdentified_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."summary.genomicAlterationsIdentified_id_seq" OWNED BY public.reports_summary_genomic_alterations_identified.id;


--
-- Name: summary.pathwayAnalysis_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."summary.pathwayAnalysis_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: summary.pathwayAnalysis_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."summary.pathwayAnalysis_id_seq" OWNED BY public.reports_summary_pathway_analysis.id;


--
-- Name: summary.patientInformation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."summary.patientInformation_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: summary.patientInformation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."summary.patientInformation_id_seq" OWNED BY public.reports_patient_information.id;


--
-- Name: summary.probeTarget_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."summary.probeTarget_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: summary.probeTarget_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."summary.probeTarget_id_seq" OWNED BY public.reports_probe_results.id;


--
-- Name: summary.variantCounts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."summary.variantCounts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: summary.variantCounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."summary.variantCounts_id_seq" OWNED BY public.reports_summary_variant_counts.id;


--
-- Name: templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.templates (
    id integer NOT NULL,
    ident uuid NOT NULL,
    name character varying(255) NOT NULL,
    organization text,
    sections jsonb NOT NULL,
    logo_id integer,
    header_id integer,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    updated_by integer,
    description text
);


--
-- Name: templates_appendix; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.templates_appendix (
    id integer NOT NULL,
    ident uuid NOT NULL,
    text text,
    template_id integer NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    updated_by integer,
    project_id integer
);


--
-- Name: templates_appendix_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.templates_appendix_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: templates_appendix_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.templates_appendix_id_seq OWNED BY public.templates_appendix.id;


--
-- Name: templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.templates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.templates_id_seq OWNED BY public.templates.id;


--
-- Name: therapeuticTargets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."therapeuticTargets_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: therapeuticTargets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."therapeuticTargets_id_seq" OWNED BY public.reports_therapeutic_targets.id;


--
-- Name: user_group_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_group_members (
    id integer NOT NULL,
    user_id integer NOT NULL,
    group_id integer NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: userGroupMembers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."userGroupMembers_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: userGroupMembers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."userGroupMembers_id_seq" OWNED BY public.user_group_members.id;


--
-- Name: user_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_groups (
    id integer NOT NULL,
    ident uuid,
    name character varying(255) NOT NULL,
    owner_id integer NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    updated_by integer
);


--
-- Name: userGroups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."userGroups_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: userGroups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."userGroups_id_seq" OWNED BY public.user_groups.id;


--
-- Name: user_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_metadata (
    id integer NOT NULL,
    ident uuid NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    updated_by integer
);


--
-- Name: user_metadata_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_metadata_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_metadata_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_metadata_id_seq OWNED BY public.user_metadata.id;


--
-- Name: user_projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_projects (
    id integer NOT NULL,
    user_id integer NOT NULL,
    project_id integer NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: user_projects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_projects_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_projects_id_seq OWNED BY public.user_projects.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    ident uuid,
    username character varying(255) NOT NULL,
    password character varying(255),
    type public.enum_users_type DEFAULT 'local'::public.enum_users_type,
    "firstName" character varying(255) NOT NULL,
    "lastName" character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    updated_by integer,
    last_login_at timestamp with time zone
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: user id; Type: DEFAULT; Schema: development; Owner: -
--

ALTER TABLE ONLY development."user" ALTER COLUMN id SET DEFAULT nextval('development.user_id_seq'::regclass);


--
-- Name: germline_report_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.germline_report_users ALTER COLUMN id SET DEFAULT nextval('public.germline_report_users_id_seq'::regclass);


--
-- Name: germline_reports_to_projects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.germline_reports_to_projects ALTER COLUMN id SET DEFAULT nextval('public.germline_reports_to_projects_id_seq'::regclass);


--
-- Name: germline_small_mutations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.germline_small_mutations ALTER COLUMN id SET DEFAULT nextval('public.pog_analysis_germline_small_mutations_id_seq'::regclass);


--
-- Name: germline_small_mutations_review id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.germline_small_mutations_review ALTER COLUMN id SET DEFAULT nextval('public.pog_analysis_germline_small_mutations_review_id_seq'::regclass);


--
-- Name: germline_small_mutations_variant id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.germline_small_mutations_variant ALTER COLUMN id SET DEFAULT nextval('public.pog_analysis_germline_small_mutations_variant_id_seq'::regclass);


--
-- Name: images id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.images ALTER COLUMN id SET DEFAULT nextval('public.images_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- Name: report_projects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_projects ALTER COLUMN id SET DEFAULT nextval('public.report_projects_id_seq'::regclass);


--
-- Name: reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports ALTER COLUMN id SET DEFAULT nextval('public.pog_analysis_reports_id_seq'::regclass);


--
-- Name: reports_comparators id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_comparators ALTER COLUMN id SET DEFAULT nextval('public.reports_comparators_id_seq'::regclass);


--
-- Name: reports_copy_variants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_copy_variants ALTER COLUMN id SET DEFAULT nextval('public."copyNumberAnalysis.cnv_id_seq"'::regclass);


--
-- Name: reports_expression_variants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_expression_variants ALTER COLUMN id SET DEFAULT nextval('public."expression.outlier_id_seq"'::regclass);


--
-- Name: reports_genes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_genes ALTER COLUMN id SET DEFAULT nextval('public.reports_genes_id_seq'::regclass);


--
-- Name: reports_hla_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_hla_types ALTER COLUMN id SET DEFAULT nextval('public.reports_hla_types_id_seq'::regclass);


--
-- Name: reports_image_data id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_image_data ALTER COLUMN id SET DEFAULT nextval('public."imageData_id_seq"'::regclass);


--
-- Name: reports_immune_cell_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_immune_cell_types ALTER COLUMN id SET DEFAULT nextval('public.reports_immune_cell_types_id_seq'::regclass);


--
-- Name: reports_kb_matches id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_kb_matches ALTER COLUMN id SET DEFAULT nextval('public."detailedGenomicAnalysis.alterations_id_seq"'::regclass);


--
-- Name: reports_mavis_summary id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_mavis_summary ALTER COLUMN id SET DEFAULT nextval('public.pog_analysis_reports_mavis_summary_id_seq'::regclass);


--
-- Name: reports_msi id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_msi ALTER COLUMN id SET DEFAULT nextval('public.reports_msi_id_seq'::regclass);


--
-- Name: reports_mutation_burden id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_mutation_burden ALTER COLUMN id SET DEFAULT nextval('public.pog_analysis_reports_summary_mutation_id_seq'::regclass);


--
-- Name: reports_mutation_signature id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_mutation_signature ALTER COLUMN id SET DEFAULT nextval('public."somaticMutations.mutationSignature_id_seq"'::regclass);


--
-- Name: reports_pairwise_expression_correlation id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_pairwise_expression_correlation ALTER COLUMN id SET DEFAULT nextval('public.reports_pairwise_expression_correlation_id_seq'::regclass);


--
-- Name: reports_patient_information id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_patient_information ALTER COLUMN id SET DEFAULT nextval('public."summary.patientInformation_id_seq"'::regclass);


--
-- Name: reports_presentation_discussion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_presentation_discussion ALTER COLUMN id SET DEFAULT nextval('public.pog_analysis_reports_presentation_discussion_id_seq'::regclass);


--
-- Name: reports_presentation_slides id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_presentation_slides ALTER COLUMN id SET DEFAULT nextval('public.pog_analysis_reports_presentation_slides_id_seq'::regclass);


--
-- Name: reports_probe_results id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_probe_results ALTER COLUMN id SET DEFAULT nextval('public."summary.probeTarget_id_seq"'::regclass);


--
-- Name: reports_probe_test_information id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_probe_test_information ALTER COLUMN id SET DEFAULT nextval('public.pog_analysis_reports_probe_test_information_id_seq'::regclass);


--
-- Name: reports_protein_variants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_protein_variants ALTER COLUMN id SET DEFAULT nextval('public.reports_protein_variants_id_seq'::regclass);


--
-- Name: reports_signatures id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_signatures ALTER COLUMN id SET DEFAULT nextval('public.pog_analysis_reports_probe_signature_id_seq'::regclass);


--
-- Name: reports_small_mutations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_small_mutations ALTER COLUMN id SET DEFAULT nextval('public."somaticMutations.smallMutations_id_seq"'::regclass);


--
-- Name: reports_structural_variants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_structural_variants ALTER COLUMN id SET DEFAULT nextval('public."structuralVariation.sv_id_seq"'::regclass);


--
-- Name: reports_summary_analyst_comments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_summary_analyst_comments ALTER COLUMN id SET DEFAULT nextval('public."summary.analystComments_id_seq"'::regclass);


--
-- Name: reports_summary_genomic_alterations_identified id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_summary_genomic_alterations_identified ALTER COLUMN id SET DEFAULT nextval('public."summary.genomicAlterationsIdentified_id_seq"'::regclass);


--
-- Name: reports_summary_microbial id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_summary_microbial ALTER COLUMN id SET DEFAULT nextval('public.pog_analysis_reports_summary_microbial_id_seq'::regclass);


--
-- Name: reports_summary_pathway_analysis id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_summary_pathway_analysis ALTER COLUMN id SET DEFAULT nextval('public."summary.pathwayAnalysis_id_seq"'::regclass);


--
-- Name: reports_summary_variant_counts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_summary_variant_counts ALTER COLUMN id SET DEFAULT nextval('public."summary.variantCounts_id_seq"'::regclass);


--
-- Name: reports_therapeutic_targets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_therapeutic_targets ALTER COLUMN id SET DEFAULT nextval('public."therapeuticTargets_id_seq"'::regclass);


--
-- Name: reports_tmbur_mutation_burden id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_tmbur_mutation_burden ALTER COLUMN id SET DEFAULT nextval('public.reports_tmbur_mutation_burden_id_seq'::regclass);


--
-- Name: reports_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_users ALTER COLUMN id SET DEFAULT nextval('public."POGUsers_id_seq"'::regclass);


--
-- Name: templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates ALTER COLUMN id SET DEFAULT nextval('public.templates_id_seq'::regclass);


--
-- Name: templates_appendix id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates_appendix ALTER COLUMN id SET DEFAULT nextval('public.templates_appendix_id_seq'::regclass);


--
-- Name: user_group_members id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_group_members ALTER COLUMN id SET DEFAULT nextval('public."userGroupMembers_id_seq"'::regclass);


--
-- Name: user_groups id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_groups ALTER COLUMN id SET DEFAULT nextval('public."userGroups_id_seq"'::regclass);


--
-- Name: user_metadata id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_metadata ALTER COLUMN id SET DEFAULT nextval('public.user_metadata_id_seq'::regclass);


--
-- Name: user_projects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_projects ALTER COLUMN id SET DEFAULT nextval('public.user_projects_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: user; Type: TABLE DATA; Schema: development; Owner: -
--

COPY development."user" (id, ident, username, password, type, "firstName", "lastName", email, access, "createdAt", "updatedAt", "deletedAt") FROM stdin;
\.


--
-- Data for Name: SequelizeMeta; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SequelizeMeta" (name) FROM stdin;
20190607210854-pog_patient_information-foreign-key-constraint-migration.js
20190627162438-pog_reports_histories_fix.js
20190911205926-add_missing_uuids_to_kb_references_table.js
20191218193844-rename_reports_users_column.js
20191105202306-remove_kb_from_ipr_api.js
20191105230453-remove_tracking_app_from_ipr_api.js
20200108200754-rename-field-pog_report_id-to-report_id.js
20200128000834-DEVSU-828-therapeutic-targets.js
20200204234311-DEVSU-848-merge-probe-tables.js
20200207164453-DEVSU-831-remove_column_access_from_users.js
20200214234941-DEVSU-859-migrate-metadata.js
20200215005828-DEVSU-859-migrate-metadata-2.js
20200220192422-clean-up-patient-metadata.js
20200220194530-clean-up-patient-metadata-2.js
20200220195435-clean-up-patient-metadata-3.js
20200227171210-DEVSU-842-add-not-null-constraint-to-report_id.js
20200227200121-DEVSU-837-cleanup-analyst-comments-model.js
20200228162037-DEVSU-793-rename-db-tables.js
20200228172732-DEVSU-793-rename-db-tables-2.js
20200304215356-DEVSU-903-add-cascade-to-foreign-keys.js
20200306182136-DEVSU-909-drop-drug-target.js
20200306182200-DEVSU-898-gene-fk-1.js
20200306182200-DEVSU-898-gene-fk-2.js
20200306182200-DEVSU-898-gene-fk-3.js
20200306182200-DEVSU-898-gene-fk-4.js
20200306182201-DEVSU-889-rename-alterations.js
20200317182426-DEVSU-894-deduplicate-structural-variants.js
20200317194655-DEVSU-893-dedup-small-mutations.js
20200323212803-DEVSU-895-migrate-expr-and-cnv.js
20200323212804-DEVSU-896-migrate-kb-matches-1.js
20200323212804-DEVSU-896-migrate-kb-matches-2.js
20200323212804-DEVSU-896-migrate-kb-matches-3.js
20200323212804-DEVSU-896-migrate-kb-matches-4.js
20200323212804-DEVSU-896-migrate-kb-matches-5.js
20200331195759-DEVSU-950-kb-matches-booleans.js
20200401195952-DEVSU-951-render-lag.js
20200403165243-DEVSU-934-drop-therapeutic-table.js
20200406182519-DEVSU-935-update-migrations.js
20200417001151-DEVSU-996-therapeutic-rank-data-fix.js
20200427191241-DEVSU-984-handle-re-ordering.js
20200429154614-DEVSU-1010-missing-cascade.js
20200512222605-DEVSU-1075-add-quality-flag.js
20200513170725-DEVSU-1063-add-new-fields-for-report-genes.js
20200513220224-DEVSU-1062-add-kb-category-fields.js
20200525155014-DEVSU-1093-remove-dup-project.js
20200526215025-DEVSU-906-remove-duplicate-mutation.js
20200602213824-DEVSU-1066-presented-state-change.js
20200609190657-DEVSU-1126-change-signature-to-string.js
20200610213550-DEVSU-988-merge-signature-tables.js
20200710174849-DEVSU-1172-add-inferred-boolean-column.js
20200723173018-DEVSU-1189-add-hgvs-columns-to-small-mutations.js
20200724165213-DEVSU-1187-add-title-and-caption-to-images.js
20200728183429-DEVSU-1193-support-new-mut-sig-image-keys.js
20200807230001-DEVSU-931-split-protein-and-rna-1.js
20200807230001-DEVSU-931-split-protein-and-rna-2.js
20200807230001-DEVSU-931-split-protein-and-rna-3.js
20200810223246-DEVSU-1207-standardize-copy-variant-fields.js
20200810231239-DEVSU-1202-standardize-small-mutation-fields-1.js
20200810231239-DEVSU-1202-standardize-small-mutation-fields-2.js
20200811162814-DEVSU-976-mutation-signature-new-columns.js
20200812003409-DEVSU-1220-comparators-table-1.js
20200812003409-DEVSU-1220-comparators-table-2.js
20200812220419-DEVSU-1224-add-kbstatementId-column-to-therapeutic-options.js
20200813005854-DEVSU-1211-standardize-expression-fields.js
20200813005855-DEVSU-1235-pairwise-expression-correlation.js
20200813005856-DEVSU-1238-add-hla-types.js
20200814182533-DEVSU-1256-backfill-depth-counts.js
20200828215034-DEVSU-1237-create-immune-cell-types-table-and-route.js
20200831212733-DEVSU-1283-add-unique-indent-index.js
20200831224331-DEVSU-1269-migrate-image-roles-1.js
20200831224331-DEVSU-1269-migrate-image-roles-2.js
20200831224331-DEVSU-1269-migrate-image-roles-3.js
20200831224331-DEVSU-1269-migrate-image-roles-4.js
20200831224331-DEVSU-1269-migrate-image-roles-5.js
20200902165706-DEVSU-1280-update-mutation-burden-fields.js
20200902175516-DEVSU-1266-add-analysis_started_at_field-report.js
20201014164905-DEVSU-1316-update-kb-matches-category-enum.js
20201014180820-DEVSU-1317-add-germline-column-to-small-mutations.js
20201116185304-DEVSU-1342-add-table-for-msi-data.js
20201126193457-DEVSU-1385-standardize-germline-sections.js
20201202192042-DEVSU-1386-create-table-to-store-report-templates.js
20210125220210-DEVSU-1387-connect-template-to-report.js
20210129171518-DEVSU-1420-delete-unused-tables-enums-and-indices.js
20210219165737-DEVSU-1432-pathway-legend-image.js
20210321173038-DEVSU-1478-remove-user-metadata-from-user-model.js
20210325163837-DEVSU-1476-fix-pathway-analysis-routes.js
20210423180344-DEVSU-1498-update-db-indicies.js
20210430212344-DEVSU-1461-add-support-for-affected-copies.js
20210506181314-DEVSU-1482-update-user-routes.js
20210601153448-DEVSU-1520-add-pharmacogenomic-section.js
20210629172128-DEVSU-1549-add-ability-to-track-updates.js
20210707163556-DEVSU-1558-add-storage-for-new-probe-test-fields.js
20210714173448-DEVSU-1561-add-new-fields-to-kb-matches-table.js
20210920212436-DEVSU-1636-integrate-germline-reports-into-reports-acl.js
20211108213152-DEVSU-1674-add-appendix-to-templates.js
20211112185802-DEVSU-1657-remove-full-project-access-group-from-database.js
20211214225030-DEVSU-1690-add-support-for-new-exp-density-images.js
20220120192720-DEVSU-1708-split-dbsnp-into-separate-columns.js
20220125001042-DEVSU-1710-add-support-for-cancer-predisposition.js
20220217221235-DEVSU-1742-get-kbmatches-review-status-during-upload.js
20220224185209-DEVSU-1729-add-germline-field-to-all-variant-types.js
20220314213710-DEVSU-1749-add-new-fields-to-probe-test-information.js
20220323221350-DEVSU-1763-add-germline-field-to-genomic-alterations-identified.js
20220406161001-DEVSU-1130-restrict-deletion-of-users-who-have-signed-a-report.js
20220408172355-DEVSU-949-add-unique-constraint-to-genomic-alterations-identified.js
20220422164659-DEVSU-1804-add-support-for-pediatric-ids.js
20220425203710-DEVSU-1758-add-library-name-field-to-all-variant-types.js
20220503180112-DEVSU-1543-add-description-for-templates.js
20220517214734-DEVSU-1816-add-internal_pancancer_cohort-fields-to-api-db.js
20220610210212-DEVSU-1747-create-tmbur-mut-table.js
20220713213047-DEVSU-1668-add-creator-signatures.js
20220719224637-DEVSU-1816-add-internal-pancancer-cohort-to-analysis-roles-enum.js
20220725194105-DEVSU-1830-add-germline-variant-previously-reported-field.js
20220725201352-DEVSU-1668-add-project_id-to-template-appendix.js
20220912200532-DEVSU-1872-add-ipr_evidence_level-columns.js
20221104193904-VDB-1889-Add-tumourAlt-tumourDepth-to-SV.js
20221202195545-DEVSU-1891-add-columns-to-germline-report.js
20230130175450-DEVSU-1929-add-comments-field-to-variants.js
20230208194424-DEVSU-1886-update-kbMatches-enum.js
20230215003445-DEVSU-1886-add-tmbur-variant_type.js
20230217192811-DEVSU-1931-add-tumour_type-column-to-reports.js
20230217205138-DEVSU-1899-add-project-description.js
20230307215956-DEVSU-1938-add-comments-msi-tmbur.js
20230308220645-DEVSU-1930-add-state-to-germline-reports.js
20230328183840-DEVSU-1943_add_additional_project.js
20230404135753-DEVSU-1962-add-rna-cols-to-structural-variants.js
20230503180603-DEVSU-1981-add-m1m2score-to-reports.js
20230424173214-DEVSU-1830-fix-previouslyReported-type.js
20230508141924-DEVSU-1990-add-kbcategory-to-tmb.js
20230705205653-DEVSU-2027-add-displayName-to-variants.js
20230719122213-DEVSU-2031-create-notifications-tables.js
20230731222809-DEVSU-2035-add-captiv8-to-reports.js
20230824190218-DEVSU-2050-add-displayName-to-probeResults.js
20231012213005-DEVSU-2038-add-cancer_gene-to-gene.js
20231117185810-DEVSU-2128-add-lastloginat.js
20231121203719-DEVSU-2129-datafix-unreviewed-access.js
\.


--
-- Name: user_id_seq; Type: SEQUENCE SET; Schema: development; Owner: -
--

SELECT pg_catalog.setval('development.user_id_seq', 1, false);


--
-- Name: POGUsers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."POGUsers_id_seq"', 2896, true);


--
-- Name: user user_ident_key; Type: CONSTRAINT; Schema: development; Owner: -
--

ALTER TABLE ONLY development."user"
    ADD CONSTRAINT user_ident_key UNIQUE (ident);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: development; Owner: -
--

ALTER TABLE ONLY development."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: user user_username_key; Type: CONSTRAINT; Schema: development; Owner: -
--

ALTER TABLE ONLY development."user"
    ADD CONSTRAINT user_username_key UNIQUE (username);


--
-- Name: reports_users POGUsers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_users
    ADD CONSTRAINT "POGUsers_pkey" PRIMARY KEY (id);


--
-- Name: SequelizeMeta SequelizeMeta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SequelizeMeta"
    ADD CONSTRAINT "SequelizeMeta_pkey" PRIMARY KEY (name);


--
-- Name: reports_copy_variants copyNumberAnalysis.cnv_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_copy_variants
    ADD CONSTRAINT "copyNumberAnalysis.cnv_pkey" PRIMARY KEY (id);


--
-- Name: reports_kb_matches detailedGenomicAnalysis.alterations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_kb_matches
    ADD CONSTRAINT "detailedGenomicAnalysis.alterations_pkey" PRIMARY KEY (id);


--
-- Name: reports_expression_variants expression.outlier_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_expression_variants
    ADD CONSTRAINT "expression.outlier_pkey" PRIMARY KEY (id);


--
-- Name: germline_report_users germline_report_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.germline_report_users
    ADD CONSTRAINT germline_report_users_pkey PRIMARY KEY (id);


--
-- Name: germline_reports_to_projects germline_reports_to_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.germline_reports_to_projects
    ADD CONSTRAINT germline_reports_to_projects_pkey PRIMARY KEY (id);


--
-- Name: reports_image_data imageData_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_image_data
    ADD CONSTRAINT "imageData_pkey" PRIMARY KEY (id);


--
-- Name: images images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.images
    ADD CONSTRAINT images_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: germline_small_mutations pog_analysis_germline_small_mutations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.germline_small_mutations
    ADD CONSTRAINT pog_analysis_germline_small_mutations_pkey PRIMARY KEY (id);


--
-- Name: germline_small_mutations_review pog_analysis_germline_small_mutations_review_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.germline_small_mutations_review
    ADD CONSTRAINT pog_analysis_germline_small_mutations_review_pkey PRIMARY KEY (id);


--
-- Name: germline_small_mutations_variant pog_analysis_germline_small_mutations_variant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.germline_small_mutations_variant
    ADD CONSTRAINT pog_analysis_germline_small_mutations_variant_pkey PRIMARY KEY (id);


--
-- Name: reports_mavis_summary pog_analysis_reports_mavis_summary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_mavis_summary
    ADD CONSTRAINT pog_analysis_reports_mavis_summary_pkey PRIMARY KEY (id);


--
-- Name: reports pog_analysis_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT pog_analysis_reports_pkey PRIMARY KEY (id);


--
-- Name: reports_presentation_discussion pog_analysis_reports_presentation_discussion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_presentation_discussion
    ADD CONSTRAINT pog_analysis_reports_presentation_discussion_pkey PRIMARY KEY (id);


--
-- Name: reports_presentation_slides pog_analysis_reports_presentation_slides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_presentation_slides
    ADD CONSTRAINT pog_analysis_reports_presentation_slides_pkey PRIMARY KEY (id);


--
-- Name: reports_signatures pog_analysis_reports_probe_signature_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_signatures
    ADD CONSTRAINT pog_analysis_reports_probe_signature_pkey PRIMARY KEY (id);


--
-- Name: reports_probe_test_information pog_analysis_reports_probe_test_information_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_probe_test_information
    ADD CONSTRAINT pog_analysis_reports_probe_test_information_pkey PRIMARY KEY (id);


--
-- Name: reports_summary_microbial pog_analysis_reports_summary_microbial_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_summary_microbial
    ADD CONSTRAINT pog_analysis_reports_summary_microbial_pkey PRIMARY KEY (id);


--
-- Name: reports_mutation_burden pog_analysis_reports_summary_mutation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_mutation_burden
    ADD CONSTRAINT pog_analysis_reports_summary_mutation_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: report_projects report_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_projects
    ADD CONSTRAINT report_projects_pkey PRIMARY KEY (id);


--
-- Name: reports_comparators reports_comparators_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_comparators
    ADD CONSTRAINT reports_comparators_pkey PRIMARY KEY (id);


--
-- Name: reports_genes reports_genes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_genes
    ADD CONSTRAINT reports_genes_pkey PRIMARY KEY (id);


--
-- Name: reports_hla_types reports_hla_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_hla_types
    ADD CONSTRAINT reports_hla_types_pkey PRIMARY KEY (id);


--
-- Name: reports_immune_cell_types reports_immune_cell_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_immune_cell_types
    ADD CONSTRAINT reports_immune_cell_types_pkey PRIMARY KEY (id);


--
-- Name: reports_msi reports_msi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_msi
    ADD CONSTRAINT reports_msi_pkey PRIMARY KEY (id);


--
-- Name: reports_pairwise_expression_correlation reports_pairwise_expression_correlation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_pairwise_expression_correlation
    ADD CONSTRAINT reports_pairwise_expression_correlation_pkey PRIMARY KEY (id);


--
-- Name: reports_protein_variants reports_protein_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_protein_variants
    ADD CONSTRAINT reports_protein_variants_pkey PRIMARY KEY (id);


--
-- Name: reports_therapeutic_targets reports_therapeutic_targets_report_id_type_rank_constraint; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_therapeutic_targets
    ADD CONSTRAINT reports_therapeutic_targets_report_id_type_rank_constraint EXCLUDE USING btree (report_id WITH =, type WITH =, rank WITH =, (
CASE
    WHEN (deleted_at IS NULL) THEN true
    ELSE NULL::boolean
END) WITH =) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: reports_tmbur_mutation_burden reports_tmbur_mutation_burden_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_tmbur_mutation_burden
    ADD CONSTRAINT reports_tmbur_mutation_burden_pkey PRIMARY KEY (id);


--
-- Name: reports_mutation_signature somaticMutations.mutationSignature_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_mutation_signature
    ADD CONSTRAINT "somaticMutations.mutationSignature_pkey" PRIMARY KEY (id);


--
-- Name: reports_small_mutations somaticMutations.smallMutations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_small_mutations
    ADD CONSTRAINT "somaticMutations.smallMutations_pkey" PRIMARY KEY (id);


--
-- Name: reports_structural_variants structuralVariation.sv_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_structural_variants
    ADD CONSTRAINT "structuralVariation.sv_pkey" PRIMARY KEY (id);


--
-- Name: reports_summary_analyst_comments summary.analystComments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_summary_analyst_comments
    ADD CONSTRAINT "summary.analystComments_pkey" PRIMARY KEY (id);


--
-- Name: reports_summary_genomic_alterations_identified summary.genomicAlterationsIdentified_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_summary_genomic_alterations_identified
    ADD CONSTRAINT "summary.genomicAlterationsIdentified_pkey" PRIMARY KEY (id);


--
-- Name: reports_summary_pathway_analysis summary.pathwayAnalysis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_summary_pathway_analysis
    ADD CONSTRAINT "summary.pathwayAnalysis_pkey" PRIMARY KEY (id);


--
-- Name: reports_patient_information summary.patientInformation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_patient_information
    ADD CONSTRAINT "summary.patientInformation_pkey" PRIMARY KEY (id);


--
-- Name: reports_probe_results summary.probeTarget_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_probe_results
    ADD CONSTRAINT "summary.probeTarget_pkey" PRIMARY KEY (id);


--
-- Name: reports_summary_variant_counts summary.variantCounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_summary_variant_counts
    ADD CONSTRAINT "summary.variantCounts_pkey" PRIMARY KEY (id);


--
-- Name: templates_appendix templates_appendix_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates_appendix
    ADD CONSTRAINT templates_appendix_pkey PRIMARY KEY (id);


--
-- Name: templates templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_pkey PRIMARY KEY (id);


--
-- Name: reports_therapeutic_targets therapeuticTargets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_therapeutic_targets
    ADD CONSTRAINT "therapeuticTargets_pkey" PRIMARY KEY (id);


--
-- Name: user_group_members userGroupMembers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_group_members
    ADD CONSTRAINT "userGroupMembers_pkey" PRIMARY KEY (id);


--
-- Name: user_groups userGroups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT "userGroups_pkey" PRIMARY KEY (id);


--
-- Name: user_metadata user_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_metadata
    ADD CONSTRAINT user_metadata_pkey PRIMARY KEY (id);


--
-- Name: user_projects user_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_projects
    ADD CONSTRAINT user_projects_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: analysis_reports_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX analysis_reports_ident_index ON public.reports USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: copy_number_analysis_cnv_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX copy_number_analysis_cnv_ident_index ON public.reports_copy_variants USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: dga_alterations_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX dga_alterations_ident_index ON public.reports_kb_matches USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: expression_outlier_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX expression_outlier_ident_index ON public.reports_expression_variants USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: germline_report_users_germline_report_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX germline_report_users_germline_report_id_index ON public.germline_report_users USING btree (germline_report_id) WHERE (deleted_at IS NULL);


--
-- Name: germline_report_users_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX germline_report_users_ident_index ON public.germline_report_users USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: germline_reports_to_projects_germline_report_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX germline_reports_to_projects_germline_report_id_index ON public.germline_reports_to_projects USING btree (germline_report_id) WHERE (deleted_at IS NULL);


--
-- Name: germline_small_mutations_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX germline_small_mutations_ident_index ON public.germline_small_mutations USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: germline_small_mutations_review_germline_report_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX germline_small_mutations_review_germline_report_id_index ON public.germline_small_mutations_review USING btree (germline_report_id) WHERE (deleted_at IS NULL);


--
-- Name: germline_small_mutations_review_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX germline_small_mutations_review_ident_index ON public.germline_small_mutations_review USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: germline_small_mutations_variant_germline_report_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX germline_small_mutations_variant_germline_report_id_index ON public.germline_small_mutations_variant USING btree (germline_report_id) WHERE (deleted_at IS NULL);


--
-- Name: germline_small_mutations_variant_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX germline_small_mutations_variant_ident_index ON public.germline_small_mutations_variant USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: images_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX images_ident_index ON public.images USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: patient_information_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX patient_information_ident_index ON public.reports_patient_information USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: probe_signature_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX probe_signature_ident_index ON public.reports_signatures USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: projects_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX projects_ident_index ON public.projects USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: projects_name_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX projects_name_index ON public.projects USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: report_projects_report_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX report_projects_report_id_index ON public.report_projects USING btree (report_id) WHERE (deleted_at IS NULL);


--
-- Name: reports_comparators_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX reports_comparators_ident_index ON public.reports_comparators USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: reports_comparators_report_id_analysis_role_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX reports_comparators_report_id_analysis_role_index ON public.reports_comparators USING btree (report_id, analysis_role) WHERE (deleted_at IS NULL);


--
-- Name: reports_comparators_report_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_comparators_report_id_index ON public.reports_comparators USING btree (report_id) WHERE (deleted_at IS NULL);


--
-- Name: reports_copy_variants_gene_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX reports_copy_variants_gene_id_index ON public.reports_copy_variants USING btree (gene_id) WHERE (deleted_at IS NULL);


--
-- Name: reports_copy_variants_report_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_copy_variants_report_id_index ON public.reports_copy_variants USING btree (report_id) WHERE (deleted_at IS NULL);


--
-- Name: reports_expression_variants_gene_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX reports_expression_variants_gene_id_index ON public.reports_expression_variants USING btree (gene_id) WHERE (deleted_at IS NULL);


--
-- Name: reports_expression_variants_report_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_expression_variants_report_id_index ON public.reports_expression_variants USING btree (report_id) WHERE (deleted_at IS NULL);


--
-- Name: reports_genes_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX reports_genes_ident_index ON public.reports_genes USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: reports_genes_report_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_genes_report_id_index ON public.reports_genes USING btree (report_id) WHERE (deleted_at IS NULL);


--
-- Name: reports_genes_report_id_name_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX reports_genes_report_id_name_index ON public.reports_genes USING btree (report_id, name) WHERE (deleted_at IS NULL);


--
-- Name: reports_hla_types_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX reports_hla_types_ident_index ON public.reports_hla_types USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: reports_hla_types_report_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_hla_types_report_id_index ON public.reports_hla_types USING btree (report_id) WHERE (deleted_at IS NULL);


--
-- Name: reports_image_data_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX reports_image_data_ident_index ON public.reports_image_data USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: reports_image_data_report_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_image_data_report_id_index ON public.reports_image_data USING btree (report_id) WHERE (deleted_at IS NULL);


--
-- Name: reports_image_data_report_id_key_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX reports_image_data_report_id_key_index ON public.reports_image_data USING btree (report_id, key) WHERE (deleted_at IS NULL);


--
-- Name: reports_immune_cell_types_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX reports_immune_cell_types_ident_index ON public.reports_immune_cell_types USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: reports_immune_cell_types_report_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_immune_cell_types_report_id_index ON public.reports_immune_cell_types USING btree (report_id) WHERE (deleted_at IS NULL);


--
-- Name: reports_kb_matches_report_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_kb_matches_report_id_index ON public.reports_kb_matches USING btree (report_id) WHERE (deleted_at IS NULL);


--
-- Name: reports_kb_matches_variant_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_kb_matches_variant_id_index ON public.reports_kb_matches USING btree (variant_id);


--
-- Name: reports_kb_matches_variant_type_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_kb_matches_variant_type_index ON public.reports_kb_matches USING btree (variant_type);


--
-- Name: reports_mavis_summary_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX reports_mavis_summary_ident_index ON public.reports_mavis_summary USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: reports_mavis_summary_report_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_mavis_summary_report_id_index ON public.reports_mavis_summary USING btree (report_id) WHERE (deleted_at IS NULL);


--
-- Name: reports_msi_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX reports_msi_ident_index ON public.reports_msi USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: reports_msi_report_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_msi_report_id_index ON public.reports_msi USING btree (report_id) WHERE (deleted_at IS NULL);


--
-- Name: reports_mutation_burden_report_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_mutation_burden_report_id_index ON public.reports_mutation_burden USING btree (report_id) WHERE (deleted_at IS NULL);


--
-- Name: reports_mutation_burden_report_id_role_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX reports_mutation_burden_report_id_role_index ON public.reports_mutation_burden USING btree (report_id, role) WHERE (deleted_at IS NULL);


--
-- Name: reports_mutation_signature_report_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_mutation_signature_report_id_index ON public.reports_mutation_signature USING btree (report_id) WHERE (deleted_at IS NULL);


--
-- Name: reports_pairwise_expression_correlation_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX reports_pairwise_expression_correlation_ident_index ON public.reports_pairwise_expression_correlation USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: reports_pairwise_expression_correlation_report_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_pairwise_expression_correlation_report_id_index ON public.reports_pairwise_expression_correlation USING btree (report_id) WHERE (deleted_at IS NULL);


--
-- Name: reports_patient_information_report_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_patient_information_report_id_index ON public.reports_patient_information USING btree (report_id) WHERE (deleted_at IS NULL);


--
-- Name: reports_presentation_discussion_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX reports_presentation_discussion_ident_index ON public.reports_presentation_discussion USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: reports_presentation_discussion_report_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_presentation_discussion_report_id_index ON public.reports_presentation_discussion USING btree (report_id) WHERE (deleted_at IS NULL);


--
-- Name: reports_presentation_slides_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX reports_presentation_slides_ident_index ON public.reports_presentation_slides USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: reports_presentation_slides_report_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_presentation_slides_report_id_index ON public.reports_presentation_slides USING btree (report_id) WHERE (deleted_at IS NULL);


--
-- Name: reports_probe_results_report_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_probe_results_report_id_index ON public.reports_probe_results USING btree (report_id) WHERE (deleted_at IS NULL);


--
-- Name: reports_probe_test_information_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX reports_probe_test_information_ident_index ON public.reports_probe_test_information USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: reports_probe_test_information_report_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_probe_test_information_report_id_index ON public.reports_probe_test_information USING btree (report_id) WHERE (deleted_at IS NULL);


--
-- Name: reports_protein_variants_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX reports_protein_variants_ident_index ON public.reports_protein_variants USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: reports_protein_variants_report_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_protein_variants_report_id_index ON public.reports_protein_variants USING btree (report_id) WHERE (deleted_at IS NULL);


--
-- Name: reports_signatures_report_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_signatures_report_id_index ON public.reports_signatures USING btree (report_id) WHERE (deleted_at IS NULL);


--
-- Name: reports_small_mutations_report_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_small_mutations_report_id_index ON public.reports_small_mutations USING btree (report_id) WHERE (deleted_at IS NULL);


--
-- Name: reports_structural_variants_report_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_structural_variants_report_id_index ON public.reports_structural_variants USING btree (report_id) WHERE (deleted_at IS NULL);


--
-- Name: reports_summary_analyst_comments_report_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_summary_analyst_comments_report_id_index ON public.reports_summary_analyst_comments USING btree (report_id) WHERE (deleted_at IS NULL);


--
-- Name: reports_summary_genomic_alterations_identified_report_id_gene_v; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX reports_summary_genomic_alterations_identified_report_id_gene_v ON public.reports_summary_genomic_alterations_identified USING btree (report_id, "geneVariant", germline) WHERE (deleted_at IS NULL);


--
-- Name: reports_summary_genomic_alterations_identified_report_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_summary_genomic_alterations_identified_report_id_index ON public.reports_summary_genomic_alterations_identified USING btree (report_id) WHERE (deleted_at IS NULL);


--
-- Name: reports_summary_microbial_report_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_summary_microbial_report_id_index ON public.reports_summary_microbial USING btree (report_id) WHERE (deleted_at IS NULL);


--
-- Name: reports_summary_pathway_analysis_report_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_summary_pathway_analysis_report_id_index ON public.reports_summary_pathway_analysis USING btree (report_id) WHERE (deleted_at IS NULL);


--
-- Name: reports_summary_variant_counts_report_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_summary_variant_counts_report_id_index ON public.reports_summary_variant_counts USING btree (report_id) WHERE (deleted_at IS NULL);


--
-- Name: reports_therapeutic_targets_report_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_therapeutic_targets_report_id_index ON public.reports_therapeutic_targets USING btree (report_id) WHERE (deleted_at IS NULL);


--
-- Name: reports_tmbur_mutation_burden_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX reports_tmbur_mutation_burden_ident_index ON public.reports_tmbur_mutation_burden USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: reports_tmbur_mutation_burden_tmbur_report_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_tmbur_mutation_burden_tmbur_report_id_index ON public.reports_tmbur_mutation_burden USING btree (report_id) WHERE (deleted_at IS NULL);


--
-- Name: reports_users_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX reports_users_ident_index ON public.reports_users USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: reports_users_report_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_users_report_id_index ON public.reports_users USING btree (report_id) WHERE (deleted_at IS NULL);


--
-- Name: somatic_mutations_mutation_signature_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX somatic_mutations_mutation_signature_ident_index ON public.reports_mutation_signature USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: somatic_mutations_small_mutations_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX somatic_mutations_small_mutations_ident_index ON public.reports_small_mutations USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: structural_variation_sv_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX structural_variation_sv_ident_index ON public.reports_structural_variants USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: summary_analyst_comments_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX summary_analyst_comments_ident_index ON public.reports_summary_analyst_comments USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: summary_genomic_alterations_identified_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX summary_genomic_alterations_identified_ident_index ON public.reports_summary_genomic_alterations_identified USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: summary_microbial_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX summary_microbial_ident_index ON public.reports_summary_microbial USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: summary_mutation_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX summary_mutation_ident_index ON public.reports_mutation_burden USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: summary_pathway_analysis_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX summary_pathway_analysis_ident_index ON public.reports_summary_pathway_analysis USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: summary_probe_target_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX summary_probe_target_ident_index ON public.reports_probe_results USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: summary_variant_counts_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX summary_variant_counts_ident_index ON public.reports_summary_variant_counts USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: templates_appendix_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX templates_appendix_ident_index ON public.templates_appendix USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: templates_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX templates_ident_index ON public.templates USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: templates_name_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX templates_name_index ON public.templates USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: therapeutic_targets_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX therapeutic_targets_ident_index ON public.reports_therapeutic_targets USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: user_groups_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_groups_ident_index ON public.user_groups USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: user_metadata_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_metadata_ident_index ON public.user_metadata USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: user_metadata_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_metadata_user_id_index ON public.user_metadata USING btree (user_id) WHERE (deleted_at IS NULL);


--
-- Name: users_ident_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_ident_index ON public.users USING btree (ident) WHERE (deleted_at IS NULL);


--
-- Name: users_username_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_username_index ON public.users USING btree (username) WHERE (deleted_at IS NULL);


--
-- Name: reports_kb_matches FK_alterationsdga.pog_analysis_report; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_kb_matches
    ADD CONSTRAINT "FK_alterationsdga.pog_analysis_report" FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- Name: reports_summary_pathway_analysis FK_analysispathway.pog_analysis_report; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_summary_pathway_analysis
    ADD CONSTRAINT "FK_analysispathway.pog_analysis_report" FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- Name: reports_copy_variants FK_cnvanalysis.pog_analysis_report; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_copy_variants
    ADD CONSTRAINT "FK_cnvanalysis.pog_analysis_report" FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- Name: reports_summary_analyst_comments FK_commentsanalyst.pog_analysis_report; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_summary_analyst_comments
    ADD CONSTRAINT "FK_commentsanalyst.pog_analysis_report" FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- Name: reports_summary_variant_counts FK_countsvariant.pog_analysis_report; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_summary_variant_counts
    ADD CONSTRAINT "FK_countsvariant.pog_analysis_report" FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- Name: reports_image_data FK_dataimage.pog_analysis_report; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_image_data
    ADD CONSTRAINT "FK_dataimage.pog_analysis_report" FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- Name: reports_summary_genomic_alterations_identified FK_identifiedalterations.pog_analysis_report; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_summary_genomic_alterations_identified
    ADD CONSTRAINT "FK_identifiedalterations.pog_analysis_report" FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- Name: reports_small_mutations FK_mutationssmall.pog_analysis_report; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_small_mutations
    ADD CONSTRAINT "FK_mutationssmall.pog_analysis_report" FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- Name: reports_expression_variants FK_outlierexpression.pog_analysis_report; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_expression_variants
    ADD CONSTRAINT "FK_outlierexpression.pog_analysis_report" FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- Name: reports_summary_pathway_analysis FK_pog_analysis_report; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_summary_pathway_analysis
    ADD CONSTRAINT "FK_pog_analysis_report" FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- Name: reports_therapeutic_targets FK_pog_analysis_report; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_therapeutic_targets
    ADD CONSTRAINT "FK_pog_analysis_report" FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- Name: reports_summary_analyst_comments FK_pog_analysis_report; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_summary_analyst_comments
    ADD CONSTRAINT "FK_pog_analysis_report" FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- Name: reports_mutation_signature FK_signaturemutation.pog_analysis_report; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_mutation_signature
    ADD CONSTRAINT "FK_signaturemutation.pog_analysis_report" FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- Name: reports_structural_variants FK_svvariation.pog_analysis_report; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_structural_variants
    ADD CONSTRAINT "FK_svvariation.pog_analysis_report" FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- Name: reports_probe_results FK_targetprobe.pog_analysis_report; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_probe_results
    ADD CONSTRAINT "FK_targetprobe.pog_analysis_report" FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- Name: reports_therapeutic_targets FK_targetstherapeutic.pog_analysis_report; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_therapeutic_targets
    ADD CONSTRAINT "FK_targetstherapeutic.pog_analysis_report" FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- Name: reports_summary_analyst_comments FKpog_analysis_reports_summary_analyst_comments.pog_analysis_re; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_summary_analyst_comments
    ADD CONSTRAINT "FKpog_analysis_reports_summary_analyst_comments.pog_analysis_re" FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- Name: reports_summary_pathway_analysis FKpog_analysis_reports_summary_pathway_analysis.pog_analysis_re; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_summary_pathway_analysis
    ADD CONSTRAINT "FKpog_analysis_reports_summary_pathway_analysis.pog_analysis_re" FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- Name: reports_therapeutic_targets FKpog_analysis_reports_therapeutic_targets.pog_analysis_report; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_therapeutic_targets
    ADD CONSTRAINT "FKpog_analysis_reports_therapeutic_targets.pog_analysis_report" FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- Name: reports_users POGUsers_addedBy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_users
    ADD CONSTRAINT "POGUsers_addedBy_id_fkey" FOREIGN KEY ("addedBy_id") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: reports_users POGUsers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_users
    ADD CONSTRAINT "POGUsers_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_users fkey_report_id.pog_analysis_reports_users; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_users
    ADD CONSTRAINT "fkey_report_id.pog_analysis_reports_users" FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- Name: germline_report_users germline_report_users_added_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.germline_report_users
    ADD CONSTRAINT germline_report_users_added_by_id_fkey FOREIGN KEY (added_by_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: germline_report_users germline_report_users_germline_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.germline_report_users
    ADD CONSTRAINT germline_report_users_germline_report_id_fkey FOREIGN KEY (germline_report_id) REFERENCES public.germline_small_mutations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: germline_report_users germline_report_users_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.germline_report_users
    ADD CONSTRAINT germline_report_users_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: germline_report_users germline_report_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.germline_report_users
    ADD CONSTRAINT germline_report_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: germline_reports_to_projects germline_reports_to_projects_germline_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.germline_reports_to_projects
    ADD CONSTRAINT germline_reports_to_projects_germline_report_id_fkey FOREIGN KEY (germline_report_id) REFERENCES public.germline_small_mutations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: germline_reports_to_projects germline_reports_to_projects_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.germline_reports_to_projects
    ADD CONSTRAINT germline_reports_to_projects_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: germline_small_mutations_review germline_small_mutations_review_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.germline_small_mutations_review
    ADD CONSTRAINT germline_small_mutations_review_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: germline_small_mutations germline_small_mutations_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.germline_small_mutations
    ADD CONSTRAINT germline_small_mutations_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: germline_small_mutations_variant germline_small_mutations_variant_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.germline_small_mutations_variant
    ADD CONSTRAINT germline_small_mutations_variant_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: images images_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.images
    ADD CONSTRAINT images_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: notifications notifications_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: notifications notifications_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: notifications notifications_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: notifications notifications_user_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_group_id_fkey FOREIGN KEY (user_group_id) REFERENCES public.user_groups(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: germline_small_mutations pog_analysis_germline_small_mutations_biofx_assigned_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.germline_small_mutations
    ADD CONSTRAINT pog_analysis_germline_small_mutations_biofx_assigned_id_fkey FOREIGN KEY (biofx_assigned_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: germline_small_mutations_review pog_analysis_germline_small_mutations_r_germline_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.germline_small_mutations_review
    ADD CONSTRAINT pog_analysis_germline_small_mutations_r_germline_report_id_fkey FOREIGN KEY (germline_report_id) REFERENCES public.germline_small_mutations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: germline_small_mutations_review pog_analysis_germline_small_mutations_review_reviewedBy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.germline_small_mutations_review
    ADD CONSTRAINT "pog_analysis_germline_small_mutations_review_reviewedBy_id_fkey" FOREIGN KEY (reviewer_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: germline_small_mutations_variant pog_analysis_germline_small_mutations_v_germline_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.germline_small_mutations_variant
    ADD CONSTRAINT pog_analysis_germline_small_mutations_v_germline_report_id_fkey FOREIGN KEY (germline_report_id) REFERENCES public.germline_small_mutations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports pog_analysis_reports_createdBy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT "pog_analysis_reports_createdBy_id_fkey" FOREIGN KEY ("createdBy_id") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: reports_mavis_summary pog_analysis_reports_mavis_summary_pog_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_mavis_summary
    ADD CONSTRAINT pog_analysis_reports_mavis_summary_pog_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- Name: reports_presentation_discussion pog_analysis_reports_presentation_discussion_pog_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_presentation_discussion
    ADD CONSTRAINT pog_analysis_reports_presentation_discussion_pog_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_presentation_discussion pog_analysis_reports_presentation_discussion_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_presentation_discussion
    ADD CONSTRAINT pog_analysis_reports_presentation_discussion_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: reports_presentation_slides pog_analysis_reports_presentation_slides_pog_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_presentation_slides
    ADD CONSTRAINT pog_analysis_reports_presentation_slides_pog_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_presentation_slides pog_analysis_reports_presentation_slides_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_presentation_slides
    ADD CONSTRAINT pog_analysis_reports_presentation_slides_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: reports_signatures pog_analysis_reports_probe_signature_pog_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_signatures
    ADD CONSTRAINT pog_analysis_reports_probe_signature_pog_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_probe_test_information pog_analysis_reports_probe_test_information_pog_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_probe_test_information
    ADD CONSTRAINT pog_analysis_reports_probe_test_information_pog_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_summary_microbial pog_analysis_reports_summary_microbial_pog_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_summary_microbial
    ADD CONSTRAINT pog_analysis_reports_summary_microbial_pog_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_mutation_burden pog_analysis_reports_summary_mutation_pog_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_mutation_burden
    ADD CONSTRAINT pog_analysis_reports_summary_mutation_pog_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_patient_information pog_report_id_foreign_key_constraint; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_patient_information
    ADD CONSTRAINT pog_report_id_foreign_key_constraint FOREIGN KEY (report_id) REFERENCES public.reports(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: projects projects_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: report_projects report_projects_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_projects
    ADD CONSTRAINT report_projects_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: report_projects report_projects_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_projects
    ADD CONSTRAINT report_projects_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_comparators reports_comparators_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_comparators
    ADD CONSTRAINT reports_comparators_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_comparators reports_comparators_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_comparators
    ADD CONSTRAINT reports_comparators_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_copy_variants reports_copy_number_analysis_cnv_gene_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_copy_variants
    ADD CONSTRAINT reports_copy_number_analysis_cnv_gene_id_fkey FOREIGN KEY (gene_id) REFERENCES public.reports_genes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_copy_variants reports_copy_variants_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_copy_variants
    ADD CONSTRAINT reports_copy_variants_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_expression_variants reports_expression_outlier_gene_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_expression_variants
    ADD CONSTRAINT reports_expression_outlier_gene_id_fkey FOREIGN KEY (gene_id) REFERENCES public.reports_genes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_expression_variants reports_expression_variants_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_expression_variants
    ADD CONSTRAINT reports_expression_variants_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_genes reports_genes_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_genes
    ADD CONSTRAINT reports_genes_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_genes reports_genes_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_genes
    ADD CONSTRAINT reports_genes_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_hla_types reports_hla_types_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_hla_types
    ADD CONSTRAINT reports_hla_types_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_hla_types reports_hla_types_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_hla_types
    ADD CONSTRAINT reports_hla_types_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_image_data reports_image_data_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_image_data
    ADD CONSTRAINT reports_image_data_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_immune_cell_types reports_immune_cell_types_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_immune_cell_types
    ADD CONSTRAINT reports_immune_cell_types_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_immune_cell_types reports_immune_cell_types_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_immune_cell_types
    ADD CONSTRAINT reports_immune_cell_types_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_kb_matches reports_kb_matches_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_kb_matches
    ADD CONSTRAINT reports_kb_matches_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_mavis_summary reports_mavis_summary_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_mavis_summary
    ADD CONSTRAINT reports_mavis_summary_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_msi reports_msi_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_msi
    ADD CONSTRAINT reports_msi_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_msi reports_msi_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_msi
    ADD CONSTRAINT reports_msi_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_mutation_burden reports_mutation_burden_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_mutation_burden
    ADD CONSTRAINT reports_mutation_burden_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_mutation_signature reports_mutation_signature_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_mutation_signature
    ADD CONSTRAINT reports_mutation_signature_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_pairwise_expression_correlation reports_pairwise_expression_correlation_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_pairwise_expression_correlation
    ADD CONSTRAINT reports_pairwise_expression_correlation_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_pairwise_expression_correlation reports_pairwise_expression_correlation_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_pairwise_expression_correlation
    ADD CONSTRAINT reports_pairwise_expression_correlation_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_patient_information reports_patient_information_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_patient_information
    ADD CONSTRAINT reports_patient_information_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_presentation_discussion reports_presentation_discussion_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_presentation_discussion
    ADD CONSTRAINT reports_presentation_discussion_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_presentation_slides reports_presentation_slides_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_presentation_slides
    ADD CONSTRAINT reports_presentation_slides_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_probe_results reports_probe_results_gene_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_probe_results
    ADD CONSTRAINT reports_probe_results_gene_id_fkey FOREIGN KEY (gene_id) REFERENCES public.reports_genes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_probe_results reports_probe_results_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_probe_results
    ADD CONSTRAINT reports_probe_results_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_probe_test_information reports_probe_test_information_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_probe_test_information
    ADD CONSTRAINT reports_probe_test_information_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_protein_variants reports_protein_variants_gene_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_protein_variants
    ADD CONSTRAINT reports_protein_variants_gene_id_fkey FOREIGN KEY (gene_id) REFERENCES public.reports_genes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_protein_variants reports_protein_variants_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_protein_variants
    ADD CONSTRAINT reports_protein_variants_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_protein_variants reports_protein_variants_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_protein_variants
    ADD CONSTRAINT reports_protein_variants_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_signatures reports_signatures_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_signatures
    ADD CONSTRAINT reports_signatures_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: reports_signatures reports_signatures_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_signatures
    ADD CONSTRAINT reports_signatures_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: reports_signatures reports_signatures_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_signatures
    ADD CONSTRAINT reports_signatures_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_small_mutations reports_small_mutations_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_small_mutations
    ADD CONSTRAINT reports_small_mutations_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_small_mutations reports_somatic_mutations_small_mutations_gene_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_small_mutations
    ADD CONSTRAINT reports_somatic_mutations_small_mutations_gene_id_fkey FOREIGN KEY (gene_id) REFERENCES public.reports_genes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_structural_variants reports_structural_variants_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_structural_variants
    ADD CONSTRAINT reports_structural_variants_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_structural_variants reports_structural_variation_sv_gene1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_structural_variants
    ADD CONSTRAINT reports_structural_variation_sv_gene1_id_fkey FOREIGN KEY (gene1_id) REFERENCES public.reports_genes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_structural_variants reports_structural_variation_sv_gene2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_structural_variants
    ADD CONSTRAINT reports_structural_variation_sv_gene2_id_fkey FOREIGN KEY (gene2_id) REFERENCES public.reports_genes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_summary_analyst_comments reports_summary_analyst_comments_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_summary_analyst_comments
    ADD CONSTRAINT reports_summary_analyst_comments_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_summary_genomic_alterations_identified reports_summary_genomic_alterations_identified_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_summary_genomic_alterations_identified
    ADD CONSTRAINT reports_summary_genomic_alterations_identified_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_summary_microbial reports_summary_microbial_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_summary_microbial
    ADD CONSTRAINT reports_summary_microbial_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_summary_pathway_analysis reports_summary_pathway_analysis_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_summary_pathway_analysis
    ADD CONSTRAINT reports_summary_pathway_analysis_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_summary_variant_counts reports_summary_variant_counts_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_summary_variant_counts
    ADD CONSTRAINT reports_summary_variant_counts_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports reports_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: reports_therapeutic_targets reports_therapeutic_targets_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_therapeutic_targets
    ADD CONSTRAINT reports_therapeutic_targets_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_tmbur_mutation_burden reports_tmbur_mutation_burden_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_tmbur_mutation_burden
    ADD CONSTRAINT reports_tmbur_mutation_burden_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_tmbur_mutation_burden reports_tmbur_mutation_burden_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_tmbur_mutation_burden
    ADD CONSTRAINT reports_tmbur_mutation_burden_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: reports reports_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports_users reports_users_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_users
    ADD CONSTRAINT reports_users_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: templates_appendix templates_appendix_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates_appendix
    ADD CONSTRAINT templates_appendix_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: templates_appendix templates_appendix_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates_appendix
    ADD CONSTRAINT templates_appendix_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: templates_appendix templates_appendix_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates_appendix
    ADD CONSTRAINT templates_appendix_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: templates templates_header_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_header_id_fkey FOREIGN KEY (header_id) REFERENCES public.images(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: templates templates_logo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_logo_id_fkey FOREIGN KEY (logo_id) REFERENCES public.images(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: templates templates_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_group_members userGroupMembers_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_group_members
    ADD CONSTRAINT "userGroupMembers_group_id_fkey" FOREIGN KEY (group_id) REFERENCES public.user_groups(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_group_members userGroupMembers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_group_members
    ADD CONSTRAINT "userGroupMembers_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_groups userGroups_iwner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT "userGroups_iwner_id_fkey" FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: user_groups user_groups_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT user_groups_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_metadata user_metadata_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_metadata
    ADD CONSTRAINT user_metadata_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_metadata user_metadata_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_metadata
    ADD CONSTRAINT user_metadata_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_projects user_projects_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_projects
    ADD CONSTRAINT user_projects_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_projects user_projects_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_projects
    ADD CONSTRAINT user_projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: users users_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

