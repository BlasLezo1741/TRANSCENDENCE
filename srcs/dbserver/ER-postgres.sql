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
    role_i18n_name JSONB NOT NULL -- Estructura: {"en": "Administrator", "es": "Administrador"}
);

CREATE TABLE STATUS ( 
    status_pk smallint generated always as identity PRIMARY KEY,
    status_i18n_name JSONB NOT NULL -- Estructura: {"en": "Busy", "es": "Ocupado"}
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
    metric_cate_pk smallint generated always as identity PRIMARY KEY,
    metric_cate_i18n_name JSONB NOT NULL -- Estructura: {"en": "Competitor Stats", "es": "Estadísticas del Competidor"}
);

CREATE TABLE METRIC ( 
    metric_pk smallint generated always as identity PRIMARY KEY,
    metric_cat_fk smallint REFERENCES METRIC_CATEGORY(metric_cate_pk),
    metric_i18n_name JSONB NOT NULL, -- Estructura: {"en": "Points Scored", "es": "Puntos Anotados"}
    metric_i18n_description JSONB NOT NULL -- Estructura: {"en": "Total points scored by the competitor during the match.", "es": "Total de puntos anotados por el compet
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

INSERT INTO STATUS (status_i18n_name) 
VALUES 
    ('{"en":"Unconnected","es":"Desconectado","fr":"Déconnecté","pt":"Desconectado","ca":"Desconnectat"}'),
    ('{"en":"Connected","es":"Conectado","fr":"Connecté","pt":"Conectado","ca":"Connectat"}'),
    ('{"en":"Inactive for 5 minutes","es":"Inactivo por 5 minutos","fr":"Inactif pendant 5 minutes","pt":"Inativo por 5 minutos","ca":"Inactiu durant 5 minuts"}'),
    ('{"en":"Inactive for 10 minutes","es":"Inactivo por 10 minutos","fr":"Inactif pendant 10 minutes","pt":"Inativo por 10 minutos","ca":"Inactiu durant 10 minuts"}'),
    ('{"en":"Busy","es":"Ocupado","fr":"Occupé","pt":"Ocupado","ca":"Ocupat"}');

INSERT INTO P_ROLE (role_i18n_name)
VALUES
    ('{"en":"Moderator","es":"Moderador","fr":"Modérateur","pt":"Moderador","ca":"Moderador"}'),
    ('{"en":"Administrator","es":"Administrador","fr":"Administrateur","pt":"Administrador","ca":"Administrador"}'),
    ('{"en":"User","es":"Usuario","fr":"Utilisateur","pt":"Usuário","ca":"Usuari"}'),
    ('{"en":"Guest","es":"Invitado","fr":"Invité","pt":"Convidado","ca":"Convidat"}'),
    ('{"en":"Organization Admin","es":"Administrador de la Organización","fr":"Administrateur de l''Organisation","pt":"Administrador da Organização","ca":"Administrador de l''Organització"}'),
    ('{"en":"Banned","es":"Prohibido","fr":"Banni","pt":"Banido","ca":"Prohibit"}');


INSERT INTO ORGANIZATION (org_name) 
VALUES 
    ('Org Alpha'),
    ('Beta Gamers'),
    ('Gamma Esports'),
    ('Delta Clan'),
    ('Epsilon Team');

INSERT INTO METRIC_CATEGORY (metric_cate_i18n_name) 
VALUES 
    ('{"en":"Competitor Stats","es":"Estadísticas del Competidor","fr":"Statistiques du Compétiteur","pt":"Estatísticas do Competidor","ca":"Estadístiques del Competidor"}'),
    ('{"en":"Match Stats","es":"Estadísticas del Partido","fr":"Statistiques du Match","pt":"Estatísticas da Partida","ca":"Estadístiques del Partit"}'),
    ('{"en":"Organization Stats","es":"Estadísticas de la Organización","fr":"Statistiques de l''Organisation","pt":"Estatísticas da Organização","ca":"Estadístiques de l''Organització"}'),
    ('{"en":"Tournament Stats","es":"Estadísticas del Torneo","fr":"Statistiques du Tournoi","pt":"Estatísticas do Torneio","ca":"Estadístiques del Torneig"}'),
    ('{"en":"System Stats","es":"Estadísticas del Sistema","fr":"Statistiques du Système","pt":"Estatísticas do Sistema","ca":"Estadístiques del Sistema"}');


INSERT INTO METRIC (metric_pk, metric_cat_fk, metric_i18n_name, metric_i18n_description)
OVERRIDING SYSTEM VALUE
VALUES 
    -- CATEGORÍA 1: Competitor Stats
    (1, 1, 
        '{"en": "Points Scored", "es": "Puntos Anotados", "fr": "Points Marqués", "pt": "Pontos Marcados", "ca": "Punts Anotats"}', 
        '{"en": "Total points scored by the competitor during the match.", 
          "es": "Total de puntos anotados por el competidor durante el partido.", 
          "fr": "Total des points marqués par le compétiteur pendant le match.", 
          "pt": "Total de pontos marcados pelo competidor durante a partida.",
          "ca": "Total de punts anotats pel competidor durant el partit."}'
          ),
    (2, 1, 
        '{"en": "Paddle Hits", "es": "Golpes con la Pala", "fr": "Coups de Raquette", "pt": "Golpes com a Raquete", "ca": "Colps amb la Pala"}', 
        '{"en": "Number of times the competitor hit the ball with their paddle.", 
          "es": "Número de veces que el competidor golpeó la pelota con su pala.", 
          "fr": "Nombre de fois que le compétiteur a frappé la balle avec sa raquette.", 
          "pt": "Número de vezes que o competidor golpeou a bola com sua raquete.",
          "ca": "Nombre de vegades que el competidor va colpejar la pilota amb la seva pala."}'
          ),
    (3, 1, 
        '{"en": "Service Aces", "es": "Ases de Servicio", "fr": "As de Service", "pt": "Aces de Serviço", "ca": "Asos de Servei"}', 
        '{"en": "Number of unreturned serves by the competitor.", 
          "es": "Número de servicios no devueltos por el competidor.", 
          "fr": "Nombre de services non retournés par le compétiteur.", 
          "pt": "Número de serviços não devolvidos pelo competidor.",
          "ca": "Nombre de serveis no retornats pel competidor."}'
          ),
    (4, 1, 
        '{"en": "Misses", "es": "Errores", "fr": "Erreurs", "pt": "Erros", "ca": "Errors"}', 
        '{"en": "Number of times the competitor failed to return the ball.", 
          "es": "Número de veces que el competidor no logró devolver la pelota.", 
          "fr": "Nombre de fois que le compétiteur n''a pas réussi à retourner la balle.", 
          "pt": "Número de vezes que o competidor não conseguiu devolver a bola.",
          "ca": "Nombre de vegades que el competidor no va aconseguir retornar la pilota."}'
          ),
    (5, 1, 
        '{"en": "Winning Streak", "es": "Racha Ganadora", "fr": "Série de Victoires", "pt": "Sequência Vencedora", "ca": "Ratxa Guanyadora"}', 
        '{"en": "Longest consecutive points won by the competitor.", 
          "es": "Mayor cantidad de puntos consecutivos ganados por el competidor.", 
          "fr": "Plus grand nombre de points consécutifs gagnés par le compétiteur.", 
          "pt": "Maior quantidade de pontos consecutivos ganhos pelo competidor.",
          "ca": "Màxima quantitat de punts consecutius guanyats pel competidor."}'
          ),

    -- CATEGORÍA 2: Match Stats
    (6, 2, 
        '{"en": "Peak Ball Speed", "es": "Velocidad Máxima de la Pelota", "fr": "Vitesse Maximale de la Balle", "pt": "Velocidade Máxima da Bola", "ca": "Velocitat Màxima de la Pilota"}', 
        '{"en": "Highest speed reached by the ball during the match.", 
          "es": "Velocidad más alta alcanzada por la pelota durante el partido.", 
          "fr": "Vitesse la plus élevée atteinte par la balle pendant le match.", 
          "pt": "Velocidade mais alta alcançada pela bola durante a partida.",
          "ca": "Velocitat més alta assolida per la pilota durant el partit."}'
        ),
    (7, 2, 
        '{"en": "Max Rally Length", "es": "Longitud Máxima de Ráfaga", "fr": "Longueur Maximale du Rallye", "pt": "Comprimento Máximo de Troca", "ca": "Longitud Màxima de Ràfega"}', 
        '{"en": "Longest sequence of consecutive hits without a point being scored.", 
          "es": "Secuencia más larga de golpes consecutivos sin que se anote un punto.", 
          "fr": "Plus longue séquence de coups consécutifs sans qu''un point soit marqué.", 
          "pt": "Sequência mais longa de golpes consecutivos sem que um ponto seja marcado.",
          "ca": "Seqüència més llarga de cops consecutius sense que es marqui un punt."}'
        ),
    (8, 2, 
        '{"en": "Total Wall Bounces", "es": "Total de Rebotes en Paredes", "fr": "Total des Rebondissements sur les Murs", "pt": "Total de Rebotes nas Paredes", "ca": "Total de Rebotades a les Paretos"}', 
        '{"en": "Total number of times the ball bounced off walls during the match.", 
          "es": "Número total de veces que la pelota rebotó en las paredes durante el partido.", 
          "fr": "Nombre total de fois que la balle a rebondi sur les murs pendant le match.", 
          "pt": "Número total de vezes que a bola rebateu nas paredes durante a partida.",
          "ca": "Nombre total de vegades que la pilota va rebotar a les parets durant el partit."}'
          ),
    (9, 2, 
        '{"en": "Average Volley Duration", "es": "Duración Promedio del Volea", "fr": "Durée Moyenne des Volées", "pt": "Duração Média do Voleio", "ca": "Durada Mitjana del Volea"}', 
        '{"en": "Average time duration of volleys during the match.", 
          "es": "Tiempo promedio de duración de los voleas durante el partido.", 
          "fr": "Durée moyenne des volées pendant le match.", 
          "pt": "Tempo médio de duração dos voleios durante a partida.",
          "ca": "Temps mitjà de durada dels voleas durant el partit."}'
        ),
    (10, 2, 
        '{"en": "Net Touches", "es": "Toques en la Red", "fr": "Touches du Filet", "pt": "Toques na Rede", "ca": "Toques a la Xarxa"}', 
        '{"en": "Number of times the ball touched the net during play.", 
          "es": "Número de veces que la pelota tocó la red durante el juego.", 
          "fr": "Nombre de fois que la balle a touché le filet pendant le jeu.", 
          "pt": "Número de vezes que a bola tocou a rede durante o jogo.",
          "ca": "Nombre de vegades que la pilota va tocar la xarxa durant el joc."}'
          ),

    -- CATEGORÍA 3: Organization Stats
    (11, 3, 
        '{"en": "Total Org Wins", "es": "Total de Victorias de la Organización", "fr": "Total des Victoires de l''Organisation", "pt": "Total de Vitórias da Organização", "ca": "Total de Victòries de l''Organització"}', 
        '{"en": "Total number of wins by the organization across all matches.", 
          "es": "Número total de victorias de la organización en todos los partidos.", 
          "fr": "Nombre total de victoires de l''organisation dans tous les matchs.", 
          "pt": "Número total de vitórias da organização em todas as partidas.",
          "ca": "Nombre total de victòries de l''organització en tots els partits."}'
          ),
    (12, 3, 
        '{"en": "Member Participation Count", "es": "Conteo de Participación de Miembros", "fr": "Nombre de Participation des Membres", "pt": "Contagem de Participação de Membros", "ca": "Comptatge de Participació de Membres"}', 
        '{"en": "Number of unique members from the organization who participated in matches.", 
          "es": "Número de miembros únicos de la organización que participaron en partidos.", 
          "fr": "Nombre de membres uniques de l''organisation ayant participé aux matchs.", 
          "pt": "Número de membros únicos da organização que participaram em partidas.",
          "ca": "Nombre de membres únics de l''organització que van participar en partits."}'
          ),
    (13, 3, 
        '{"en": "Org Average Elo", "es": "Elo Promedio de la Organización", "fr": "Elo Moyen de l''Organisation", "pt": "Elo Médio da Organização", "ca": "Elo Mitjà de l''Organització"}', 
        '{"en": "Average Elo rating of all members in the organization.", 
          "es": "Calificación Elo promedio de todos los miembros de la organización.", 
          "fr": "Classement Elo moyen de tous les membres de l''organisation.", 
          "pt": "Classificação Elo média de todos os membros da organização.",
          "ca": "Classificació Elo mitjana de tots els membres de l''organització."}'
          ),
    (14, 3, 
        '{"en": "Total Tournament Trophies", "es": "Total de Trofeos en Torneos", "fr": "Total des Trophées en Tournois", "pt": "Total de Troféus em Torneios", "ca": "Total de Trofeus en Torneigs"}', 
        '{"en": "Total number of trophies won by the organization in tournaments.", 
          "es": "Número total de trofeos ganados por la organización en torneos.", 
          "fr": "Nombre total de trophées remportés par l''organisation dans les tournois.", 
          "pt": "Número total de troféus ganhos pela organização em torneios.",
          "ca": "Nombre total de trofeus guanyats per l''organització en tornejos."}'
          ),

    -- CATEGORÍA 4: Tournament Stats
    (15, 4, 
        '{"en": "Upsets Count", "es": "Conteo de Sorpresas", "fr": "Nombre d''Upsets", "pt": "Contagem de Surpresas", "ca": "Comptatge d''Upsets"}', 
        '{"en": "Number of matches where a lower-ranked competitor defeated a higher-ranked competitor.", 
          "es": "Número de partidos donde un competidor con menor clasificación derrotó a uno con mayor clasificación.", 
          "fr": "Nombre de matchs où un compétiteur moins bien classé a battu un compétiteur mieux classé.", 
          "pt": "Número de partidas onde um competidor com menor classificação derrotou um com maior classificação.",
          "ca": "Nombre de partits on un competidor amb menor classificació va derrotar un amb major classificació."}'
          ),
    (16, 4, 
        '{"en": "Average Match Margin", "es": "Margen Promedio del Partido", "fr": "Marge Moyenne du Match", "pt": "Margem Média da Partida", "ca": "Marge Mitjana del Partit"}', 
        '{"en": "Average point difference between competitors in matches.",
          "es": "Diferencia promedio de puntos entre competidores en los partidos.", 
          "fr": "Différence moyenne de points entre les compétiteurs dans les matchs.", 
          "pt": "Diferença média de pontos entre competidores nas partidas.",
          "ca": "Diferència mitjana de punts entre competidors en els partits."}'
          ),
    (17, 4, 
        '{"en": "Total Participants", "es": "Total de Participantes", "fr": "Total des Participants", "pt": "Total de Participantes", "ca": "Total de Participants"}', 
        '{"en": "Total number of participants in the tournament.",
          "es": "Número total de participantes en el torneo.",
          "fr": "Nombre total de participants au tournoi.", 
          "pt": "Número total de participantes no torneio.",
          "ca": "Nombre total de participants en el torneig."}'
          ),
    (18, 4, 
        '{"en": "Tournament Duration", "es": "Duración del Torneo", "fr": "Durée du Tournoi", "pt": "Duração do Torneio", "ca": "Durada del Torneig"}', 
        '{"en": "Total duration of the tournament from start to finish.", 
          "es": "Duración total del torneo desde el inicio hasta el final.",
          "fr": "Durée totale du tournoi du début à la fin.", 
          "pt": "Duração total do torneio desde o início até o final.",
          "ca": "Durada total del torneig des de l''inici fins al final."}'
          ),
    (19, 4, 
        '{"en": "Forfeit Count", "es": "Conteo de Forfaits", "fr": "Nombre d''Abandons", "pt": "Contagem de Desistências", "ca": "Comptatge de Forfets"}', 
        '{"en": "Number of matches forfeited by competitors in the tournament.", 
          "es": "Número de partidos forfeitados por competidores en el torneo.", 
          "fr": "Nombre de matchs abandonnés par les compétiteurs dans le tournoi.", 
          "pt": "Contagem de Desistências.",
          "ca": "Nombre de partits forfeitats per competidors en el torneig."}'
          ),
    -- CATEGORÍA 5: System Stats (pueden añadirse métricas adicionales aquí
    
    (20, 5, 
        '{"en": "Server Uptime", "es": "Tiempo de Actividad del Servidor", "fr": "Temps de Fonctionnement du Serveur", "pt": "Tempo de Atividade do Servidor", "ca": "Temps d''Activitat del Servidor"}', 
        '{"en": "Total time the server has been operational without interruptions.", 
          "es": "Tiempo total que el servidor ha estado operativo sin interrupciones.", 
          "fr": "Temps total pendant lequel le serveur a été opérationnel sans interruptions.", 
          "pt": "Tempo total que o servidor esteve operacional sem interrupções.",
          "ca": "Temps total que el servidor ha estat operatiu sense interrupcions."}'
          ),
    (21, 5,
        '{"en": "Request Rate per Session", "es": "Tasa de Solicitudes por Sesión", "fr": "Taux de Requêtes par Session", "pt": "Taxa de Solicitações por Sessão", "ca": "Taxa de Sol·licituds per Sessió"}', 
        '{"en": "Monitors if a user is trying to break the game by sending thousands of moves per second (Bot/Spam detection).", 
          "es": "Monitorea si un usuario está intentando romper el juego enviando miles de movimientos por segundo (detección de bots/spam).", 
          "fr": "Surveille si un utilisateur essaie de casser le jeu en envoyant des milliers de mouvements par seconde (détection de bot/spam).", 
          "pt": "Monitora se um usuário está tentando quebrar o jogo enviando milhares de movimentos por segundo (detecção de bot/spam).",
          "ca": "Monitora si un usuari està intentant trencar el joc enviant milers de moviments per segon (detecció de bot/spam)."}'
          ),
    (22, 5,
        '{"en": "Input Validation Failures", "es": "Fallos de Validación de Entrada", "fr": "Échecs de Validation des Entrées", "pt": "Falhas de Validação de Entrada", "ca": "Errors de Validació d''Entrada"}', 
        '{"en": "How many times a client sent prohibited data (e.g., moving the paddle off-screen). This demonstrates that your server validates and protects the game.", 
          "es": "Cuántas veces un cliente envió datos prohibidos (por ejemplo, mover la pala fuera de la pantalla). Esto demuestra que su servidor valida y protege el juego.", 
          "fr": "Combien de fois un client a envoyé des données interdites (par exemple, déplacer la raquette hors écran). Cela démontre que votre serveur valide et protège le jeu.", 
          "pt": "Quantas vezes um cliente enviou dados proibidos (por exemplo, mover a raquete para fora da tela). Isso demonstra que seu servidor valida e protege o jogo.",
          "ca": "Quantes vegades un client ha enviat dades prohibides (per exemple, moure la pala fora de la pantalla). Això demostra que el vostre servidor valida i protegeix el joc."}'
          ),
    (23, 5,
        '{"en": "Average Reconnection Time", "es": "Tiempo Promedio de Reconexión", "fr": "Temps Moyen de Reconnexion", "pt": "Tempo Médio de Reconexão", "ca": "Temps Mitjà de Reconnexió"}', 
        '{"en": "How long it takes for a player to return after a network drop. Measures the efficiency of your WebSocket reconnection system.", 
          "es": "Cuánto tiempo tarda un jugador en regresar después de una caída de red. Mide la eficiencia de su sistema de reconexión WebSocket.", 
          "fr": "Combien de temps il faut à un joueur pour revenir après une coupure réseau. Mesure l''efficacité de votre système de reconnexion WebSocket.", 
          "pt": "Quanto tempo leva para um jogador retornar após uma queda de rede. Mede a eficiência do seu sistema de reconexão WebSocket.",
          "ca": "Quant de temps triga un jugador a tornar després d''una caiguda de xarxa. Mesura l''eficiència del vostre sistema de reconnexió WebSocket."}'
          );



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


INSERT INTO MATCHMETRIC (mm_match_fk, mm_code_fk, mm_value)
SELECT 
    m.m_pk,
    metrics.id,
    -- Custom random logic for each specific metric type
    CASE 
        WHEN metrics.id = 6 THEN (random() * 60 + 40)      -- Peak Ball Speed (e.g., 40-100 km/h)
        WHEN metrics.id = 7 THEN floor(random() * 30 + 5)  -- Max Rally Length (e.g., 5-35 hits)
        WHEN metrics.id = 8 THEN floor(random() * 150 + 20) -- Total Wall Bounces
        WHEN metrics.id = 9 THEN (random() * 10 + 2)       -- Average Volley Duration (2-12 sec)
        WHEN metrics.id = 10 THEN floor(random() * 15)     -- Net Touches (0-15)
    END + (m.m_pk * 0) -- Fake dependency to force re-calculation per match
FROM MATCH m
CROSS JOIN (
    SELECT unnest(ARRAY[6, 7, 8, 9, 10]) AS id
) AS metrics;

