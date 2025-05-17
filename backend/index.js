
import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bodyParser from 'body-parser';

const app = express();
const PORT = 8000;

app.use(cors());
app.use(bodyParser.json());

let db;

async function initDB() {
  db = await open({
    filename: './data.db',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      machine_id TEXT,
      platform TEXT,
      disk_encryption BOOLEAN,
      antivirus_status TEXT,
      sleep_timeout TEXT,
      os_update_status TEXT,
      timestamp DATETIME
    )
  `);
}

app.post('/report', async (req, res) => {
  const {
    machine_id,
    platform,
    disk_encryption,
    antivirus_status,
    sleep_timeout,
    os_update,
    timestamp
  } = req.body;

  const os_update_status = typeof os_update === 'object' ? os_update.status : os_update;

  await db.run(
    `INSERT INTO reports (
      machine_id, platform, disk_encryption, antivirus_status,
      sleep_timeout, os_update_status, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      machine_id,
      platform,
      disk_encryption ? 1 : 0,
      antivirus_status,
      sleep_timeout,
      os_update_status,
      timestamp
    ]
  );

  res.json({ status: 'success' });
});

app.get('/reports', async (req, res) => {
  const results = await db.all(`
    SELECT
      machine_id,
      platform,
      disk_encryption,
      antivirus_status,
      sleep_timeout,
      os_update_status,
      MAX(timestamp) as last_checkin
    FROM reports
    GROUP BY machine_id
  `);

  res.json(results);
});

app.get('/history', async (req, res) => {
  const results = await db.all(`
    SELECT * FROM reports ORDER BY timestamp DESC
  `);

  res.json(results);
});

initDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
});
