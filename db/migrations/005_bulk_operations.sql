-- 005_bulk_operations.sql
-- Adding N players one at a time re-sorted the whole start list on every
-- insert (O(n^2)). This adds a no-sync variant so a bulk add can insert all
-- of them and renumber exactly once.

CREATE OR REPLACE PROCEDURE admin_add_to_tournament_nosync(
    p_tour_id INT, p_player_id VARCHAR(50)
)
LANGUAGE plpgsql AS $$
DECLARE
    v_rating_type VARCHAR(50);
BEGIN
    SELECT rating_type_id INTO v_rating_type FROM tournaments WHERE id = p_tour_id;
    INSERT INTO tournament_participants (tournament_id, player_id,
                                         rating_at_tournament, club)
    SELECT p_tour_id, p_player_id,
           CASE v_rating_type
               WHEN 'Rapid' THEN rating_rapid
               WHEN 'Blitz' THEN rating_blitz
               ELSE rating_classic
           END,
           club
    FROM players WHERE id = p_player_id;
END;
$$;


-- Deleting a player must never silently erase tournament history: the
-- cascades on tournament_participants and standings_history would take
-- results with them. Callers check this first.
CREATE OR REPLACE FUNCTION player_has_history(p_player_id VARCHAR(50))
RETURNS BOOLEAN
LANGUAGE sql STABLE AS $$
    SELECT EXISTS (SELECT 1 FROM tournament_participants WHERE player_id = p_player_id)
        OR EXISTS (SELECT 1 FROM pairings
                   WHERE white_player_id = p_player_id
                      OR black_player_id = p_player_id)
        OR EXISTS (SELECT 1 FROM rating_history WHERE player_id = p_player_id);
$$;
