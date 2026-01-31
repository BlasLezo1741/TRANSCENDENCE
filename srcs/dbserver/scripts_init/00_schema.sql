-- SQL script generated from Mermaid JS ERD to PostgreSQL
-- Schema: mySchema

CREATE EXTENSION IF NOT EXISTS citext;

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
    role_i18n_name JSONB NOT NULL -- Estructura: {"en": "Administrator", "es": "Administrador"}
);

CREATE TABLE STATUS ( 
    status_pk smallint generated always as identity PRIMARY KEY,
    status_i18n_name JSONB NOT NULL -- Estructura: {"en": "Busy", "es": "Ocupado"}
);

CREATE TABLE PLAYER ( 
    p_pk integer generated always as identity PRIMARY KEY,
    p_nick VARCHAR(255) UNIQUE NOT NULL,
    p_mail CITEXT UNIQUE NOT NULL, --Case insensitive
    p_pass TEXT , -- NULLABLE for OAuth users
    p_totp_secret BYTEA, --encrypted 2fa secret
    p_totp_enabled BOOLEAN DEFAULT FALSE,
    p_totp_enabled_at TIMESTAMP,
    p_totp_backup_codes TEXT[],  -- códigos de respaldo
    p_oauth_provider VARCHAR(20),  -- NEW: '42' or 'google'
    p_oauth_id VARCHAR(255),       -- NEW: OAuth provider's user ID
    p_avatar_url VARCHAR(500),     -- NEW: Profile picture
    p_profile_complete BOOLEAN DEFAULT FALSE,  -- NEW: Track profile completion
    p_reg TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Change: Added Default
    p_bir DATE,
    p_lang char(2) REFERENCES P_LANGUAGE(lang_pk),
    p_country char(2) REFERENCES COUNTRY(coun2_pk),
    p_role smallint DEFAULT 1 REFERENCES P_ROLE(role_pk),     -- Change: Added Default
    p_status smallint DEFAULT 1 REFERENCES STATUS(status_pk),  -- Change: Added Default
    CONSTRAINT unique_oauth_user UNIQUE(p_oauth_provider, p_oauth_id) 
);



CREATE TABLE METRIC_CATEGORY ( 
    metric_cate_pk smallint generated always as identity PRIMARY KEY,
    metric_cate_i18n_name JSONB NOT NULL -- Estructura: {"en": "Competitor Stats", "es": "Estadísticas del Competidor"}
);

CREATE TABLE METRIC ( 
    metric_pk smallint generated always as identity PRIMARY KEY,
    metric_cat_fk smallint REFERENCES METRIC_CATEGORY(metric_cate_pk),
    metric_i18n_name JSONB NOT NULL, -- Estructura: {"en": "Points Scored", "es": "Puntos Anotados"}
    metric_i18n_description JSONB NOT NULL -- Estructura: {"en": "Total points scored by the competitor during the match.", "es": "Total de puntos anotados por el compet
);

CREATE TABLE MATCH_MODE (
    mmod_pk smallint generated always as identity PRIMARY KEY,
    mmod_name VARCHAR(20) -- Natalia, para el tipo de modo de juego
);
CREATE TABLE MATCH ( 
    m_pk integer generated always as identity PRIMARY KEY,
    m_date TIMESTAMP,
    m_duration interval,
    m_mode_fk smallint REFERENCES MATCH_MODE(mmod_pk),
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

CREATE TABLE PLAYER_ORGANIZATION ( 
    po_p_fk integer REFERENCES PLAYER(p_pk),
    po_org_fk smallint REFERENCES ORGANIZATION(org_pk)
);

CREATE TABLE FRIEND_STATUS ( 
    fs_pk smallint generated always as identity PRIMARY KEY,
    fs_i18n_name JSONB NOT NULL -- Para poder traducirlo igual que tus otros estados
);

CREATE TABLE PLAYER_FRIEND( 
    friend_pk integer generated always as identity PRIMARY KEY,
    f_1 integer REFERENCES PLAYER(p_pk), -- El usuario que REALIZA la acción (envía solicitud o bloquea)
    f_2 integer REFERENCES PLAYER(p_pk), -- El usuario que RECIBE la acción
    f_date timestamp DEFAULT CURRENT_TIMESTAMP,
    f_status_fk smallint REFERENCES FRIEND_STATUS(fs_pk) -- En vez de f_type boolean
);

-- --- 4. CHAT SYSTEM TABLES (Añadido manualmente) ---

CREATE TABLE direct_message (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    sender_id INT NOT NULL REFERENCES player(p_pk) ON DELETE CASCADE,
    receiver_id INT NOT NULL REFERENCES player(p_pk) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE channel (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(20) DEFAULT 'public',
    password VARCHAR(255),
    owner_id INT REFERENCES player(p_pk) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE channel_member (
    channel_id INT NOT NULL REFERENCES channel(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES player(p_pk) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member',
    is_muted BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (channel_id, user_id)
);