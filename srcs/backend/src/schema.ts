import { pgTable, smallint, jsonb, foreignKey, char, varchar, boolean, integer, timestamp, date, doublePrecision, interval, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// --- 1. LOOKUP TABLES (Define these first so others can reference them) ---

export const metricCategory = pgTable("metric_category", {
	metricCatePk: smallint("metric_cate_pk").primaryKey().generatedAlwaysAsIdentity({ name: "metric_category_metric_cate_pk_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 32767, cache: 1 }),
	metricCateI18NName: jsonb("metric_cate_i18n_name").notNull(),
});

export const pLanguage = pgTable("p_language", {
	langPk: char("lang_pk", { length: 2 }).primaryKey().notNull(),
	langName: varchar("lang_name", { length: 255 }),
	langStatus: boolean("lang_status"),
});

export const country = pgTable("country", {
	counName: char("coun_name", { length: 52 }),
	coun2Pk: char("coun2_pk", { length: 2 }).primaryKey().notNull(),
	coun3: char({ length: 3 }),
	counCode: char("coun_code", { length: 3 }),
	counIsoCode: char("coun_iso_code", { length: 13 }),
	counRegion: char("coun_region", { length: 8 }),
	counRegionSub: char("coun_region_sub", { length: 31 }),
	counRegionInt: char("coun_region_int", { length: 15 }),
	counRegionCode: char("coun_region_code", { length: 3 }),
	counRegionSubCode: char("coun_region_sub_code", { length: 3 }),
	counRegionIntCode: char("coun_region_int_code", { length: 3 }),
});

export const pRole = pgTable("p_role", {
	rolePk: smallint("role_pk").primaryKey().generatedAlwaysAsIdentity({ name: "p_role_role_pk_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 32767, cache: 1 }),
	roleI18NName: jsonb("role_i18n_name").notNull(),
});

export const status = pgTable("status", {
	statusPk: smallint("status_pk").primaryKey().generatedAlwaysAsIdentity({ name: "status_status_pk_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 32767, cache: 1 }),
	statusI18NName: jsonb("status_i18n_name").notNull(),
});

export const matchMode = pgTable("match_mode", {
    mmodPk: smallint("mmod_pk").primaryKey().generatedAlwaysAsIdentity({ name: "match_mode_mmod_pk_seq", startWith: 1, increment: 1 }),
    mmodName: varchar("mmod_name", { length: 20 }),
});

export const organization = pgTable("organization", {
	orgPk: smallint("org_pk").primaryKey().generatedAlwaysAsIdentity({ name: "organization_org_pk_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 32767, cache: 1 }),
	orgName: varchar("org_name", { length: 255 }),
});

// --- 2. DEPENDENT TABLES (These reference the tables above) ---

export const metric = pgTable("metric", {
	metricPk: smallint("metric_pk").primaryKey().generatedAlwaysAsIdentity({ name: "metric_metric_pk_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 32767, cache: 1 }),
	metricCatFk: smallint("metric_cat_fk"),
	metricI18NName: jsonb("metric_i18n_name").notNull(),
	metricI18NDescription: jsonb("metric_i18n_description").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.metricCatFk],
			foreignColumns: [metricCategory.metricCatePk],
			name: "metric_metric_cat_fk_fkey"
		}),
]);
/*
export const player = pgTable("player", {
    pPk: integer("p_pk").primaryKey().generatedAlwaysAsIdentity({ name: "player_p_pk_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
    pNick: varchar("p_nick", { length: 255 }).unique().notNull(),
    pMail: varchar("p_mail", { length: 255 }).unique().notNull(),
    pPass: varchar("p_pass", { length: 255 }).notNull(),
    pReg: timestamp("p_reg", { mode: 'string' }).defaultNow(),
    pBir: date("p_bir"),
    pLang: char("p_lang", { length: 2 }),
    pCountry: char("p_country", { length: 2 }),
    pRole: smallint("p_role").default(1), 
    pStatus: smallint("p_status").default(1),
}, (table) => [
    foreignKey({
            columns: [table.pLang],
            foreignColumns: [pLanguage.langPk],
            name: "player_p_lang_fkey"
        }),
    foreignKey({
            columns: [table.pCountry],
            foreignColumns: [country.coun2Pk], // Now 'country' is defined above, this is safe
            name: "player_p_country_fkey"
        }),
    foreignKey({
            columns: [table.pRole],
            foreignColumns: [pRole.rolePk],    // Now 'pRole' is defined above, this is safe
            name: "player_p_role_fkey"
        }),
    foreignKey({
            columns: [table.pStatus],
            foreignColumns: [status.statusPk], // Now 'status' is defined above, this is safe
            name: "player_p_status_fkey"
        }),
]);
*/

export const player = pgTable("player", {
    pPk: integer("p_pk").primaryKey().generatedAlwaysAsIdentity({ name: "player_p_pk_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
    
    // CHANGE: Length set to 20 to match SQL
    pNick: varchar("p_nick", { length: 20 }).unique().notNull(),
    
    pMail: varchar("p_mail", { length: 255 }).unique().notNull(),
    pPass: varchar("p_pass", { length: 255 }).notNull(),
    pReg: timestamp("p_reg", { mode: 'string' }).defaultNow(),
    pBir: date("p_bir"),
    pLang: char("p_lang", { length: 2 }),
    pCountry: char("p_country", { length: 2 }),
    pRole: smallint("p_role").default(1), 
    pStatus: smallint("p_status").default(1),
}, (table) => [
    // ... keep your existing foreign keys ...
    foreignKey({
            columns: [table.pLang],
            foreignColumns: [pLanguage.langPk],
            name: "player_p_lang_fkey"
        }),
    foreignKey({
            columns: [table.pCountry],
            foreignColumns: [country.coun2Pk],
            name: "player_p_country_fkey"
        }),
    foreignKey({
            columns: [table.pRole],
            foreignColumns: [pRole.rolePk],
            name: "player_p_role_fkey"
        }),
    foreignKey({
            columns: [table.pStatus],
            foreignColumns: [status.statusPk],
            name: "player_p_status_fkey"
        }),
]);

// Alias for compatibility
export const users = player;

export const match = pgTable("match", {
    mPk: integer("m_pk").primaryKey().generatedAlwaysAsIdentity({ name: "match_m_pk_seq", startWith: 1, increment: 1 }),
    mDate: timestamp("m_date", { mode: 'string' }),
    mDuration: interval("m_duration"),
    mModeFk: smallint("m_mode_fk"), 
    mWinnerFk: integer("m_winner_fk"),
	// --- NUEVAS COLUMNAS ---
    mScoreP1: integer("m_score_p1").default(0),
    mScoreP2: integer("m_score_p2").default(0),
    mTotalHits: integer("m_total_hits").default(0),
}, (table) => [
    foreignKey({
            columns: [table.mWinnerFk],
            foreignColumns: [player.pPk],
            name: "match_m_winner_fk_fkey"
        }),
    foreignKey({
            columns: [table.mModeFk],
            foreignColumns: [matchMode.mmodPk],
            name: "match_m_mode_fk_fkey"
        }),
]);

// --- 3. DEEPLY NESTED TABLES (These reference tables from group 2) ---

export const matchmetric = pgTable("matchmetric", {
	mmPk: integer("mm_pk").primaryKey().generatedAlwaysAsIdentity({ name: "matchmetric_mm_pk_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	mmMatchFk: integer("mm_match_fk"),
	mmCodeFk: smallint("mm_code_fk"),
	mmValue: doublePrecision("mm_value"),
}, (table) => [
	foreignKey({
			columns: [table.mmMatchFk],
			foreignColumns: [match.mPk], // match is defined above
			name: "matchmetric_mm_match_fk_fkey"
		}),
	foreignKey({
			columns: [table.mmCodeFk],
			foreignColumns: [metric.metricPk],
			name: "matchmetric_mm_code_fk_fkey"
		}),
]);

export const playerOrganization = pgTable("player_organization", {
	poPFk: integer("po_p_fk"),
	poOrgFk: smallint("po_org_fk"),
}, (table) => [
	foreignKey({
			columns: [table.poPFk],
			foreignColumns: [player.pPk],
			name: "player_organization_po_p_fk_fkey"
		}),
	foreignKey({
			columns: [table.poOrgFk],
			foreignColumns: [organization.orgPk],
			name: "player_organization_po_org_fk_fkey"
		}),
]);

// 1. NUEVA TABLA (Lookup Table para estados)
export const friendStatus = pgTable("friend_status", {
	fsPk: smallint("fs_pk").primaryKey().generatedAlwaysAsIdentity(),
	fsI18nName: jsonb("fs_i18n_name").notNull(),
});

export const playerFriend = pgTable("player_friend", {
	friendPk: integer("friend_pk").primaryKey().generatedAlwaysAsIdentity(),
	f1: integer("f_1").references(() => player.pPk),
	f2: integer("f_2").references(() => player.pPk),
	fDate: timestamp("f_date", { mode: 'string' }).defaultNow(), // Añadido defaultNow
	
    // CAMBIO: De booleano a Foreign Key
    // ANTES: fType: boolean("f_type"),
    // AHORA:
    fStatusFk: smallint("f_status_fk").references(() => friendStatus.fsPk), 

}, (table) => [
    // Foreign Keys explícitas si las necesitas en Drizzle (opcional si usas references arriba)
	foreignKey({
			columns: [table.f1],
			foreignColumns: [player.pPk],
			name: "player_friend_f_1_fkey"
		}),
	foreignKey({
			columns: [table.f2],
			foreignColumns: [player.pPk],
			name: "player_friend_f_2_fkey"
		}),
]);

export const competitor = pgTable("competitor", {
	mcMatchFk: integer("mc_match_fk").notNull(),
	mcPlayerFk: integer("mc_player_fk").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.mcMatchFk],
			foreignColumns: [match.mPk],
			name: "competitor_mc_match_fk_fkey"
		}),
	foreignKey({
			columns: [table.mcPlayerFk],
			foreignColumns: [player.pPk],
			name: "competitor_mc_player_fk_fkey"
		}),
	primaryKey({ columns: [table.mcPlayerFk, table.mcMatchFk], name: "competitor_pkey"}),
]);

export const competitormetric = pgTable("competitormetric", {
	mcmMatchFk: integer("mcm_match_fk").notNull(),
	mcmPlayerFk: integer("mcm_player_fk").notNull(),
	mcmMetricFk: smallint("mcm_metric_fk").notNull(),
	mcmValue: doublePrecision("mcm_value"),
}, (table) => [
	foreignKey({
			columns: [table.mcmMetricFk],
			foreignColumns: [metric.metricPk],
			name: "competitormetric_mcm_metric_fk_fkey"
		}),
	foreignKey({
			columns: [table.mcmMatchFk, table.mcmPlayerFk],
			foreignColumns: [competitor.mcMatchFk, competitor.mcPlayerFk],
			name: "fk_mcm_match_player"
		}),
	primaryKey({ columns: [table.mcmPlayerFk, table.mcmMetricFk, table.mcmMatchFk], name: "competitormetric_pkey"}),
]);

