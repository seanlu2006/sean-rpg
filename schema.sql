-- SEAN: Self-Funded 存檔表(D1)
CREATE TABLE IF NOT EXISTS saves (
  id         TEXT PRIMARY KEY,   -- 單人面板固定 'sean'
  data       TEXT NOT NULL,      -- 整份存檔的 JSON 字串
  updated_at TEXT NOT NULL       -- ISO 時間,方便之後做衝突偵測
);
