-- Generate 100 Players
INSERT INTO PLAYER (
    p_nick, 
    p_mail, 
    p_pass, 
    p_totp_secret,
    p_totp_enable,
    p_totp_enabled_at,
    p_totp_backup_codes,
    p_reg, 
    p_bir, 
    p_lang, 
    p_country, 
    p_role, 
    p_status
)
SELECT 
    'user_' || i,
    'user_' || i || '@example.com',
    md5(random()::text),
    -- Todos los campos 2FA dependen de has_totp
    CASE 
        WHEN has_totp THEN decode(md5(random()::text), 'hex')
        ELSE NULL 
    END,
    has_totp,
    CASE 
        WHEN has_totp THEN NOW() - (random() * INTERVAL '365 days')
        ELSE NULL 
    END,
    CASE 
        WHEN has_totp THEN 
            ARRAY[
                substr(md5(random()::text), 1, 8),
                substr(md5(random()::text), 1, 8),
                substr(md5(random()::text), 1, 8),
                substr(md5(random()::text), 1, 8),
                substr(md5(random()::text), 1, 8),
                substr(md5(random()::text), 1, 8),
                substr(md5(random()::text), 1, 8),
                substr(md5(random()::text), 1, 8)
            ]
        ELSE NULL 
    END,
    NOW() - (random() * INTERVAL '365 days'),
    '1990-01-01'::date + (random() * 7000)::integer,
    rand_lang.lang_pk,
    rand_coun.coun2_pk,
    rand_role.role_pk,
    rand_stat.status_pk
FROM generate_series(1, 100) s(i)
-- Determinar si el usuario tiene 2FA (30% de probabilidad)
CROSS JOIN LATERAL (
    SELECT (random() < 0.3) as has_totp
) totp_flag
CROSS JOIN LATERAL (
    SELECT lang_pk 
    FROM P_LANGUAGE 
    WHERE i > 0
    ORDER BY random() 
    LIMIT 1
) rand_lang
CROSS JOIN LATERAL (
    SELECT coun2_pk 
    FROM COUNTRY 
    WHERE i > 0
    ORDER BY random() 
    LIMIT 1
) rand_coun
CROSS JOIN LATERAL (
    SELECT role_pk 
    FROM P_ROLE 
    WHERE i > 0
    ORDER BY random() 
    LIMIT 1
) rand_role
CROSS JOIN LATERAL (
    SELECT status_pk 
    FROM STATUS
    WHERE i > 0
    ORDER BY random() 
    LIMIT 1
) rand_stat;

-- Generate 50 Matches
INSERT INTO MATCH (m_date, m_duration, m_mode_fk, m_winner_fk)
SELECT 
    NOW() - (random() * INTERVAL '30 days'),
    (random() * 3600 || ' seconds')::interval,
    (SELECT mmod_pk FROM MATCH_MODE WHERE i > 0 ORDER BY random() LIMIT 1),
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

-- Assign 5 match metrics to each Match
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

-- Assign 5 competitor metrics to each Competitor
INSERT INTO COMPETITORMETRIC (mcm_match_fk, mcm_player_fk, mcm_metric_fk, mcm_value)
SELECT 
    c.mc_match_fk,
    c.mc_player_fk,
    m.metric_id,
    -- Logic to generate realistic values for the first 5 metrics
    CASE 
        WHEN m.metric_id = 1 THEN floor(random() * 5000 + 500)  -- Score (500-5500)
        WHEN m.metric_id = 2 THEN floor(random() * 40)         -- Kills (0-40)
        WHEN m.metric_id = 3 THEN floor(random() * 25)         -- Deaths (0-25)
        WHEN m.metric_id = 4 THEN floor(random() * 15)         -- Assists (0-15)
        WHEN m.metric_id = 5 THEN (random() * 100)             -- Accuracy (0-100%)
    END 
    -- Adding 0 multiplied by foreign keys forces the optimizer to re-calculate 
    -- random() for every unique player-match combination.
    + (c.mc_match_fk * 0) + (c.mc_player_fk * 0) 
FROM COMPETITOR c
CROSS JOIN (
    SELECT unnest(ARRAY[1, 2, 3, 4, 5]) AS metric_id
) m;


-- -----------------Assign Players to Organizations (15% chance per organization)
INSERT INTO PLAYER_ORGANIZATION (po_p_fk, po_org_fk)
SELECT 
    p.p_pk,
    o.org_pk
FROM PLAYER p
CROSS JOIN ORGANIZATION o
WHERE random() < 0.15; -- Each player has a 15% chance to belong to any given organization
-- 1. The Cartesian Product (CROSS JOIN) 
-- The query starts by performing a CROSS JOIN between PLAYER (100 rows) and ORGANIZATION (5 rows). 
-- This creates a temporary result set of 500 possible combinations (every player paired with every organization).
--
-- 2. The Random Filter (WHERE random() < 0.15) 
-- For every one of those 500 possible pairs, PostgreSQL executes the random() function, 
-- which returns a value between 0.0 and 1.0.
--
-- If the random number is less than 0.15, the pair is kept and inserted into the table.
-- If the random number is higher, the pair is discarded.
--
-- 3. The Statistical Result Statistically, this results in:
--
-- Total Records: Approximately 75 total assignments (500×0.15).
-- Player Distribution: Most players will have 1 organization, 
-- some will have 0 (Free Agents), and a small handful might have 2 or 3.


-- ------------- Generate Player Friendships
-- Constraint 1: No duplicate friendships (i.e., if (A, B) exists, (B, A) cannot exist)
-- Constraint 2: f_type is true at the beginning (active friendship)
-- Constraint 3: 20% of friendships break over time (f_type becomes false)
INSERT INTO PLAYER_FRIEND (f_1, f_2, f_date, f_type)
SELECT 
    p1.p_pk,
    p2.p_pk,
    NOW() - (random() * INTERVAL '100 days'),
    true -- Constraint 2: Always true at the beginning
FROM PLAYER p1
JOIN PLAYER p2 ON p1.p_pk < p2.p_pk -- Constraint 1: Prevents (45, 23) if (23, 45) exists
WHERE random() < 0.05               -- Probability of a friendship forming
LIMIT 200;

INSERT INTO PLAYER_FRIEND (f_1, f_2, f_date, f_type)
SELECT 
    f_1, 
    f_2, 
    -- The friendship breaks between 1 and 30 days after it started
    f_date + (random() * INTERVAL '30 days' + INTERVAL '1 day'), 
    false -- Marks the relationship as broken
FROM PLAYER_FRIEND
WHERE f_type = true -- Only break existing active friendships
ORDER BY random()
LIMIT (SELECT count(*) * 0.2 FROM PLAYER_FRIEND WHERE f_type = true);
