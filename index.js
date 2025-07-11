const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// افتح قاعدة البيانات (أو أنشئها تلقائيّاً في ملف progress.db)
const dbPath = path.join(__dirname, 'progress.db');
const db = new sqlite3.Database(dbPath, err => {
  if (err) return console.error(err.message);
  console.log('Connected to SQLite database.');
});

// أنشئ جدول المستخدمين إن لم يكن موجوداً
db.run(`
  CREATE TABLE IF NOT EXISTS user_progress (
    userId TEXT PRIMARY KEY,
    stage INTEGER NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// ميدّل وير
app.use(cors({ origin: '*' })); // عدّل '*' إلى دومين موقعك لو أردت تشديد الأمان
app.use(bodyParser.json());

// حفظ أو تحديث مرحلة المستخدم
app.post('/progress', (req, res) => {
  const { userId, stage } = req.body;
  if (!userId || typeof stage !== 'number') {
    return res.status(400).json({ error: 'userId و stage مطلوبان' });
  }
  const stmt = db.prepare(`
    INSERT INTO user_progress (userId, stage)
    VALUES (?, ?)
    ON CONFLICT(userId) DO UPDATE SET
      stage = excluded.stage,
      updated_at = CURRENT_TIMESTAMP
  `);
  stmt.run(userId, stage, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, userId, stage });
  });
  stmt.finalize();
});

// استرجاع مرحلة المستخدم
app.get('/progress/:userId', (req, res) => {
  const userId = req.params.userId;
  db.get(
    `SELECT stage FROM user_progress WHERE userId = ?`,
    [userId],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.json({ stage: 0 }); // افتراضيّاً 0 إذا لم يُسجّل المستخدم
      res.json({ stage: row.stage });
    }
  );
});

// بدء الخادم
app.listen(PORT, () => {
  console.log(`Progress service running on port ${PORT}`);
});
