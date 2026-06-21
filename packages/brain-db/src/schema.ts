import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { Database } from "bun:sqlite";

export function openBrainDatabase(dbPath: string): Database {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.run("PRAGMA foreign_keys = ON");
  return db;
}

export function createBrainSchema(db: Database): void {
  db.run("PRAGMA foreign_keys = OFF");
  db.run("DROP TABLE IF EXISTS index_runs");
  db.run("DROP TABLE IF EXISTS search_fts");
  db.run("DROP TABLE IF EXISTS aliases");
  db.run("DROP TABLE IF EXISTS tags");
  db.run("DROP TABLE IF EXISTS links");
  db.run("DROP TABLE IF EXISTS headings");
  db.run("DROP TABLE IF EXISTS documents");
  db.run("PRAGMA foreign_keys = ON");

  db.run(`
    CREATE TABLE documents (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      collection TEXT NOT NULL,
      slug TEXT NOT NULL,
      file_path TEXT NOT NULL,
      extension TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      published_at TEXT NOT NULL,
      image TEXT,
      status TEXT NOT NULL,
      draft INTEGER NOT NULL,
      content TEXT NOT NULL,
      raw_content TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE headings (
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      depth INTEGER NOT NULL,
      slug TEXT NOT NULL,
      text TEXT NOT NULL,
      PRIMARY KEY (document_id, position)
    )
  `);

  db.run(`
    CREATE TABLE links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      to_document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
      kind TEXT NOT NULL,
      target TEXT NOT NULL,
      label TEXT,
      external INTEGER NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE tags (
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      tag TEXT NOT NULL,
      PRIMARY KEY (document_id, tag)
    )
  `);

  db.run(`
    CREATE TABLE aliases (
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      alias TEXT NOT NULL,
      PRIMARY KEY (document_id, alias)
    )
  `);

  db.run(`
    CREATE VIRTUAL TABLE search_fts USING fts5(
      document_id UNINDEXED,
      title,
      summary,
      content
    )
  `);

  db.run(`
    CREATE TABLE index_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      indexed_at TEXT NOT NULL,
      document_count INTEGER NOT NULL,
      link_count INTEGER NOT NULL
    )
  `);

  db.run("CREATE INDEX links_from_document_idx ON links(from_document_id)");
  db.run("CREATE INDEX links_to_document_idx ON links(to_document_id)");
  db.run("CREATE INDEX documents_slug_idx ON documents(collection, slug)");
}
