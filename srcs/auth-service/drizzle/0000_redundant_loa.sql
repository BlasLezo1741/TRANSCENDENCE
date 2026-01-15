-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "metric_category" (
	"metric_cate_pk" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "metric_category_metric_cate_pk_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"metric_cate_i18n_name" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "p_language" (
	"lang_pk" char(2) PRIMARY KEY NOT NULL,
	"lang_name" varchar(255),
	"lang_status" boolean
);
--> statement-breakpoint
CREATE TABLE "player" (
	"p_pk" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "player_p_pk_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"p_nick" varchar(20) NOT NULL,
	"p_mail" "citext" NOT NULL,
	"p_pass" text NOT NULL,
	"p_totp_secret" "bytea",
	"p_totp_enable" boolean DEFAULT false,
	"p_totp_enabled_at" timestamp,
	"p_totp_backup_codes" text[],
	"p_reg" timestamp,
	"p_bir" date,
	"p_lang" char(2),
	"p_country" char(2),
	"p_role" smallint,
	"p_status" smallint,
	CONSTRAINT "player_p_nick_key" UNIQUE("p_nick"),
	CONSTRAINT "player_p_mail_key" UNIQUE("p_mail")
);
--> statement-breakpoint
CREATE TABLE "country" (
	"coun_name" char(52),
	"coun2_pk" char(2) PRIMARY KEY NOT NULL,
	"coun3" char(3),
	"coun_code" char(3),
	"coun_iso_code" char(13),
	"coun_region" char(8),
	"coun_region_sub" char(31),
	"coun_region_int" char(15),
	"coun_region_code" char(3),
	"coun_region_sub_code" char(3),
	"coun_region_int_code" char(3)
);
--> statement-breakpoint
CREATE TABLE "p_role" (
	"role_pk" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "p_role_role_pk_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"role_i18n_name" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "status" (
	"status_pk" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "status_status_pk_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"status_i18n_name" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_mode" (
	"mmod_pk" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "match_mode_mmod_pk_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"mmod_name" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "metric" (
	"metric_pk" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "metric_metric_pk_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"metric_cat_fk" smallint,
	"metric_i18n_name" jsonb NOT NULL,
	"metric_i18n_description" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match" (
	"m_pk" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "match_m_pk_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"m_date" timestamp,
	"m_duration" interval,
	"m_mode_fk" smallint,
	"m_winner_fk" integer
);
--> statement-breakpoint
CREATE TABLE "matchmetric" (
	"mm_pk" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "matchmetric_mm_pk_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"mm_match_fk" integer,
	"mm_code_fk" smallint,
	"mm_value" double precision
);
--> statement-breakpoint
CREATE TABLE "player_organization" (
	"po_p_fk" integer,
	"po_org_fk" smallint
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"org_pk" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_org_pk_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"org_name" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "player_friend" (
	"friend_pk" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "player_friend_friend_pk_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"f_1" integer,
	"f_2" integer,
	"f_date" timestamp,
	"f_type" boolean
);
--> statement-breakpoint
CREATE TABLE "competitor" (
	"mc_match_fk" integer NOT NULL,
	"mc_player_fk" integer NOT NULL,
	CONSTRAINT "competitor_pkey" PRIMARY KEY("mc_player_fk","mc_match_fk")
);
--> statement-breakpoint
CREATE TABLE "competitormetric" (
	"mcm_match_fk" integer NOT NULL,
	"mcm_player_fk" integer NOT NULL,
	"mcm_metric_fk" smallint NOT NULL,
	"mcm_value" double precision,
	CONSTRAINT "competitormetric_pkey" PRIMARY KEY("mcm_player_fk","mcm_metric_fk","mcm_match_fk")
);
--> statement-breakpoint
ALTER TABLE "player" ADD CONSTRAINT "player_p_lang_fkey" FOREIGN KEY ("p_lang") REFERENCES "public"."p_language"("lang_pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player" ADD CONSTRAINT "player_p_country_fkey" FOREIGN KEY ("p_country") REFERENCES "public"."country"("coun2_pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player" ADD CONSTRAINT "player_p_role_fkey" FOREIGN KEY ("p_role") REFERENCES "public"."p_role"("role_pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player" ADD CONSTRAINT "player_p_status_fkey" FOREIGN KEY ("p_status") REFERENCES "public"."status"("status_pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric" ADD CONSTRAINT "metric_metric_cat_fk_fkey" FOREIGN KEY ("metric_cat_fk") REFERENCES "public"."metric_category"("metric_cate_pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match" ADD CONSTRAINT "match_m_mode_fk_fkey" FOREIGN KEY ("m_mode_fk") REFERENCES "public"."match_mode"("mmod_pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match" ADD CONSTRAINT "match_m_winner_fk_fkey" FOREIGN KEY ("m_winner_fk") REFERENCES "public"."player"("p_pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matchmetric" ADD CONSTRAINT "matchmetric_mm_match_fk_fkey" FOREIGN KEY ("mm_match_fk") REFERENCES "public"."match"("m_pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matchmetric" ADD CONSTRAINT "matchmetric_mm_code_fk_fkey" FOREIGN KEY ("mm_code_fk") REFERENCES "public"."metric"("metric_pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_organization" ADD CONSTRAINT "player_organization_po_p_fk_fkey" FOREIGN KEY ("po_p_fk") REFERENCES "public"."player"("p_pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_organization" ADD CONSTRAINT "player_organization_po_org_fk_fkey" FOREIGN KEY ("po_org_fk") REFERENCES "public"."organization"("org_pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_friend" ADD CONSTRAINT "player_friend_f_1_fkey" FOREIGN KEY ("f_1") REFERENCES "public"."player"("p_pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_friend" ADD CONSTRAINT "player_friend_f_2_fkey" FOREIGN KEY ("f_2") REFERENCES "public"."player"("p_pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor" ADD CONSTRAINT "competitor_mc_match_fk_fkey" FOREIGN KEY ("mc_match_fk") REFERENCES "public"."match"("m_pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor" ADD CONSTRAINT "competitor_mc_player_fk_fkey" FOREIGN KEY ("mc_player_fk") REFERENCES "public"."player"("p_pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitormetric" ADD CONSTRAINT "competitormetric_mcm_metric_fk_fkey" FOREIGN KEY ("mcm_metric_fk") REFERENCES "public"."metric"("metric_pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitormetric" ADD CONSTRAINT "fk_mcm_match_player" FOREIGN KEY ("mcm_match_fk","mcm_player_fk") REFERENCES "public"."competitor"("mc_match_fk","mc_player_fk") ON DELETE no action ON UPDATE no action;
*/