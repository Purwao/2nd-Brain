const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { db, dbPath } = require('./db/db');
const fs= require('fs');
const { url } = require('url');

let win;


let classifier = null;
let pipeline = null;



async function setupClassifier() {
  try {
    const transformers = await import('@xenova/transformers');
    pipeline = transformers.pipeline;
    classifier = await pipeline('zero-shot-classification', 'Xenova/nli-deberta-v3-xsmall');
    console.log("✅ Xenova model loaded.");
  } catch (err) {
    console.error("❌ Error loading model:", err);
  }
}

ipcMain.handle('classify-tags', async (event, text) => {
  try {
    if (!classifier) await setupClassifier();

    const categories = {
      // Core life/productivity areas
      "task": ["todo", "reminder", "errand", "checklist", "to-do", "action", "follow-up", "pending"],
      "note": ["note", "quick note", "log", "capture", "notepad", "brain dump"],
      "journal": ["journal", "diary", "reflection", "gratitude", "emotion", "entry", "mood"],
      "work": ["project", "meeting", "office", "work", "colleague", "deadline", "job", "agenda"],
      "personal": ["habit", "routine", "goals", "self", "growth", "improvement", "balance", "discipline"],
      "study": ["homework", "lesson", "revision", "reading", "course", "study", "lecture", "school", "research"],
      "reading": ["book", "article", "chapter", "page", "read", "novel", "essay", "highlight", "quote"],
      "media": ["movie", "tv", "show", "youtube", "podcast", "music", "watch", "listen", "stream"],
      "game": ["game", "play", "quest", "mission", "grind", "level", "build", "strategy", "event", "loot"],
      "social": ["chat", "call", "hangout", "friend", "party", "group", "social", "relationship", "message"],

      // Modern digital life
      "tech": ["code", "app", "bug", "build", "script", "terminal", "deploy", "dev", "repo", "github", "design", "framework"],
      "system": ["config", "settings", "install", "update", "tool", "driver", "setup", "terminal", "log"],

      // Planning and time
      "schedule": ["calendar", "event", "appointment", "meeting", "slot", "time", "reminder", "date", "alarm"],
      "goal": ["goal", "target", "aspiration", "resolution", "achievement", "priority", "deadline", "metric"],
      "future": ["plan", "vision", "next", "someday", "dream", "long-term", "timeline", "projection"],

      // Emotional / internal states
      "mental": ["anxiety", "stress", "therapy", "overwhelm", "burnout", "focus", "clarity", "overthinking"],
      "mood": ["happy", "sad", "angry", "excited", "calm", "tired", "energized", "bored", "hopeful"],
      "mindfulness": ["meditate", "breathe", "gratitude", "awareness", "stillness", "intention", "presence"],

      // Health and wellness
      "health": ["exercise", "sleep", "fitness", "run", "hydrate", "step", "medicine", "weight", "doctor"],
      "food": ["meal", "snack", "drink", "recipe", "cook", "order", "eat", "dinner", "lunch", "groceries"],
      "finance": ["expense", "budget", "payment", "invoice", "money", "income", "bill", "receipt", "loan", "subscription"],

      // Environment and location
      "travel": ["trip", "flight", "hotel", "journey", "road", "map", "explore", "vacation", "route", "passport"],
      "location": ["home", "office", "outside", "city", "country", "gps", "place", "where", "venue", "region"],
      "weather": ["rain", "sun", "cloud", "forecast", "hot", "cold", "storm", "temperature", "wind"],

      // Creativity and learning
      "idea": ["concept", "solution", "idea", "brainstorm", "sketch", "prototype", "vision", "spark", "draft"],
      "creative": ["draw", "paint", "write", "compose", "create", "design", "photograph", "art", "craft"],
      "inspiration": ["quote", "book", "talk", "wisdom", "insight", "epiphany", "motivation", "lesson"],

      // Meta / system
      "important": ["priority", "urgent", "now", "alert", "warning", "important", "critical", "must"],
      "archive": ["old", "archived", "completed", "log", "history", "done", "past", "retired"],
      "misc": ["misc", "other", "random", "uncategorized", "undefined", "catch-all", "default"]
    };

    const labels = Object.keys(categories);
    const result = await classifier(text, labels);
    console.log("🧠 Classifier result:", result);

    // Lower threshold to include more categories
    let aiTags = result.labels
      .filter((_, i) => result.scores[i] > 0.1)
      .slice(0, 5);

    // Fallback if nothing above threshold
    if (aiTags.length === 0 && result.labels.length > 0) {
      aiTags = result.labels.slice(0, 1);
    }

    // Keyword matching boost
    const lowerText = text.toLowerCase();
    const keywordMatches = Object.entries(categories)
      .map(([category, keywords]) => {
        const matches = keywords.filter(k => lowerText.includes(k.toLowerCase()));
        return { category, score: matches.length };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.category);

    const finalTags = [...new Set([...aiTags, ...keywordMatches])].slice(0, 5);
    console.log("🏷️ Final Tags:", finalTags);
    return finalTags;

  } catch (err) {
    console.error("❌ classify-tags error:", err);
    return { error: err.message };
  }
});

ipcMain.handle('add-note', async (event, { text, tags }) => {
  try {
    const safeTags = (tags && tags.length) ? tags.join(', ') : 'uncategorized';
    const stmt = db.prepare(`INSERT INTO notes (content, tags) VALUES (?, ?)`);
    stmt.run(text, safeTags);
    return 'Note saved!';
  } catch (err) {
    console.error("❌ DB Error on add-note:", err);
    return { error: err.message };
  }
});

ipcMain.handle('get-notes', async () => {
  try {
    return db.prepare(`SELECT * FROM notes ORDER BY created_at DESC`).all();
  } catch (err) {
    console.error("❌ DB Error on get-notes:", err);
    return [];
  }
});

ipcMain.handle('get-tags', async () => {
  try {
    const rows = db.prepare(`SELECT tags FROM notes`).all();
    const allTags = rows.flatMap(r => (r.tags || '').split(',').map(t => t.trim()));
    const uniqueTags = [...new Set(allTags.filter(Boolean))];
    console.log(dbPath,db);
    return uniqueTags,dbPath,db;
  } catch (err) {
    console.error("❌ DB Error on get-tags:", err);
    return [];
  }
});

ipcMain.handle('get-filtered-tags', async (event, tag) => {
  try {
    const rows = db.prepare(`SELECT * FROM notes WHERE INSTR(tags, ?) > 0`).all(tag);
    return rows;
  } catch (err) {
    console.error("❌ DB Error on get-filtered-tags:", err);
    return [];
  }
});

ipcMain.handle('del-note', async (event, id) => {
  try {
    const result = db.prepare(`DELETE FROM notes WHERE id = ?`).run(id);
    if (result.changes > 0) {
      console.log('Note deleted successfully.');
      return { success: true, message: `✅ Note deleted with id: ${id}`};
    } else {
      console.log('Note not found.');
      return { success: false, message: `❌ Note not found.` };
    }
  } catch(error) {
    console.log(`Failed to delete note: ${error.message}`);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('drop-database', async () => {
  try {
    if (fs.existsSync(dbPath)) {
      // Close existing connection
      db.prepare(`
       DROP TABLE notes;
      `).run();

      db.prepare(`
        CREATE TABLE IF NOT EXISTS notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content TEXT NOT NULL,
          tags TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      console.log('Database reset successfully.');
      return { success: true, message: 'Database reset successfully.' };
    } else {
      return { success: false, message: 'Database file does not exist.' };
    }
  } catch (error) {
    console.log(`Failed to reset database: ${error.message}`);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('check-db', async () => {
  try {
    
    if (!fs.existsSync(dbPath)) {
      return { 
        exists: false,
        valid: false,
        message: 'Database file does not exist',
        filelocation:dbPath,   
      };
    }
    // Check for notes table
    const notesTableCheck = db.prepare(`SELECT * FROM notes ORDER BY created_at DESC`).all();

    if (!notesTableCheck) {
      return {
        exists: true,
        valid: false,
        message: 'Database exists but is missing required tables',
        value: notesTableCheck
      };
    }

    return {
      exists: true,
      valid: true,
      message: 'Database exists and is valid',
      value: notesTableCheck
    };

  } catch (error) {
    return {
      exists: false,
      valid: false,
      message: `Error checking database: ${error.message}`,
    };
  }
});

ipcMain.handle('close-window',()=>{
  win.close();
})

ipcMain.handle('minimize-window',()=>{
  win.minimize();
})

ipcMain.handle('maximize-window',()=>{
  win.isMaximized() ? win.unmaximize() : win.maximize();
})

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 500,
    minWidth: 600,
    minHeight: 300,
    icon: path.join(__dirname, '../public/assets/SBT.png'),
    frame: false,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1e1e2e',
    autoHideMenuBar: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, './preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    win.loadURL('http://localhost:5173');
    //  win.webContents.openDevTools();
    console.log('isdev')

  } else {

    win.loadFile(path.join(__dirname,"../dist/index.html"));
    console.log(path.join(__dirname,"../dist/index.html"));
    // win.webContents.openDevTools();
    console.log('isprod')
  }

  // Optional: Setup your classifier or other async tasks here
  // setupClassifier();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});