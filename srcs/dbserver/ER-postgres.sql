-- SQL script generated from Mermaid JS ERD to PostgreSQL
-- Schema: mySchema



CREATE TABLE COUNTRY (
    coun_name CHAR(52),
    coun2_pk char(2) PRIMARY KEY,
    coun3 char(3),
    coun_code char(3),
    coun_iso_code char(13),
    coun_region char(8),
    coun_region_sub CHAR(31),
    coun_region_int CHAR(15),
    coun_region_code char(3),
    coun_region_sub_code CHAR(3),
    coun_region_int_code CHAR(3)
);


CREATE TABLE P_LANGUAGE ( 
    lang_pk char(2) PRIMARY KEY,
    lang_name VARCHAR(255),
    lang_status BOOLEAN  
);


CREATE TABLE P_ROLE ( 
    role_pk smallint generated always as identity PRIMARY KEY,
    role_name VARCHAR(255)
);

CREATE TABLE STATUS ( 
    status_pk smallint generated always as identity PRIMARY KEY,
    status_name VARCHAR(255)
);

CREATE TABLE PLAYER ( 
    p_pk integer generated always as identity PRIMARY KEY,
    p_nick VARCHAR(255),
    p_mail VARCHAR(255),
    p_pass VARCHAR(255),
    p_reg TIMESTAMP,
    p_bir DATE,
    p_lang char(2) REFERENCES P_LANGUAGE(lang_pk),
    p_country char(2) REFERENCES COUNTRY(coun2_pk),
    p_role smallint REFERENCES P_ROLE(role_pk),
    p_status smallint REFERENCES STATUS(status_pk)
);

CREATE TABLE METRIC_CATEGORY ( 
    metric_cate_pk smallint generated always as identity PRIMARY KEY
);

CREATE TABLE METRIC_CATEGORY_I18N (
    mci_cat_fk smallint REFERENCES METRIC_CATEGORY(metric_cate_pk) ON DELETE CASCADE,
    mci_lang_fk char(2) REFERENCES P_LANGUAGE(lang_pk) ON DELETE CASCADE,
    mci_name VARCHAR(100) NOT NULL,
    PRIMARY KEY (mci_cat_fk, mci_lang_fk)
);

CREATE TABLE METRIC ( 
    metric_pk smallint generated always as identity PRIMARY KEY,
    metric_name VARCHAR(255),
    metric_cate_fk smallint REFERENCES METRIC_CATEGORY(metric_cate_pk)
);

CREATE TABLE MATCH ( 
    m_pk integer generated always as identity PRIMARY KEY,
    m_date TIMESTAMP,
    m_duration interval,
    m_winner_fk integer REFERENCES PLAYER(p_pk)
);

CREATE TABLE MATCHMETRIC ( 
    mm_pk integer generated always as identity PRIMARY KEY,    
    mm_match_fk integer REFERENCES MATCH(m_pk),
    mm_code_fk smallint REFERENCES METRIC(metric_pk),
    mm_value FLOAT
);

CREATE TABLE COMPETITOR ( 
    mc_match_fk integer REFERENCES MATCH(m_pk),
    mc_player_fk integer REFERENCES PLAYER(p_pk),
    PRIMARY KEY (mc_match_fk,mc_player_fk)
);
CREATE TABLE COMPETITORMETRIC (
    mcm_match_fk integer,
    mcm_player_fk integer,
    mcm_metric_fk smallint REFERENCES METRIC(metric_pk) ,
    mcm_value FLOAT,
    PRIMARY KEY (mcm_match_fk,mcm_player_fk,mcm_metric_fk),
    CONSTRAINT fk_mcm_match_player FOREIGN KEY (mcm_match_fk, mcm_player_fk) 
        REFERENCES COMPETITOR(mc_match_fk, mc_player_fk)
    );


CREATE TABLE ORGANIZATION ( 
    org_pk smallint generated always as identity PRIMARY KEY,
    org_name VARCHAR(255)
);


CREATE TABLE PLAYER_FRIEND( 
    friend_pk integer generated always as identity PRIMARY KEY,
    f_1 integer REFERENCES PLAYER(p_pk),
    f_2 integer REFERENCES PLAYER(p_pk),
    f_date timestamp,
    f_tipe boolean
);

CREATE TABLE PLAYER_ORGANIZATION ( 
    po_p_fk integer REFERENCES PLAYER(p_pk),
    po_org_fk smallint REFERENCES ORGANIZATION(org_pk)
);

-- 2. Ejecutar la carga masiva
COPY COUNTRY(coun_name, coun2_pk, coun3,coun_code ,coun_iso_code, coun_region, coun_region_sub, coun_region_int, coun_region_code, coun_region_sub_code, coun_region_int_code)
FROM '/docker-entrypoint-initdb.d/countries.csv'
WITH (
    DELIMITER ',', 
    FORMAT CSV,
    HEADER true
);

-- 2. Ejecutar la carga masiva
COPY P_LANGUAGE(lang_pk, lang_name, lang_status)
FROM '/docker-entrypoint-initdb.d/languages.csv'
WITH (
    DELIMITER ',', 
    FORMAT CSV,
    HEADER true
);

INSERT INTO STATUS (status_name) 
VALUES 
    ('Unconnected'),
    ('Connected'),
    ('Inactive for 5 minutes'),
    ('Inactive for 10 minutes'),
    ('Busy');

INSERT INTO P_ROLE (role_name) 
VALUES 
    ('Administrator'),
    ('Moderator'),
    ('User'),
    ('Guest'),
    ('Organization_Admin'),
    ('Banned');

INSERT INTO ORGANIZATION (org_name) 
VALUES 
    ('Org Alpha'),
    ('Beta Gamers'),
    ('Gamma Esports'),
    ('Delta Clan'),
    ('Epsilon Team');

INSERT INTO METRIC_CATEGORY (metric_cate_name) 
VALUES 
    (1),
    (2),
    (3),
    (4),
    (5);
INSERT INTO METRIC_CATEGORY_I18N (mci_cat_fk, mci_lang_fk, mci_name) 
VALUES 
    (1, 'en', 'Competitor Stats'),
    (2, 'en', 'Match Stats'),
    (3, 'en', 'Organization Stats'),
    (4, 'en', 'Tournament Stats'),
    (5, 'en', 'System Stats'),
    (1, 'es', 'Estadísticas del Competidor'),
    (2, 'es', 'Estadísticas del Partido'),
    (3, 'es', 'Estadísticas de la Organización'),
    (4, 'es', 'Estadísticas del Torneo'),
    (5, 'es', 'Estadísticas del Sistema'),
    (1, 'fr', 'Statistiques du Compétiteur'),
    (2, 'fr', 'Statistiques du Match'),
    (3, 'fr', "Statistiques de l'Organisation"),
    (4, 'fr', 'Statistiques du Tournoi'),
    (5, 'fr', 'Statistiques du Système'),
    (1, 'de', 'Wettbewerberstatistiken'),
    (2, 'de', 'Spielstatistiken'),
    (3, 'de', 'Organisationsstatistiken'),
    (4, 'de', 'Turnierstatistiken'),
    (5, 'de', 'Systemstatistiken'),
    (1, 'it', 'Statistiche del Competitore'),
    (2, 'it', 'Statistiche della Partita'),
    (3, 'it', "Statistiche dell'Organizzazione"),
    (4, 'it', 'Statistiche del Torneo'),
    (5, 'it', 'Statistiche del Sistema'),
    (1, 'pt', 'Estatísticas do Competidor'),
    (2, 'pt', 'Estatísticas da Partida'),
    (3, 'pt', 'Estatísticas da Organização'),
    (4, 'pt', 'Estatísticas do Torneio'),
    (5, 'pt', 'Estatísticas do Sistema');


INSERT INTO METRIC (metric_name, category) 
VALUES 
    -- Competitor Stats: Focused on individual skill/performance
    ('Points Scored', 1),
    ('Paddle Hits', 1),
    ('Service Aces', 1),
    ('Misses', 1),
    ('Winning Streak', 1),
    
    -- Match Stats: Focused on ball physics and game dynamics
    ('Peak Ball Speed', 2),
    ('Max Rally Length', 2),
    ('Total Wall Bounces', 2),
    ('Average Volley Duration', 2),
    ('Net Touches', 2),
    
    -- Organization Stats: Focused on team/clan aggregate performance
    ('Total Org Wins', 3),
    ('Member Participation Count', 3),
    ('Org Average Elo', 3),
    ('Total Tournament Trophies', 3),
    
    -- Tournament Stats: Focused on the bracket and event health
    ('Upsets Count', 4),
    ('Average Match Margin', 4),
    ('Total Participants', 4),
    ('Tournament Duration', 4),
    ('Forfeit Count', 4);





-- Generate 100 Players
INSERT INTO PLAYER (p_nick, p_mail, p_pass, p_reg, p_bir, p_lang, p_country, p_role, p_status)
SELECT 
    'user_' || i,
    'user_' || i || '@example.com',
    md5(random()::text),
    NOW() - (random() * INTERVAL '365 days'),
    '1990-01-01'::date + (random() * 7000)::integer,
    rand_lang.lang_pk,
    rand_coun.coun2_pk,
    rand_role.role_pk,
    rand_stat.status_pk
FROM generate_series(1, 100) s(i)
-- The LATERAL keyword forces the subquery to run for every 'i'
CROSS JOIN LATERAL (
    SELECT lang_pk 
    FROM P_LANGUAGE 
    WHERE i > 0 -- This "fake" dependency forces re-execution per row
    ORDER BY random() 
    LIMIT 1
) rand_lang
CROSS JOIN LATERAL (
    SELECT coun2_pk 
    FROM COUNTRY 
    WHERE i > 0 -- This "fake" dependency forces re-execution per row
    ORDER BY random() 
    LIMIT 1
) rand_coun
CROSS JOIN LATERAL (
    SELECT role_pk 
    FROM P_ROLE 
    WHERE i > 0 -- This "fake" dependency forces re-execution per row
    ORDER BY random() 
    LIMIT 1
) rand_role
CROSS JOIN LATERAL (
    SELECT status_pk 
    FROM STATUS
    WHERE i > 0 -- This "fake" dependency forces re-execution per row 
    ORDER BY random() 
    LIMIT 1
) rand_stat;

-- Generate 50 Matches
INSERT INTO MATCH (m_date, m_duration, m_winner_fk)
SELECT 
    NOW() - (random() * INTERVAL '30 days'),
    (random() * 3600 || ' seconds')::interval,
    (SELECT p_pk FROM PLAYER WHERE i > 0 ORDER BY random() LIMIT 1)
FROM generate_series(1, 50) s(i);

-- Assign 2 Competitors per Match
INSERT INTO COMPETITOR (mc_match_fk, mc_player_fk)
SELECT 
    m.m_pk, 
    c.p_pk
FROM MATCH m
CROSS JOIN LATERAL (
    -- 1. The Winner (already in the Match table)
    SELECT m.m_winner_fk AS p_pk
    
    UNION ALL
    
    -- 2. The Loser (Randomly picked, but NOT the winner)
    (SELECT p_pk 
     FROM PLAYER 
     WHERE p_pk <> m.m_winner_fk  -- This forces re-execution per match
     ORDER BY random() 
     LIMIT 1)
) c;