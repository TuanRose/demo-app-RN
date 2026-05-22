import { open, type DB } from '@op-engineering/op-sqlite';
import { MIGRATIONS } from './migrations';

let _db: DB | null = null;

export function getDb(): DB {
  if (!_db) {
    _db = open({ name: 'fintrack.db' });
    initializeDb(_db);
  }
  return _db;
}

function initializeDb(db: DB): void {
  // WAL mode: concurrent reads không block nhau — quan trọng khi TanStack Query
  // fetch trên background thread trong khi user đang navigate
  db.executeSync('PRAGMA journal_mode=WAL;');
  db.executeSync('PRAGMA foreign_keys=ON;');
  // NORMAL: flush WAL đến disk ít thường xuyên hơn FULL — nhanh hơn, vẫn safe
  db.executeSync('PRAGMA synchronous=NORMAL;');

  runMigrations(db);
}

function runMigrations(db: DB): void {
  db.executeSync(
    'CREATE TABLE IF NOT EXISTS _schema_version (version INTEGER NOT NULL)',
  );

  const { rows } = db.executeSync(
    'SELECT version FROM _schema_version LIMIT 1',
  );
  const currentVersion: number = (rows[0]?.version as number) ?? 0;

  for (let i = currentVersion; i < MIGRATIONS.length; i++) {
    // transaction callback phải async theo op-sqlite v15 API
    db.transaction(async tx => {
      await tx.execute(MIGRATIONS[i]);
      if (currentVersion === 0 && i === 0) {
        await tx.execute('INSERT INTO _schema_version (version) VALUES (?)', [i + 1]);
      } else {
        await tx.execute('UPDATE _schema_version SET version = ?', [i + 1]);
      }
    });
  }
}
