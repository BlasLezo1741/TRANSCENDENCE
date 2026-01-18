"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.competitormetric = exports.competitor = exports.playerFriend = exports.organization = exports.playerOrganization = exports.matchmetric = exports.match = exports.metric = exports.matchMode = exports.status = exports.pRole = exports.country = exports.player = exports.pLanguage = exports.metricCategory = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
// Helper para el tipo bytea de Postgres
var bytea = (0, pg_core_1.customType)({
    dataType: function () { return 'bytea'; },
});
exports.metricCategory = (0, pg_core_1.pgTable)("metric_category", {
    metricCatePk: (0, pg_core_1.smallint)("metric_cate_pk").primaryKey().generatedAlwaysAsIdentity({ name: "metric_category_metric_cate_pk_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 32767, cache: 1 }),
    metricCateI18NName: (0, pg_core_1.jsonb)("metric_cate_i18n_name").notNull(),
});
exports.pLanguage = (0, pg_core_1.pgTable)("p_language", {
    langPk: (0, pg_core_1.char)("lang_pk", { length: 2 }).primaryKey().notNull(),
    langName: (0, pg_core_1.varchar)("lang_name", { length: 255 }),
    langStatus: (0, pg_core_1.boolean)("lang_status"),
});
exports.player = (0, pg_core_1.pgTable)("player", {
    pPk: (0, pg_core_1.integer)("p_pk").primaryKey().generatedAlwaysAsIdentity({ name: "player_p_pk_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
    pNick: (0, pg_core_1.varchar)("p_nick", { length: 20 }).notNull(),
    // TODO: failed to parse database type 'citext'
    pMail: (0, pg_core_1.text)("p_mail").notNull(),
    pPass: (0, pg_core_1.text)("p_pass").notNull(),
    // TODO: failed to parse database type 'bytea'
    pTotpSecret: bytea("p_totp_secret"),
    pTotpEnable: (0, pg_core_1.boolean)("p_totp_enable").default(false),
    pTotpEnabledAt: (0, pg_core_1.timestamp)("p_totp_enabled_at", { mode: 'string' }),
    pTotpBackupCodes: (0, pg_core_1.text)("p_totp_backup_codes").array(),
    pReg: (0, pg_core_1.timestamp)("p_reg", { mode: 'string' }),
    pBir: (0, pg_core_1.date)("p_bir"),
    pLang: (0, pg_core_1.char)("p_lang", { length: 2 }),
    pCountry: (0, pg_core_1.char)("p_country", { length: 2 }),
    pRole: (0, pg_core_1.smallint)("p_role"),
    pStatus: (0, pg_core_1.smallint)("p_status"),
}, function (table) { return [
    (0, pg_core_1.foreignKey)({
        columns: [table.pLang],
        foreignColumns: [exports.pLanguage.langPk],
        name: "player_p_lang_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.pCountry],
        foreignColumns: [exports.country.coun2Pk],
        name: "player_p_country_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.pRole],
        foreignColumns: [exports.pRole.rolePk],
        name: "player_p_role_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.pStatus],
        foreignColumns: [exports.status.statusPk],
        name: "player_p_status_fkey"
    }),
    (0, pg_core_1.unique)("player_p_nick_key").on(table.pNick),
    (0, pg_core_1.unique)("player_p_mail_key").on(table.pMail),
]; });
exports.country = (0, pg_core_1.pgTable)("country", {
    counName: (0, pg_core_1.char)("coun_name", { length: 52 }),
    coun2Pk: (0, pg_core_1.char)("coun2_pk", { length: 2 }).primaryKey().notNull(),
    coun3: (0, pg_core_1.char)({ length: 3 }),
    counCode: (0, pg_core_1.char)("coun_code", { length: 3 }),
    counIsoCode: (0, pg_core_1.char)("coun_iso_code", { length: 13 }),
    counRegion: (0, pg_core_1.char)("coun_region", { length: 8 }),
    counRegionSub: (0, pg_core_1.char)("coun_region_sub", { length: 31 }),
    counRegionInt: (0, pg_core_1.char)("coun_region_int", { length: 15 }),
    counRegionCode: (0, pg_core_1.char)("coun_region_code", { length: 3 }),
    counRegionSubCode: (0, pg_core_1.char)("coun_region_sub_code", { length: 3 }),
    counRegionIntCode: (0, pg_core_1.char)("coun_region_int_code", { length: 3 }),
});
exports.pRole = (0, pg_core_1.pgTable)("p_role", {
    rolePk: (0, pg_core_1.smallint)("role_pk").primaryKey().generatedAlwaysAsIdentity({ name: "p_role_role_pk_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 32767, cache: 1 }),
    roleI18NName: (0, pg_core_1.jsonb)("role_i18n_name").notNull(),
});
exports.status = (0, pg_core_1.pgTable)("status", {
    statusPk: (0, pg_core_1.smallint)("status_pk").primaryKey().generatedAlwaysAsIdentity({ name: "status_status_pk_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 32767, cache: 1 }),
    statusI18NName: (0, pg_core_1.jsonb)("status_i18n_name").notNull(),
});
exports.matchMode = (0, pg_core_1.pgTable)("match_mode", {
    mmodPk: (0, pg_core_1.smallint)("mmod_pk").primaryKey().generatedAlwaysAsIdentity({ name: "match_mode_mmod_pk_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 32767, cache: 1 }),
    mmodName: (0, pg_core_1.varchar)("mmod_name", { length: 20 }),
});
exports.metric = (0, pg_core_1.pgTable)("metric", {
    metricPk: (0, pg_core_1.smallint)("metric_pk").primaryKey().generatedAlwaysAsIdentity({ name: "metric_metric_pk_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 32767, cache: 1 }),
    metricCatFk: (0, pg_core_1.smallint)("metric_cat_fk"),
    metricI18NName: (0, pg_core_1.jsonb)("metric_i18n_name").notNull(),
    metricI18NDescription: (0, pg_core_1.jsonb)("metric_i18n_description").notNull(),
}, function (table) { return [
    (0, pg_core_1.foreignKey)({
        columns: [table.metricCatFk],
        foreignColumns: [exports.metricCategory.metricCatePk],
        name: "metric_metric_cat_fk_fkey"
    }),
]; });
exports.match = (0, pg_core_1.pgTable)("match", {
    mPk: (0, pg_core_1.integer)("m_pk").primaryKey().generatedAlwaysAsIdentity({ name: "match_m_pk_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
    mDate: (0, pg_core_1.timestamp)("m_date", { mode: 'string' }),
    mDuration: (0, pg_core_1.interval)("m_duration"),
    mModeFk: (0, pg_core_1.smallint)("m_mode_fk"),
    mWinnerFk: (0, pg_core_1.integer)("m_winner_fk"),
}, function (table) { return [
    (0, pg_core_1.foreignKey)({
        columns: [table.mModeFk],
        foreignColumns: [exports.matchMode.mmodPk],
        name: "match_m_mode_fk_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.mWinnerFk],
        foreignColumns: [exports.player.pPk],
        name: "match_m_winner_fk_fkey"
    }),
]; });
exports.matchmetric = (0, pg_core_1.pgTable)("matchmetric", {
    mmPk: (0, pg_core_1.integer)("mm_pk").primaryKey().generatedAlwaysAsIdentity({ name: "matchmetric_mm_pk_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
    mmMatchFk: (0, pg_core_1.integer)("mm_match_fk"),
    mmCodeFk: (0, pg_core_1.smallint)("mm_code_fk"),
    mmValue: (0, pg_core_1.doublePrecision)("mm_value"),
}, function (table) { return [
    (0, pg_core_1.foreignKey)({
        columns: [table.mmMatchFk],
        foreignColumns: [exports.match.mPk],
        name: "matchmetric_mm_match_fk_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.mmCodeFk],
        foreignColumns: [exports.metric.metricPk],
        name: "matchmetric_mm_code_fk_fkey"
    }),
]; });
exports.playerOrganization = (0, pg_core_1.pgTable)("player_organization", {
    poPFk: (0, pg_core_1.integer)("po_p_fk"),
    poOrgFk: (0, pg_core_1.smallint)("po_org_fk"),
}, function (table) { return [
    (0, pg_core_1.foreignKey)({
        columns: [table.poPFk],
        foreignColumns: [exports.player.pPk],
        name: "player_organization_po_p_fk_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.poOrgFk],
        foreignColumns: [exports.organization.orgPk],
        name: "player_organization_po_org_fk_fkey"
    }),
]; });
exports.organization = (0, pg_core_1.pgTable)("organization", {
    orgPk: (0, pg_core_1.smallint)("org_pk").primaryKey().generatedAlwaysAsIdentity({ name: "organization_org_pk_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 32767, cache: 1 }),
    orgName: (0, pg_core_1.varchar)("org_name", { length: 255 }),
});
exports.playerFriend = (0, pg_core_1.pgTable)("player_friend", {
    friendPk: (0, pg_core_1.integer)("friend_pk").primaryKey().generatedAlwaysAsIdentity({ name: "player_friend_friend_pk_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
    f1: (0, pg_core_1.integer)("f_1"),
    f2: (0, pg_core_1.integer)("f_2"),
    fDate: (0, pg_core_1.timestamp)("f_date", { mode: 'string' }),
    fType: (0, pg_core_1.boolean)("f_type"),
}, function (table) { return [
    (0, pg_core_1.foreignKey)({
        columns: [table.f1],
        foreignColumns: [exports.player.pPk],
        name: "player_friend_f_1_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.f2],
        foreignColumns: [exports.player.pPk],
        name: "player_friend_f_2_fkey"
    }),
]; });
exports.competitor = (0, pg_core_1.pgTable)("competitor", {
    mcMatchFk: (0, pg_core_1.integer)("mc_match_fk").notNull(),
    mcPlayerFk: (0, pg_core_1.integer)("mc_player_fk").notNull(),
}, function (table) { return [
    (0, pg_core_1.foreignKey)({
        columns: [table.mcMatchFk],
        foreignColumns: [exports.match.mPk],
        name: "competitor_mc_match_fk_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.mcPlayerFk],
        foreignColumns: [exports.player.pPk],
        name: "competitor_mc_player_fk_fkey"
    }),
    (0, pg_core_1.primaryKey)({ columns: [table.mcPlayerFk, table.mcMatchFk], name: "competitor_pkey" }),
]; });
exports.competitormetric = (0, pg_core_1.pgTable)("competitormetric", {
    mcmMatchFk: (0, pg_core_1.integer)("mcm_match_fk").notNull(),
    mcmPlayerFk: (0, pg_core_1.integer)("mcm_player_fk").notNull(),
    mcmMetricFk: (0, pg_core_1.smallint)("mcm_metric_fk").notNull(),
    mcmValue: (0, pg_core_1.doublePrecision)("mcm_value"),
}, function (table) { return [
    (0, pg_core_1.foreignKey)({
        columns: [table.mcmMetricFk],
        foreignColumns: [exports.metric.metricPk],
        name: "competitormetric_mcm_metric_fk_fkey"
    }),
    (0, pg_core_1.foreignKey)({
        columns: [table.mcmMatchFk, table.mcmPlayerFk],
        foreignColumns: [exports.competitor.mcMatchFk, exports.competitor.mcPlayerFk],
        name: "fk_mcm_match_player"
    }),
    (0, pg_core_1.primaryKey)({ columns: [table.mcmPlayerFk, table.mcmMetricFk, table.mcmMatchFk], name: "competitormetric_pkey" }),
]; });
