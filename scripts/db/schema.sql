-- Database schema for CHROŃ.
-- Safe to run repeatedly: every object is created only if it does not exist yet.

-- Civil protection shelters imported from the national dataset (punkty_schronienia.csv).
CREATE TABLE IF NOT EXISTS shelters (
  id               text PRIMARY KEY,          -- public identifier from the dataset, e.g. OZO-6D94271C9708
  name             text NOT NULL,
  kind             text NOT NULL,             -- object type from the dataset
  gmina            text,
  powiat           text,
  voivodeship      text,
  lat              double precision NOT NULL,
  lng              double precision NOT NULL,
  address          text,
  availability     text NOT NULL,             -- '24h' | 'hours' | 'on_request'
  opening_hours    text,                      -- e.g. '08:00–20:00', only for availability = 'hours'
  underground      boolean NOT NULL,          -- below ground level: protects from air threats, unsafe during floods
  floors           smallint NOT NULL,         -- number of floors above ground
  filtered         boolean NOT NULL,          -- has filter ventilation: protects from chemical contamination
  elevated         boolean NOT NULL,          -- located on high ground: safe during floods
  alarm_confirmed  boolean NOT NULL,          -- opening after an alarm is confirmed by the operator
  hours_updated_at timestamptz NOT NULL DEFAULT now()
);

-- Nearest-shelter queries filter by a bounding box first.
CREATE INDEX IF NOT EXISTS shelters_lat_lng_idx ON shelters (lat, lng);

-- History of database builds: the initial import and every nightly update.
CREATE TABLE IF NOT EXISTS data_builds (
  id             serial PRIMARY KEY,
  version        text NOT NULL,               -- e.g. v2026.10.04
  built_at       timestamptz NOT NULL DEFAULT now(),
  kind           text NOT NULL,               -- 'import' | 'nightly'
  shelters_count integer NOT NULL,
  changed_count  integer NOT NULL
);
