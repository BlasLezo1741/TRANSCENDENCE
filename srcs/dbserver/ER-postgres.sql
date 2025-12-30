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
    metric_cat_fk smallint REFERENCES METRIC_CATEGORY(metric_cate_pk)
);

-- The Metric Name/Description i18n (from previous step)
CREATE TABLE METRIC_I18N (
    mi18n_metric_fk smallint REFERENCES METRIC(metric_pk) ON DELETE CASCADE,
    mi18n_lang_fk char(2) REFERENCES P_LANGUAGE(lang_pk) ON DELETE CASCADE,
    mi18n_name VARCHAR(255) NOT NULL,
    mi18n_description TEXT,
    PRIMARY KEY (mi18n_metric_fk, mi18n_lang_fk)
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

INSERT INTO METRIC_CATEGORY (metric_cate_pk) 
OVERRIDING SYSTEM VALUE
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
    (3, 'fr', 'Statistiques de l''Organisation'),
    (4, 'fr', 'Statistiques du Tournoi'),
    (5, 'fr', 'Statistiques du Système'),
    (1, 'pt', 'Estatísticas do Competidor'),
    (2, 'pt', 'Estatísticas da Partida'),
    (3, 'pt', 'Estatísticas da Organização'),
    (4, 'pt', 'Estatísticas do Torneio'),
    (5, 'pt', 'Estatísticas do Sistema');

INSERT INTO METRIC (metric_pk, metric_cat_fk)
OVERRIDING SYSTEM VALUE
VALUES 
    -- Competitor Stats: Focused on individual skill/performance
    (1, 1), -- Point Scored
    (2, 1), -- Paddle Hits
    (3, 1), -- Service Aces
    (4, 1), -- Misses
    (5, 1), -- Winning Streak
    
    -- Match Stats: Focused on ball physics and game dynamics
    (6, 2), -- Peak Ball Speed
    (7, 2), -- Max Rally Length
    (8, 2), -- Total Wall Bounces
    (9, 2), -- Average Volley Duration
    (10, 2), -- Net Touches
    
    -- Organization Stats: Focused on team/clan aggregate performance
    (11, 3), -- Total Org Wins
    (12, 3), -- Member Participation Count
    (13, 3), -- Org Average Elo
    (14, 3), -- Total Tournament Trophies
    
    -- Tournament Stats: Focused on the bracket and event health
    (15, 4), -- Upsets Count
    (16, 4), -- Average Match Margin
    (17, 4), -- Total Participants
    (18, 4), -- Tournament Duration
    (19, 4); -- Forfeit Count
    
INSERT INTO METRIC_I18N (mi18n_metric_fk, mi18n_lang_fk, mi18n_name, mi18n_description) 
VALUES 
    (1, 'en', 'Points Scored', 'Total points scored by the competitor during the match.'),
    (2, 'en', 'Paddle Hits', 'Number of times the competitor hit the ball with their paddle.'),
    (3, 'en', 'Service Aces', 'Number of unreturned serves by the competitor.'),
    (4, 'en', 'Misses', 'Number of times the competitor failed to return the ball.'),
    (5, 'en', 'Winning Streak', 'Longest consecutive points won by the competitor.'),
    (6, 'en', 'Peak Ball Speed', 'Highest speed reached by the ball during the match.'),
    (7, 'en', 'Max Rally Length', 'Longest sequence of consecutive hits without a point being scored.'),
    (8, 'en', 'Total Wall Bounces', 'Total number of times the ball bounced off walls during the match.'),
    (9, 'en', 'Average Volley Duration', 'Average time duration of volleys during the match.'),
    (10, 'en', 'Net Touches', 'Number of times the ball touched the net during play.'),
    (11, 'en', 'Total Org Wins', 'Total number of wins by the organization across all matches.'),
    (12, 'en', 'Member Participation Count', 'Number of unique members from the organization who participated in matches.'),
    (13, 'en', 'Org Average Elo', 'Average Elo rating of all members in the organization.'),
    (14, 'en', 'Total Tournament Trophies', 'Total number of trophies won by the organization in tournaments.'),
    (15, 'en', 'Upsets Count', 'Number of matches where a lower-ranked competitor defeated a higher-ranked competitor.'),
    (16, 'en', 'Average Match Margin', 'Average point difference between competitors in matches.'),
    (17, 'en', 'Total Participants', 'Total number of participants in the tournament.'),
    (18, 'en', 'Tournament Duration', 'Total duration of the tournament from start to finish.'),
    (19, 'en', 'Forfeit Count', 'Number of matches forfeited by competitors in the tournament.'),
    -- Additional translations can be added here
    (1, 'es', 'Puntos Anotados', 'Total de puntos anotados por el competidor durante el partido.'),
    (2, 'es', 'Golpes con la Pala', 'Número de veces que el competidor golpeó la pelota con su pala.'),
    (3, 'es', 'Ases de Servicio', 'Número de servicios no devueltos por el competidor.'),
    (4, 'es', 'Errores', 'Número de veces que el competidor no logró devolver la pelota.'),
    (5, 'es', 'Racha Ganadora', 'Mayor cantidad de puntos consecutivos ganados por el competidor.'),
    (6, 'es', 'Velocidad Máxima de la Pelota', 'Velocidad más alta alcanzada por la pelota durante el partido.'),
    (7, 'es', 'Longitud Máxima de Ráfaga', 'Secuencia más larga de golpes consecutivos sin que se anote un punto.'),
    (8, 'es', 'Total de Rebotes en Paredes', 'Número total de veces que la pelota rebotó en las paredes durante el partido.'),
    (9, 'es', 'Duración Promedio del Volea', 'Tiempo promedio de duración de los voleas durante el partido.'),
    (10, 'es', 'Toques en la Red', 'Número de veces que la pelota tocó la red durante el juego.'),
    (11, 'es', 'Total de Victorias de la Organización', 'Número total de victorias de la organización en todos los partidos.'),
    (12, 'es', 'Conteo de Participación de Miembros', 'Número de miembros únicos de la organización que participaron en partidos.'),
    (13, 'es', 'Elo Promedio de la Organización', 'Calificación Elo promedio de todos los miembros de la organización.'),
    (14, 'es', 'Total de Trofeos en Torneos', 'Número total de trofeos ganados por la organización en torneos.'),
    (15, 'es', 'Conteo de Sorpresas', 'Número de partidos donde un competidor con menor clasificación derrotó a uno con mayor clasificación.'),
    (16, 'es', 'Margen Promedio del Partido', 'Diferencia promedio de puntos entre competidores en los partidos.'),
    (17, 'es', 'Total de Participantes', 'Número total de participantes en el torneo.'),
    (18, 'es', 'Duración del Torneo', 'Duración total del torneo desde el inicio hasta el final.'),
    (19, 'es', 'Conteo de Forfaits', 'Número de partidos forfeitados por competidores en el torneo.'),
    -- Additional translations can be added here
    (1, 'fr', 'Points Marqués', 'Total des points marqués par le compétiteur pendant le match.'),
    (2, 'fr', 'Coups de Raquette', 'Nombre de fois que le compétiteur a frappé la balle avec sa raquette.'),
    (3, 'fr', 'As de Service', 'Nombre de services non retournés par le compétiteur.'),
    (4, 'fr', 'Erreurs', 'Nombre de fois que le compétiteur n''a pas réussi à retourner la balle.'),
    (5, 'fr', 'Série de Victoires', 'Plus grand nombre de points consécutifs gagnés par le compétiteur.'),
    (6, 'fr', 'Vitesse Maximale de la Balle', 'Vitesse la plus élevée atteinte par la balle pendant le match.'),
    (7, 'fr', 'Longueur Maximale du Rallye', 'Plus longue séquence de coups consécutifs sans qu''un point soit marqué.'),
    (8, 'fr', 'Total des Rebondissements sur les Murs', 'Nombre total de fois que la balle a rebondi sur les murs pendant le match.'),
    (9, 'fr', 'Durée Moyenne des Volées', 'Durée moyenne des volées pendant le match.'),
    (10, 'fr', 'Touches du Filet', 'Nombre de fois que la balle a touché le filet pendant le jeu.'),
    (11, 'fr', 'Total des Victoires de l''Organisation', 'Nombre total de victoires de l''organisation dans tous les matchs.'),
    (12, 'fr', 'Nombre de Participation des Membres', 'Nombre de membres uniques de l''organisation ayant participé aux matchs.'),
    (13, 'fr', 'Elo Moyen de l''Organisation', 'Classement Elo moyen de tous les membres de l''organisation.'),
    (14, 'fr', 'Total des Trophées en Tournois', 'Nombre total de trophées remportés par l''organisation dans les tournois.'),
    (15, 'fr', 'Nombre d''Upsets', 'Nombre de matchs où un compétiteur moins bien classé a battu un compétiteur mieux classé.'),
    (16, 'fr', 'Marge Moyenne du Match', 'Différence moyenne de points entre les compétiteurs dans les matchs.'),
    (17, 'fr', 'Total des Participants', 'Nombre total de participants au tournoi.'),
    (18, 'fr', 'Durée du Tournoi', 'Durée totale du tournoi du début à la fin.'),
    (19, 'fr', 'Nombre d''Abandons', 'Nombre de matchs abandonnés par les compétiteurs dans le tournoi.'),
    -- Additional translations can be added here    
    (1, 'pt', 'Pontos Marcados', 'Total de pontos marcados pelo competidor durante a partida.'),
    (2, 'pt', 'Golpes com a Raquete', 'Número de vezes que o competidor golpeou a bola com sua raquete.'),
    (3, 'pt', 'Aces de Serviço', 'Número de serviços não devolvidos pelo competidor.'),
    (4, 'pt', 'Erros', 'Número de vezes que o competidor não conseguiu devolver a bola.'),
    (5, 'pt', 'Sequência Vencedora', 'Maior quantidade de pontos consecutivos ganhos pelo competidor.'),
    (6, 'pt', 'Velocidade Máxima da Bola', 'Velocidade mais alta alcançada pela bola durante a partida.'),
    (7, 'pt', 'Comprimento Máximo de Troca', 'Sequência mais longa de golpes consecutivos sem que um ponto seja marcado.'),
    (8, 'pt', 'Total de Rebotes nas Paredes', 'Número total de vezes que a bola rebateu nas paredes durante a partida.'),
    (9, 'pt', 'Duração Média do Voleio', 'Tempo médio de duração dos voleios durante a partida.'),
    (10, 'pt', 'Toques na Rede', 'Número de vezes que a bola tocou a rede durante o jogo.'),
    (11, 'pt', 'Total de Vitórias da Organização', 'Número total de vitórias da organização em todas as partidas.'),
    (12, 'pt', 'Contagem de Participação de Membros', 'Número de membros únicos da organização que participaram em partidas.'),
    (13, 'pt', 'Elo Médio da Organização', 'Classificação Elo média de todos os membros da organização.'),
    (14, 'pt', 'Total de Troféus em Torneios', 'Número total de troféus ganhos pela organização em torneios.'),
    (15, 'pt', 'Contagem de Surpresas', 'Número de partidas onde um competidor com menor classificação derrotou um com maior classificação.'),
    (16, 'pt', 'Margem Média da Partida', 'Diferença média de pontos entre competidores nas partidas.'),
    (17, 'pt', 'Total de Participantes', 'Número total de participantes no torneio.'),
    (18, 'pt', 'Duração do Torneio', 'Duração total do torneio desde o início até o final.'),
    (19, 'pt', 'Contagem de Desistências', 'Número de partidas em que houve desistência por competidores no torneio.');


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