-- Function to get active friends of a player
CREATE OR REPLACE FUNCTION get_player_friends(target_p_pk INTEGER)
RETURNS TABLE (
    friend_id INTEGER,
    friend_nick VARCHAR(255),
    friend_lang VARCHAR(255),
    friendship_since TIMESTAMP
) AS $$
DECLARE
    STATUS_ACCEPTED CONSTANT smallint := 2;
BEGIN
    RETURN QUERY
    SELECT 
        -- ID del amigo
        CASE 
            WHEN p1.p_pk = target_p_pk THEN p2.p_pk 
            ELSE p1.p_pk 
        END AS friend_id,
        
        -- Nick del amigo
        CASE 
            WHEN p1.p_pk = target_p_pk THEN p2.p_nick 
            ELSE p1.p_nick 
        END AS friend_nick,

        -- ✅ CORRECCIÓN: Usamos lang_name que es el correcto
        l.lang_name::varchar AS friend_lang, 

        active_friends.f_date
    FROM (
        SELECT f_1, f_2, f_status_fk, f_date,
               ROW_NUMBER() OVER(PARTITION BY 
                   LEAST(f_1, f_2), GREATEST(f_1, f_2) 
                   ORDER BY f_date DESC) as last_event
        FROM PLAYER_FRIEND
        WHERE f_1 = target_p_pk OR f_2 = target_p_pk 
    ) active_friends
    JOIN PLAYER p1 ON active_friends.f_1 = p1.p_pk
    JOIN PLAYER p2 ON active_friends.f_2 = p2.p_pk
    
    LEFT JOIN P_LANGUAGE l ON l.lang_pk = (
        CASE 
            WHEN p1.p_pk = target_p_pk THEN p2.p_lang 
            ELSE p1.p_lang 
        END
    )
    
    WHERE active_friends.last_event = 1 
      AND active_friends.f_status_fk = STATUS_ACCEPTED;
END;
$$ LANGUAGE plpgsql;

-- Función para registrar una partida completa respetando las tablas de métricas
CREATE OR REPLACE FUNCTION insert_full_match_result(
    p_mode_id SMALLINT,      -- ID del modo (ej: 2 para '1v1_remote')
    p_date TIMESTAMP,        -- Fecha inicio
    p_duration_ms INTEGER,   -- Duración en ms
    p_winner_id INTEGER,     -- ID del ganador
    p_p1_id INTEGER,         -- ID Jugador 1
    p_score_p1 FLOAT,        -- Puntuación Jugador 1
    p_p2_id INTEGER,         -- ID Jugador 2
    p_score_p2 FLOAT,        -- Puntuación Jugador 2
    p_total_hits FLOAT       -- Golpes totales del partido
)
RETURNS INTEGER AS $$
DECLARE
    v_match_id INTEGER;
    v_duration INTERVAL;

    
    -- ⚠️ AJUSTA ESTOS IDs SEGÚN TU TABLA METRIC ⚠️
    METRIC_ID_SCORE CONSTANT SMALLINT := 1;      -- ID de la métrica 'Score'
    METRIC_ID_TOTAL_HITS CONSTANT SMALLINT := 10; -- ID de la métrica 'TotalHits'
BEGIN
    -- 1. Convertir duración
    v_duration := (p_duration_ms || ' milliseconds')::INTERVAL;

    -- 2. Insertar la Partida (MATCH)
    INSERT INTO MATCH (m_date, m_duration, m_mode_fk, m_winner_fk)
    VALUES (p_date, v_duration, p_mode_id, p_winner_id)
    RETURNING m_pk INTO v_match_id;

    -- 3. Crear los Competidores (COMPETITOR)
    INSERT INTO COMPETITOR (mc_match_fk, mc_player_fk) VALUES (v_match_id, p_p1_id);
    INSERT INTO COMPETITOR (mc_match_fk, mc_player_fk) VALUES (v_match_id, p_p2_id);

    -- 4. Insertar Métricas de Jugador (COMPETITORMETRIC -> Score)
    -- Score Player 1
    INSERT INTO COMPETITORMETRIC (mcm_match_fk, mcm_player_fk, mcm_metric_fk, mcm_value)
    VALUES (v_match_id, p_p1_id, METRIC_ID_SCORE, p_score_p1);
    
    -- Score Player 2
    INSERT INTO COMPETITORMETRIC (mcm_match_fk, mcm_player_fk, mcm_metric_fk, mcm_value)
    VALUES (v_match_id, p_p2_id, METRIC_ID_SCORE, p_score_p2);

    -- 5. Insertar Métricas de Partido (MATCHMETRIC -> Total Hits)
    INSERT INTO MATCHMETRIC (mm_match_fk, mm_code_fk, mm_value)
    VALUES (v_match_id, METRIC_ID_TOTAL_HITS, p_total_hits);

    RETURN v_match_id;
END;

$$ LANGUAGE plpgsql;

-- Function to count the number of victories for a given player/team
CREATE OR REPLACE FUNCTION get_victories_count(p_pk INTEGER)
RETURNS INTEGER
AS $$
DECLARE
    v_victories INTEGER;
BEGIN
    SELECT COUNT(m_pk) 
    INTO v_victories
    FROM match 
    WHERE m_winner_fk = p_pk;
    
    RETURN v_victories;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT get_victories_count(1);
-- SELECT get_victories_count(42);

-- Function to count the number of matches played by a given player
CREATE OR REPLACE FUNCTION get_matches_played(p_player_id INTEGER)
RETURNS INTEGER

AS $$
DECLARE
    v_matches_played INTEGER;
BEGIN
    SELECT COUNT(DISTINCT mcm_match_fk)
    INTO v_matches_played
    FROM competitormetric  -- Replace with your actual table name
    WHERE mcm_player_fk = p_player_id;
    
    RETURN v_matches_played;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT get_matches_played(22);  -- Returns number of matches for player 22
-- SELECT get_matches_played(43);  -- Returns number of matches for player 43
-- SELECT get_matches_played(999); -- Returns 0 if player doesn't exist


-- Function to get complete win/loss record as a custom type
-- First, create a custom type to return multiple values
DROP TYPE IF EXISTS player_record CASCADE;
CREATE TYPE player_record AS (
    wins INTEGER,
    losses INTEGER,
    draws INTEGER,
    total_matches INTEGER
);


-- Match scores is a temporary table from competitormetric that filters only 
-- metrics with code 1 (Points scored)
--mcm_match_fk	mcm_player_fk  score
--1             22             863
--1             43             5351
--2             15             549
--2             55             2717
--3             87             4832
--3             12             4249
--4             13             3357
--4             84             5150
--5             48             4294

-- then joins such table with it self where match code is the same
-- and player code is differente
--        ON ms1.mcm_match_fk = ms2.mcm_match_fk 
--        AND ms1.mcm_player_fk != ms2.mcm_player_fk.
-- that returns two rows by match
-- mcm_match_fk	player_id	player_score	opponent_id	  opponent_score result
-- 1            22          863             43            5351           LOSS
-- 1            43          5351            22            863            WIN
-- 2            15          549             55            2717           LOSS
-- 2            55          2717            15            549            WIN
-- 3            87          4832            12            4249           WIN
-- 3            12          4249            87            4832           LOSS
-- but filtered by the player id we want calculate statisics for.
--        WHERE ms1.mcm_player_fk = p_player_id
--
-- Finally counts how many rows of each type exists.

-- Function that returns all stats at once
CREATE OR REPLACE FUNCTION get_player_record(p_player_id INTEGER)
RETURNS player_record

AS $$
DECLARE
    v_record player_record;
BEGIN
    WITH match_scores AS (
        SELECT 
            mcm_match_fk,
            mcm_player_fk,
            mcm_value AS score
        FROM competitormetric
        WHERE mcm_metric_fk = 1
    ),
    match_results AS (
        SELECT 
            ms1.mcm_player_fk AS player_id,
            CASE 
                WHEN ms1.score > ms2.score THEN 'WIN'
                WHEN ms1.score < ms2.score THEN 'LOSS'
                ELSE 'DRAW'
            END AS result
        FROM match_scores ms1
        JOIN match_scores ms2 
            ON ms1.mcm_match_fk = ms2.mcm_match_fk 
            AND ms1.mcm_player_fk != ms2.mcm_player_fk
        WHERE ms1.mcm_player_fk = p_player_id
    )
    SELECT 
        COALESCE(COUNT(CASE WHEN result = 'WIN' THEN 1 END), 0),
        COALESCE(COUNT(CASE WHEN result = 'LOSS' THEN 1 END), 0),
        COALESCE(COUNT(CASE WHEN result = 'DRAW' THEN 1 END), 0),
        COALESCE(COUNT(*), 0)
    INTO v_record.wins, v_record.losses, v_record.draws, v_record.total_matches
    FROM match_results;
    
    RETURN v_record;
END;
$$ LANGUAGE plpgsql;


-- Example usage:
-- Get wins only:
-- SELECT get_player_wins(22);

-- Get losses only:
-- SELECT get_player_losses(43);

-- Get complete record:
-- SELECT * FROM get_player_record(22);
-- SELECT (get_player_record(22)).*;
-- SELECT wins, losses FROM get_player_record(22);


CREATE OR REPLACE FUNCTION anonymize_player_by_id(player_id INTEGER)
RETURNS void AS $$
DECLARE
    current_unix_timestamp BIGINT;
BEGIN
    current_unix_timestamp := EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT;
    
    UPDATE PLAYER
    SET
        p_nick = 'Legacy_' || current_unix_timestamp,
        p_mail = 'deleted_' || p_pk || '@legacy.local',
        p_pass = NULL,
        p_totp_secret = NULL,
        p_totp_enabled = FALSE,
        p_totp_enabled_at = NULL,
        p_totp_backup_codes = NULL,
        p_oauth_provider = NULL,
        p_oauth_id = NULL,
        p_avatar_url = NULL,
        p_profile_complete = FALSE,
        p_reg = NULL,
        p_bir = NULL,
        p_lang = NULL,
        p_country = NULL,
        p_role = 1,
        p_status = 1
    WHERE p_pk = player_id;
    DELETE FROM player_friend WHERE f_1 = player_id;
    DELETE FROM player_friend WHERE f_2 = player_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get the Top N players by victories
CREATE OR REPLACE FUNCTION get_leaderboard(limit_rows INTEGER DEFAULT 10)
RETURNS TABLE (
    player_id INTEGER,
    nick VARCHAR(255),
    avatar_url VARCHAR(500),
    wins BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.p_pk AS player_id,
        p.p_nick AS nick,
        p.p_avatar_url AS avatar_url,
        COUNT(m.m_pk) AS wins
    FROM player p
    JOIN match m ON p.p_pk = m.m_winner_fk
    GROUP BY p.p_pk, p.p_nick, p.p_avatar_url
    ORDER BY wins DESC, p.p_pk ASC
    LIMIT limit_rows;
END;
$$ LANGUAGE plpgsql;