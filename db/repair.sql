-- Repair save corrupted by the stale-S.date bug:
--   remove the bogus perfect-day on 2026-08-17,
--   move date/lastPerfect to the real game day, mark 2026-09-04 as the perfect day.
-- 'week' is intentionally left stale so the fixed rollover() resets weekly tasks naturally.
UPDATE saves
SET data = json_set(
      json_remove(data, '$.history."2026-08-17"'),
      '$.date',                    '2026-09-04',
      '$.lastPerfect',             '2026-09-04',
      '$.history."2026-09-04"',    json('true')
    ),
    updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
WHERE id = 'sean';
