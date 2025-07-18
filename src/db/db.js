const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Electron's app module might not be available yet if required too early
const isElectron = process.versions.electron !== undefined;

let userDataPath;
if (isElectron) {
  const { app } = require('electron');
  userDataPath = app.getPath('userData');
} else {
  // fallback for dev mode
  userDataPath = path.join(__dirname, '../../db');
}

// Make sure the directory exists
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}

const dbFileName = 'brain.db';
const dbPath = path.join(userDataPath, dbFileName);

// If DB file doesn't exist in userData, copy it from the source
const packagedDbPath = path.join(__dirname, '../../db', dbFileName);
if (!fs.existsSync(dbPath) && fs.existsSync(packagedDbPath)) {
  fs.copyFileSync(packagedDbPath, dbPath);
}

// Connect to SQLite
const db = new Database(dbPath);

// Initialize schema if not already
db.prepare(`
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();


module.exports = {
  db,
  dbPath
};