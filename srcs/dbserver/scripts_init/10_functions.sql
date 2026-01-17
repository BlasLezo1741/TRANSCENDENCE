-- Function to get active friends of a player
CREATE OR REPLACE FUNCTION get_player_friends(target_p_pk INTEGER)
RETURNS TABLE (
    friend_nick VARCHAR(255),
    friend_lang CHAR(2),
    friendship_since TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Determinamos quién es el amigo (si p1 o p2) basándonos en el target_p_pk
        CASE 
            WHEN p1.p_pk = target_p_pk THEN p2.p_nick 
            ELSE p1.p_nick 
        END AS friend_nick,
        CASE 
            WHEN p1.p_pk = target_p_pk THEN p2.p_lang 
            ELSE p1.p_lang 
        END AS friend_lang,
        active_friends.f_date
    FROM (
        -- Subconsulta para encontrar el estado más reciente de cada pareja
        SELECT f_1, f_2, f_type, f_date,
               ROW_NUMBER() OVER(PARTITION BY f_1, f_2 ORDER BY f_date DESC) as last_event
        FROM PLAYER_FRIEND
        WHERE f_1 = target_p_pk OR f_2 = target_p_pk -- Filtramos por el jugador antes de calcular
    ) active_friends
    JOIN PLAYER p1 ON active_friends.f_1 = p1.p_pk
    JOIN PLAYER p2 ON active_friends.f_2 = p2.p_pk
    WHERE active_friends.last_event = 1 
      AND active_friends.f_type = true;
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