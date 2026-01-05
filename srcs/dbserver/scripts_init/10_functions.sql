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