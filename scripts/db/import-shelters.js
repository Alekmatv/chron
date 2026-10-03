/**
 * Imports the national shelter dataset (punkty_schronienia.csv) into the database.
 *
 * Usage: npm run db:import -- <path-to-csv>   (reads DATABASE_URL from .env)
 *
 * Creates the schema if needed, replaces all shelter rows and records the build
 * in data_builds. Operational attributes missing from the dataset are generated
 * deterministically, so running the import twice produces the same data.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sql } from '../../server/db.js';
import { AVAILABILITY_CODES, buildShelterAttributes, buildVersion } from '../../server/shelterAttributes.js';

/** Rows per INSERT statement: keeps every request well below the parameter limit. */
const BATCH_SIZE = 1000;

/** Columns written for each shelter, in INSERT order. */
const COLUMNS = [
  'id',
  'name',
  'kind',
  'gmina',
  'powiat',
  'voivodeship',
  'lat',
  'lng',
  'address',
  'availability',
  'opening_hours',
  'underground',
  'floors',
  'filtered',
  'elevated',
  'alarm_confirmed',
];

/**
 * Parses CSV text into rows of fields. Supports quoted fields with commas,
 * escaped quotes ("") and line breaks inside quotes.
 * @param {string} text
 * @returns {string[][]}
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field || row.length) rows.push([...row, field]);
  return rows;
}

/**
 * Converts one dataset record into a database row.
 * Returns null for records without valid coordinates.
 * @param {Record<string, string>} record CSV record keyed by header
 */
function toShelterRow(record) {
  const lat = Number(record['Szerokosc geograficzna']);
  const lng = Number(record['Dlugosc geograficzna']);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) return null;

  const id = record['Identyfikator publiczny'];
  const availability = AVAILABILITY_CODES[record['Dostepnosc']] || 'on_request';
  const attributes = buildShelterAttributes(id, availability);
  return [
    id,
    record['Nazwa'],
    record['Rodzaj obiektu'],
    record['Gmina'] || null,
    record['Powiat'] || null,
    record['Wojewodztwo'] || null,
    lat,
    lng,
    record['Adres'] || null,
    availability,
    attributes.openingHours,
    attributes.underground,
    attributes.floors,
    attributes.filtered,
    attributes.elevated,
    attributes.alarmConfirmed,
  ];
}

/** Inserts a batch of rows with a single parameterized multi-row INSERT. */
async function insertBatch(rows) {
  const values = rows
    .map(
      (row, rowIndex) =>
        '(' + row.map((_, colIndex) => '$' + (rowIndex * COLUMNS.length + colIndex + 1)).join(', ') + ')',
    )
    .join(', ');
  await sql.query(
    `INSERT INTO shelters (${COLUMNS.join(', ')}) VALUES ${values} ON CONFLICT (id) DO NOTHING`,
    rows.flat(),
  );
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('Usage: npm run db:import -- <path-to-csv>');
    process.exit(1);
  }

  // Strip the UTF-8 byte order mark that precedes the header in the dataset.
  const [header, ...records] = parseCsv(readFileSync(csvPath, 'utf8').replace(/^﻿/, ''));
  const rows = records
    .map((fields) => toShelterRow(Object.fromEntries(header.map((name, i) => [name, fields[i]]))))
    .filter(Boolean);
  console.log(`Parsed ${records.length} records, ${rows.length} with valid coordinates.`);

  const schema = readFileSync(fileURLToPath(new URL('./schema.sql', import.meta.url)), 'utf8');
  for (const statement of schema.split(';').filter((part) => part.replace(/--.*$/gm, '').trim())) {
    await sql.query(statement);
  }
  await sql`TRUNCATE shelters`;

  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    await insertBatch(rows.slice(start, start + BATCH_SIZE));
    process.stdout.write(`\rInserted ${Math.min(start + BATCH_SIZE, rows.length)} / ${rows.length}`);
  }

  await sql`
    INSERT INTO data_builds (version, kind, shelters_count, changed_count)
    VALUES (${buildVersion()}, 'import', ${rows.length}, ${rows.length})`;
  console.log('\nImport finished.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
