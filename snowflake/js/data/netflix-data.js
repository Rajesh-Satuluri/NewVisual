/* ============================================================
   Netflix Business Data — used across all modules for context
   Real-scale numbers grounded in Netflix's public disclosures.
   ============================================================ */

(function () {
  'use strict';

  const NetflixData = {

    /* ── Company Scale ───────────────────────────────────────── */
    scale: {
      subscribers:       238_000_000,
      countriesServed:   190,
      dailyWatchHours:   100_000_000,
      titlesInCatalog:   17_000,
      dailyWatchEvents:  1_400_000_000,
      dailyRecommendations: 80_000_000,
      employeeCount:     12_000,
      dataGeneratedDailyTB: 40,
      snowflakeComputeCreditsPerMonth: 2_500_000,
    },

    /* ── Snowflake Account Hierarchy ─────────────────────────── */
    hierarchy: {
      organization: 'Netflix-Global',
      accounts: [
        { name: 'PROD_US_EAST',   region: 'AWS us-east-1', purpose: 'Primary production' },
        { name: 'PROD_EU_WEST',   region: 'AWS eu-west-1', purpose: 'EU data residency (GDPR)' },
        { name: 'DEV_SANDBOX',    region: 'AWS us-east-1', purpose: 'Development & testing' },
        { name: 'DATA_SCIENCE',   region: 'AWS us-west-2', purpose: 'ML training workloads' },
        { name: 'MARKETING_READ', region: 'AWS us-east-1', purpose: 'BI & marketing analytics (Reader Account)' },
      ],
      databases: [
        { name: 'CONTENT_DB',       schemas: ['RAW', 'PROCESSED', 'ANALYTICS'],         purpose: 'Movies, series, trailers' },
        { name: 'ENGAGEMENT_DB',    schemas: ['EVENTS', 'SESSIONS', 'AGGREGATES'],       purpose: 'Watch events, clickstream' },
        { name: 'SUBSCRIBER_DB',    schemas: ['PROFILES', 'PAYMENTS', 'SUBSCRIPTIONS'],  purpose: 'User accounts, billing' },
        { name: 'RECOMMENDATIONS_DB',schemas: ['FEATURES', 'MODELS', 'SCORES'],          purpose: 'ML feature store' },
        { name: 'LOGGING_DB',       schemas: ['APP_LOGS', 'INFRA_LOGS', 'AUDIT'],        purpose: 'Application & infra logs' },
      ],
    },

    /* ── Virtual Warehouses ──────────────────────────────────── */
    warehouses: [
      {
        name: 'INGEST_WH',
        size: 'X-Large',
        clusterMin: 2, clusterMax: 10,
        autoSuspend: 60,
        purpose: 'Snowpipe & COPY INTO for watch events',
        team: 'Data Engineering',
        color: '#29b5e8',
      },
      {
        name: 'ANALYTICS_WH',
        size: 'Large',
        clusterMin: 1, clusterMax: 6,
        autoSuspend: 300,
        purpose: 'Business intelligence dashboards (Tableau, Looker)',
        team: 'Analytics / Finance',
        color: '#3fb950',
      },
      {
        name: 'ML_TRAINING_WH',
        size: 'X-Large (Snowpark)',
        clusterMin: 1, clusterMax: 4,
        autoSuspend: 120,
        purpose: 'Feature engineering & model training via Snowpark',
        team: 'Data Science / ML',
        color: '#a371f7',
      },
      {
        name: 'MARKETING_WH',
        size: 'Medium',
        clusterMin: 1, clusterMax: 3,
        autoSuspend: 600,
        purpose: 'Campaign analysis, A/B test results, ad attribution',
        team: 'Marketing',
        color: '#f97316',
      },
      {
        name: 'EXEC_WH',
        size: 'Small',
        clusterMin: 1, clusterMax: 1,
        autoSuspend: 60,
        purpose: 'Executive KPI dashboards (read-only, cost-controlled)',
        team: 'Leadership',
        color: '#e3b341',
      },
    ],

    /* ── Key Tables ──────────────────────────────────────────── */
    tables: {
      movies: {
        name: 'CONTENT_DB.PROCESSED.MOVIES',
        rowCount: 17_000,
        sizeGB: 12,
        columns: [
          { name: 'MOVIE_ID',      type: 'NUMBER',    nullable: false, description: 'Unique content ID' },
          { name: 'TITLE',         type: 'VARCHAR',   nullable: false, description: 'Display title' },
          { name: 'GENRE',         type: 'ARRAY',     nullable: true,  description: 'e.g. ["Drama","Thriller"]' },
          { name: 'RELEASE_YEAR',  type: 'NUMBER',    nullable: false, description: 'Original release year' },
          { name: 'LANGUAGE',      type: 'VARCHAR',   nullable: false, description: 'Primary language' },
          { name: 'MATURITY_RATING',type: 'VARCHAR',  nullable: true,  description: 'PG-13, R, TV-MA etc.' },
          { name: 'DURATION_MINS', type: 'NUMBER',    nullable: true,  description: 'Runtime in minutes' },
          { name: 'COUNTRY_CODE',  type: 'VARCHAR',   nullable: true,  description: 'Country of origin' },
          { name: 'AVAILABLE_REGIONS',type:'ARRAY',   nullable: true,  description: 'List of ISO region codes' },
          { name: 'CREATED_AT',    type: 'TIMESTAMP', nullable: false, description: 'Record creation time' },
          { name: 'UPDATED_AT',    type: 'TIMESTAMP', nullable: false, description: 'Last update time' },
        ],
        clustering: ['GENRE[0]', 'RELEASE_YEAR'],
        partitionCount: 24,
      },

      watchEvents: {
        name: 'ENGAGEMENT_DB.EVENTS.WATCH_EVENTS',
        rowCount: 500_000_000_000,
        sizeGB: 180_000,
        columns: [
          { name: 'EVENT_ID',        type: 'VARCHAR',   nullable: false, description: 'UUID per event' },
          { name: 'USER_ID',         type: 'NUMBER',    nullable: false, description: 'Subscriber ID' },
          { name: 'MOVIE_ID',        type: 'NUMBER',    nullable: false, description: 'Content ID (FK)' },
          { name: 'DEVICE_TYPE',     type: 'VARCHAR',   nullable: true,  description: 'smart_tv, mobile, web' },
          { name: 'WATCH_START',     type: 'TIMESTAMP', nullable: false, description: 'UTC start time' },
          { name: 'WATCH_END',       type: 'TIMESTAMP', nullable: true,  description: 'UTC end time (null = ongoing)' },
          { name: 'DURATION_WATCHED',type: 'NUMBER',    nullable: true,  description: 'Seconds watched' },
          { name: 'COMPLETION_PCT',  type: 'FLOAT',     nullable: true,  description: '0.0 – 1.0' },
          { name: 'COUNTRY_CODE',    type: 'VARCHAR',   nullable: true,  description: 'ISO 3166-1 alpha-2' },
          { name: 'REGION',          type: 'VARCHAR',   nullable: true,  description: 'AWS region' },
          { name: 'SUBTITLE_LANG',   type: 'VARCHAR',   nullable: true,  description: 'Selected subtitle' },
          { name: 'BITRATE_KBPS',    type: 'NUMBER',    nullable: true,  description: 'Average streaming bitrate' },
        ],
        clustering: ['WATCH_START::DATE', 'COUNTRY_CODE'],
        partitionCount: 182500,
      },

      subscribers: {
        name: 'SUBSCRIBER_DB.PROFILES.SUBSCRIBERS',
        rowCount: 238_000_000,
        sizeGB: 85,
        columns: [
          { name: 'USER_ID',         type: 'NUMBER',    nullable: false, description: 'Global user ID' },
          { name: 'EMAIL',           type: 'VARCHAR',   nullable: false, description: '*** masked by policy ***' },
          { name: 'PLAN_TYPE',       type: 'VARCHAR',   nullable: false, description: 'standard, premium, basic' },
          { name: 'COUNTRY_CODE',    type: 'VARCHAR',   nullable: false, description: 'Billing country' },
          { name: 'SIGNUP_DATE',     type: 'DATE',      nullable: false, description: 'Account creation date' },
          { name: 'LAST_ACTIVE',     type: 'TIMESTAMP', nullable: true,  description: 'Last login or stream' },
          { name: 'PREFERRED_LANG',  type: 'VARCHAR',   nullable: true,  description: 'UI language' },
          { name: 'PROFILE_COUNT',   type: 'NUMBER',    nullable: false, description: 'Sub-profiles (max 5)' },
          { name: 'IS_TRIAL',        type: 'BOOLEAN',   nullable: false, description: 'Active free trial?' },
        ],
        clustering: ['COUNTRY_CODE', 'PLAN_TYPE'],
        partitionCount: 120,
      },

      recommendations: {
        name: 'RECOMMENDATIONS_DB.SCORES.RECO_SCORES',
        rowCount: 12_000_000_000,
        sizeGB: 22_000,
        columns: [
          { name: 'USER_ID',       type: 'NUMBER',    nullable: false },
          { name: 'MOVIE_ID',      type: 'NUMBER',    nullable: false },
          { name: 'SCORE',         type: 'FLOAT',     nullable: false },
          { name: 'MODEL_VERSION', type: 'VARCHAR',   nullable: false },
          { name: 'COMPUTED_AT',   type: 'TIMESTAMP', nullable: false },
          { name: 'CONTEXT',       type: 'VARCHAR',   nullable: true  },
        ],
        clustering: ['USER_ID'],
        partitionCount: 4800,
      },
    },

    /* ── Sample Query Examples ───────────────────────────────── */
    queries: {
      topTitles: `-- Top 10 most-watched titles this week (uses result cache on repeat)
SELECT
    m.TITLE,
    m.GENRE[0]::STRING          AS PRIMARY_GENRE,
    COUNT(*)                     AS WATCH_COUNT,
    ROUND(AVG(w.COMPLETION_PCT) * 100, 1) AS AVG_COMPLETION_PCT
FROM ENGAGEMENT_DB.EVENTS.WATCH_EVENTS w
JOIN CONTENT_DB.PROCESSED.MOVIES      m ON w.MOVIE_ID = m.MOVIE_ID
WHERE w.WATCH_START >= DATEADD('day', -7, CURRENT_DATE)
  AND w.DURATION_WATCHED >= 120   -- at least 2 minutes
GROUP BY 1, 2
ORDER BY WATCH_COUNT DESC
LIMIT 10;`,

      timeTravel: `-- Recover viewing history accidentally deleted 30 minutes ago
CREATE OR REPLACE TABLE ENGAGEMENT_DB.EVENTS.WATCH_EVENTS
  CLONE ENGAGEMENT_DB.EVENTS.WATCH_EVENTS
  BEFORE (STATEMENT => '<your-delete-statement-id>');

-- Or restore from 30-minute offset
SELECT * FROM ENGAGEMENT_DB.EVENTS.WATCH_EVENTS
  AT (OFFSET => -30 * 60);`,

      snowpipe: `-- Snowpipe auto-ingest: new watch logs from S3 every second
CREATE OR REPLACE PIPE ENGAGEMENT_DB.EVENTS.WATCH_EVENTS_PIPE
  AUTO_INGEST = TRUE
AS
  COPY INTO ENGAGEMENT_DB.EVENTS.WATCH_EVENTS
  FROM @ENGAGEMENT_DB.EVENTS.WATCH_EVENTS_STAGE
  FILE_FORMAT = (TYPE = 'PARQUET')
  MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE;`,

      dynamicTable: `-- Dynamic Table: pre-computed daily recommendations
-- Refreshes every 15 minutes; downstream dashboards never hit raw tables
CREATE OR REPLACE DYNAMIC TABLE RECOMMENDATIONS_DB.SCORES.DAILY_TOP_RECO
  TARGET_LAG = '15 minutes'
  WAREHOUSE  = ML_TRAINING_WH
AS
  SELECT
      r.USER_ID,
      r.MOVIE_ID,
      m.TITLE,
      m.GENRE[0]::STRING AS PRIMARY_GENRE,
      r.SCORE,
      r.COMPUTED_AT
  FROM RECOMMENDATIONS_DB.SCORES.RECO_SCORES r
  JOIN CONTENT_DB.PROCESSED.MOVIES m ON r.MOVIE_ID = m.MOVIE_ID
  WHERE r.SCORE > 0.75
    AND r.COMPUTED_AT >= DATEADD('hour', -24, CURRENT_TIMESTAMP)
  QUALIFY ROW_NUMBER() OVER (PARTITION BY r.USER_ID ORDER BY r.SCORE DESC) <= 20;`,

      sharing: `-- Data Share: Netflix → Advertising Partners
-- Partners query Netflix engagement data without any data movement
CREATE SHARE NETFLIX_AD_ANALYTICS_SHARE;

GRANT USAGE ON DATABASE ENGAGEMENT_DB TO SHARE NETFLIX_AD_ANALYTICS_SHARE;
GRANT SELECT ON VIEW ENGAGEMENT_DB.ANALYTICS.AD_SUPPORTED_VIEWING
  TO SHARE NETFLIX_AD_ANALYTICS_SHARE;

-- Ad partner reads data as if it's local — zero data copy
ALTER SHARE NETFLIX_AD_ANALYTICS_SHARE ADD ACCOUNTS = PARTNER_SNOWFLAKE_ACCOUNT;`,
    },

    /* ── Micro-partition sample for Movies table ─────────────── */
    microPartitions: [
      { id: 1,  rows: 710,  sizeKB: 312, minYear: 1940, maxYear: 1965, genres: ['Drama','Classic'],       pruned: false },
      { id: 2,  rows: 842,  sizeKB: 398, minYear: 1965, maxYear: 1979, genres: ['Drama','Crime'],         pruned: false },
      { id: 3,  rows: 931,  sizeKB: 445, minYear: 1979, maxYear: 1989, genres: ['Action','Drama'],        pruned: false },
      { id: 4,  rows: 1024, sizeKB: 512, minYear: 1989, maxYear: 1995, genres: ['Comedy','Romance'],      pruned: true  },
      { id: 5,  rows: 1156, sizeKB: 556, minYear: 1995, maxYear: 2000, genres: ['Thriller','Action'],     pruned: false },
      { id: 6,  rows: 1289, sizeKB: 612, minYear: 2000, maxYear: 2005, genres: ['Animation','Comedy'],    pruned: true  },
      { id: 7,  rows: 1401, sizeKB: 689, minYear: 2005, maxYear: 2009, genres: ['Drama','SciFi'],         pruned: false },
      { id: 8,  rows: 1512, sizeKB: 734, minYear: 2009, maxYear: 2013, genres: ['Action','Adventure'],    pruned: false },
      { id: 9,  rows: 1623, sizeKB: 801, minYear: 2013, maxYear: 2016, genres: ['Documentary','Drama'],   pruned: true  },
      { id: 10, rows: 1734, sizeKB: 856, minYear: 2016, maxYear: 2018, genres: ['Horror','Thriller'],     pruned: false },
      { id: 11, rows: 1845, sizeKB: 912, minYear: 2018, maxYear: 2020, genres: ['Drama','Romance'],       pruned: false },
      { id: 12, rows: 1901, sizeKB: 978, minYear: 2020, maxYear: 2023, genres: ['SciFi','Action'],        pruned: false },
    ],
  };

  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.NetflixData = NetflixData;
})();
