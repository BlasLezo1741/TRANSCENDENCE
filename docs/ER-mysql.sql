-- SQL script generated from Mermaid JS ERD to MySQL
-- Schema: mySchema

CREATE TABLE USER ( 
     INT,
    u_nick VARCHAR(255),
    u_mail VARCHAR(255),
    u_pass VARCHAR(255),
    u_reg TIMESTAMP,
    u_bir DATE,
    u_lang utinyint,
    u_country utinyint,
    u_role utinyint,
    PRIMARY KEY (),
    FOREIGN KEY(u_lang, u_country, u_role) REFERENCES (u_lang, u_country, u_role)
);

CREATE TABLE COUNTRY ( 
    Coun_pk utinyint,
    coun_name VARCHAR(255),
     INT,
    PRIMARY KEY (Coun_pk),
    FOREIGN KEY() REFERENCES USER()
);

CREATE TABLE LANGUAGE ( 
    lang_pk utinyint,
    lang_name VARCHAR(255),
     INT,
    PRIMARY KEY (lang_pk),
    FOREIGN KEY() REFERENCES USER()
);

CREATE TABLE ROLE ( 
    role_pk utinyint,
    role_name VARCHAR(255),
     INT,
    PRIMARY KEY (role_pk),
    FOREIGN KEY() REFERENCES USER()
);

CREATE TABLE STATUS ( 
    status_pk utinyint,
    status_name VARCHAR(255),
     INT,
    PRIMARY KEY (status_pk),
    FOREIGN KEY() REFERENCES USER()
);

CREATE TABLE METRIC ( 
    metric_pk utinyint,
    metric_name VARCHAR(255),
    PRIMARY KEY (metric_pk)
);

CREATE TABLE MATCH ( 
    m_pk integer,
    m_date TIMESTAMP,
     time,
     INT,
    PRIMARY KEY (m_pk,)
);

CREATE TABLE MATCHMETRIC ( 
    mm_match_fk integer,
    mm_code_fk tinyint,
     FLOAT,
    metric_pk utinyint,
    PRIMARY KEY (mm_match_fk,mm_code_fk),
    FOREIGN KEY(mm_match_fk, mm_code_fk) REFERENCES (mm_match_fk, mm_code_fk),
    FOREIGN KEY(metric_pk) REFERENCES METRIC(metric_pk)
);

CREATE TABLE COMPETITOR ( 
    mc_match_fk integer,
    mc_user_fk integer,
     INT,
    m_pk integer,
    PRIMARY KEY (mc_match_fk,mc_user_fk),
    FOREIGN KEY(mc_match_fk, mc_user_fk) REFERENCES (mc_match_fk, mc_user_fk),
    FOREIGN KEY(, m_pk) REFERENCES MATCH(, m_pk)
);

CREATE TABLE COMPETITORMETRIC ( 
    mcm_match_fk integer,
    mcm_user_fk integer,
    mcm_metric_fk tinyint,
     FLOAT,
    PRIMARY KEY (mcm_match_fk,mcm_user_fk,mcm_metric_fk),
    FOREIGN KEY(mcm_match_fk, mcm_user_fk) REFERENCES (mcm_match_fk, mcm_user_fk)
);

CREATE TABLE FRIEND ( 
    f_1 INT,
    f_2 INT,
    f_date DATE,
    f_tipo boolean,
    PRIMARY KEY (f_1,f_2),
    FOREIGN KEY(f_1, f_2) REFERENCES (f_1, f_2)
);

CREATE TABLE ORGANIZATION (
);

CREATE TABLE ORDER (
);

CREATE TABLE LINE-ITEM (
);

CREATE TABLE USER_FRIEND_has ( 
     INT,
    f_1 INT,
    f_2 INT,
    PRIMARY KEY (,f_1,f_2),
    FOREIGN KEY() REFERENCES USER(),
    FOREIGN KEY(f_1, f_2) REFERENCES FRIEND(f_1, f_2)
);

CREATE TABLE USER_ORGANIZATION_of" ( 
     INT,
    PRIMARY KEY (),
    FOREIGN KEY() REFERENCES USER()
);

CREATE TABLE MATCH_MATCHMETRIC_has ( 
    m_pk integer,
     INT,
    mm_match_fk integer,
    mm_code_fk tinyint,
    PRIMARY KEY (m_pk,,mm_match_fk,mm_code_fk),
    FOREIGN KEY(m_pk, ) REFERENCES MATCH(m_pk, ),
    FOREIGN KEY(mm_match_fk, mm_code_fk) REFERENCES MATCHMETRIC(mm_match_fk, mm_code_fk)
);

