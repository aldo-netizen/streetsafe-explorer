CREATE TABLE IF NOT EXISTS samples (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  sample_id         TEXT UNIQUE NOT NULL,
  date              TEXT,
  city              TEXT,
  state             TEXT,
  assumed_substance TEXT,
  fentanyl          INTEGER NOT NULL DEFAULT 0,
  heroin            INTEGER NOT NULL DEFAULT 0,
  xylazine          INTEGER NOT NULL DEFAULT 0,
  medetomidine      INTEGER NOT NULL DEFAULT 0,
  acetaminophen     INTEGER NOT NULL DEFAULT 0,
  has_other         INTEGER NOT NULL DEFAULT 0,
  num_other         INTEGER NOT NULL DEFAULT 0,
  total_substances  INTEGER NOT NULL DEFAULT 0,
  appearance        TEXT,
  method            TEXT,
  spectra_url       TEXT,
  scraped_at        TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS detected_substances (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  sample_id   TEXT NOT NULL REFERENCES samples(sample_id),
  substance   TEXT NOT NULL,
  abundance   TEXT,
  peak        REAL,
  source      TEXT NOT NULL DEFAULT 'csv'
);

CREATE INDEX IF NOT EXISTS idx_samples_date ON samples(date);
CREATE INDEX IF NOT EXISTS idx_samples_city ON samples(city);
CREATE INDEX IF NOT EXISTS idx_samples_state ON samples(state);
CREATE INDEX IF NOT EXISTS idx_samples_fentanyl ON samples(fentanyl);
CREATE INDEX IF NOT EXISTS idx_samples_sample_id ON samples(sample_id);
CREATE INDEX IF NOT EXISTS idx_detected_substance ON detected_substances(substance);
CREATE INDEX IF NOT EXISTS idx_detected_sample_id ON detected_substances(sample_id);
