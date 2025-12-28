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
    p_role smallint REFERENCES P_ROLE(role_pk)
);

CREATE TABLE METRIC ( 
    metric_pk smallint generated always as identity PRIMARY KEY,
    metric_name VARCHAR(255)
);

CREATE TABLE MATCH ( 
    m_pk integer generated always as identity PRIMARY KEY,
    m_date TIMESTAMP,
    m_duration time,
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
    mcm_match_fk integer REFERENCES MATCH(m_pk),
    mcm_user_fk integer REFERENCES PLAYER(p_pk),
    mcm_metric_fk smallint REFERENCES METRIC(metric_pk) ,
    mcm_value FLOAT,
    PRIMARY KEY (mcm_match_fk,mcm_user_fk,mcm_metric_fk)
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