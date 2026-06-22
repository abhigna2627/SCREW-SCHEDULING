require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initialQuotes, initialChecklist } = require('./quotes_seed');

// Catch any unhandled promise rejections or exceptions to prevent silent exits
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION AT:', promise, 'Reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION:', err);
});

const app = express();
app.use(express.json());
app.use(cors());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Configure DB parameters from Env
const serverName = process.env.DB_SERVER || '(localdb)\\MSSQLLocalDB';
const databaseName = process.env.DB_DATABASE || 'SelfImprovementDB';
const isLocalDB = serverName.toLowerCase().includes('localdb');
const isTrusted = process.env.DB_TRUSTED === 'true';
const dbUser = process.env.DB_USER || 'admin';
const dbPassword = process.env.DB_PASSWORD || 'mypassword';

// LocalDB does not use standard TCP/IP port 1433. We must use msnodesqlv8 driver.
const sql = (isLocalDB || isTrusted) ? require('mssql/msnodesqlv8') : require('mssql');

// We will dynamically construct and check which driver is available on the machine
const odbcDrivers = [
  'SQL Server', // Built-in legacy driver present on all Windows versions
  'ODBC Driver 17 for SQL Server',
  'ODBC Driver 18 for SQL Server',
  'SQL Server Native Client 11.0'
];

let pool;
let useMockDb = false;

// Mock database state for offline / fallback fallback mode
const mockDb = {
  quotes: initialQuotes.map((q, idx) => ({ QuoteID: idx + 1, ...q })),
  dailyChecklist: initialChecklist.map((name, idx) => ({ ItemID: idx + 1, ItemName: name })),
  activityLog: [],
  todoList: [],
  firstTimes: []
};

// Helper for local date ISO strings (YYYY-MM-DD)
function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Initialize Database connection and seed data
async function initializeDB() {
  console.log(`🔄 Attempting database connection...`);
  console.log(`   Server: ${serverName}`);
  console.log(`   Database: ${databaseName}`);
  console.log(`   Connection Mode: ${isLocalDB ? 'LocalDB Named Pipe / Shared Memory' : 'TCP/IP'}`);
  console.log(`   Auth mode: ${isTrusted ? 'Windows Authentication' : 'SQL Server Authentication'}`);

  let connected = false;

  // 1. Try Named Pipe / Local DB connections using connection strings with different drivers
  if (isLocalDB || isTrusted) {
    const odbcServerName = serverName.replace(/\\\\/g, '\\');
    for (const driverName of odbcDrivers) {
      let connectionString;
      if (isTrusted) {
        connectionString = `Driver={${driverName}};Server=${odbcServerName};Database=${databaseName};Trusted_Connection=Yes;Connection Timeout=2;`;
      } else {
        connectionString = `Driver={${driverName}};Server=${odbcServerName};Database=${databaseName};UID=${dbUser};PWD=${dbPassword};Connection Timeout=2;`;
      }
      
      // TrustServerCertificate is only supported on modern ODBC Driver 11+ and might crash legacy SQL Server driver
      if (driverName.includes('ODBC Driver')) {
        connectionString += 'TrustServerCertificate=Yes;';
      }

      try {
        console.log(`   Trying to connect using driver: {${driverName}}...`);
        const tempPool = new sql.ConnectionPool({
          connectionString,
          options: {
            enableArithAbort: true
          }
        });
        
        await tempPool.connect();
        pool = tempPool;
        console.log(`✅ SUCCESS! Connected to SQL Server database perfectly using driver {${driverName}}.`);
        connected = true;
        break; // Stop trying drivers once we connect
      } catch (err) {
        console.log(`   - Driver {${driverName}} failed:`, err.message);
      }
    }
  } else {
    // 2. Standard TCP connection path for SQL Server Auth
    try {
      const tcpConfig = {
        server: serverName,
        database: databaseName,
        user: dbUser,
        password: dbPassword,
        options: {
          encrypt: false,
          trustServerCertificate: true,
          enableArithAbort: true
        }
      };
      
      const tempPool = new sql.ConnectionPool(tcpConfig);
      await tempPool.connect();
      pool = tempPool;
      console.log(`✅ SUCCESS! Connected to SQL Server database perfectly.`);
      connected = true;
    } catch (err) {
      console.error(`   - Standard TCP Connection failed.`);
    }
  }

  // Handle final connection status
  if (connected) {
    useMockDb = false;
    // Ensure Tables Exist
    await createTablesIfNotExist();
    // Seed Tables if empty
    await seedTablesIfEmpty();
  } else {
    console.error("❌ ALL DATABASE CONNECTION ATTEMPTS FAILED!");
    console.log("\n⚠️  FALLBACK ACTIVE: Starting app in mock In-Memory mode.");
    console.log("   The app will function normally but data will reset when the server restarts.");
    console.log("   Verify SQL Server configurations in backend/.env to use your local database.\n");
    useMockDb = true;
  }
}

async function createTablesIfNotExist() {
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    const request = new sql.Request(transaction);

    // Quotes
    await request.query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Quotes' and xtype='U')
      BEGIN
        CREATE TABLE Quotes (
          QuoteID INT IDENTITY(1,1) PRIMARY KEY,
          QuoteText NVARCHAR(MAX) NOT NULL,
          Author NVARCHAR(255) DEFAULT 'Unknown',
          IsSecret BIT DEFAULT 0
        )
      END
    `);

    // DailyChecklist
    await request.query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DailyChecklist' and xtype='U')
      BEGIN
        CREATE TABLE DailyChecklist (
          ItemID INT IDENTITY(1,1) PRIMARY KEY,
          ItemName NVARCHAR(255) NOT NULL
        )
      END
    `);

    // ActivityLog
    await request.query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ActivityLog' and xtype='U')
      BEGIN
        CREATE TABLE ActivityLog (
          LogID INT IDENTITY(1,1) PRIMARY KEY,
          ActivityText NVARCHAR(MAX) NOT NULL,
          DateCompleted DATE DEFAULT GETDATE(),
          TimeCompleted TIME DEFAULT CONVERT(TIME, GETDATE())
        )
      END
    `);

    // TodoList
    await request.query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TodoList' and xtype='U')
      BEGIN
        CREATE TABLE TodoList (
          TaskID INT IDENTITY(1,1) PRIMARY KEY,
          TaskName NVARCHAR(255) NOT NULL,
          IsCompleted BIT DEFAULT 0,
          CreatedDate DATE DEFAULT GETDATE()
        )
      END
    `);

    // FirstTimeExperiences
    await request.query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='FirstTimeExperiences' and xtype='U')
      BEGIN
        CREATE TABLE FirstTimeExperiences (
          ExperienceID INT IDENTITY(1,1) PRIMARY KEY,
          Description NVARCHAR(MAX) NOT NULL,
          DateLogged DATE DEFAULT GETDATE()
        )
      END
    `);

    await transaction.commit();
    console.log("📋 Database tables verified.");
  } catch (err) {
    await transaction.rollback();
    console.error("❌ Table verification failed:", err.message);
  }
}

async function seedTablesIfEmpty() {
  try {
    // Quotes
    const quotesCountResult = await pool.request().query('SELECT COUNT(*) AS cnt FROM Quotes');
    const quoteCount = quotesCountResult.recordset[0].cnt;
    
    if (quoteCount < 150) {
      console.log(`🌱 Seeding quotes database (Current count: ${quoteCount})...`);
      for (const quote of initialQuotes) {
        const cleanText = quote.QuoteText.replace(/'/g, "''");
        const cleanAuthor = quote.Author.replace(/'/g, "''");
        
        const existsRes = await pool.request().query(
          `SELECT 1 FROM Quotes WHERE QuoteText = N'${cleanText}'`
        );
        
        if (existsRes.recordset.length === 0) {
          await pool.request().query(
            `INSERT INTO Quotes (QuoteText, Author, IsSecret) VALUES (N'${cleanText}', N'${cleanAuthor}', ${quote.IsSecret})`
          );
        }
      }
      const newQuotesCount = (await pool.request().query('SELECT COUNT(*) AS cnt FROM Quotes')).recordset[0].cnt;
      console.log(`✅ Quotes seeding complete. Total: ${newQuotesCount}`);
    }

    // 2. Seed DailyChecklist (Synchronize table with quotes_seed.js)
    console.log('🔄 Syncing daily checklist items from quotes_seed.js...');
    await pool.request().query('DELETE FROM DailyChecklist');
    try {
      await pool.request().query("DBCC CHECKIDENT ('DailyChecklist', RESEED, 0)");
    } catch (e) {
      // Ignore if DBCC fails on local instance
    }
    for (const item of initialChecklist) {
      const cleanItem = item.replace(/'/g, "''");
      await pool.request().query(
        `INSERT INTO DailyChecklist (ItemName) VALUES (N'${cleanItem}')`
      );
    }
    console.log(`✅ Daily checklist synchronized. Total items: ${initialChecklist.length}`);
  } catch (err) {
    console.error("❌ Database seeding failed:", err.message);
  }
}

// Initialize connection
initializeDB().catch(err => {
  console.error("❌ Unhandled DB initialization error:", err);
});

// ============================================================================
// 🛣️ API ENDPOINTS
// ============================================================================

// Check Database connection (skip if running mock mode)
const checkConnection = async (req, res, next) => {
  if (useMockDb) {
    return next();
  }
  try {
    if (!pool.connected) {
      await pool.connect();
    }
    next();
  } catch (err) {
    console.log("⚠️ Connection failed during request. Switching to fallback mock DB mode.");
    useMockDb = true;
    next();
  }
};

app.use(checkConnection);

// ----------------------------------------------------------------------------
// 💬 QUOTE GENERATOR API
// ----------------------------------------------------------------------------

app.get('/api/quotes/random', async (req, res) => {
  const secretOnly = req.query.secret === 'true';
  const includeSecrets = req.query.includeSecrets === 'true';

  if (useMockDb) {
    let list = mockDb.quotes;
    if (secretOnly) {
      list = list.filter(q => q.IsSecret === 1);
    } else if (!includeSecrets) {
      list = list.filter(q => q.IsSecret === 0);
    }
    
    if (list.length === 0) {
      return res.status(404).json({ error: "No mock quotes found." });
    }
    const randQuote = list[Math.floor(Math.random() * list.length)];
    return res.json(randQuote);
  }

  let query = 'SELECT TOP 1 QuoteText, Author, IsSecret FROM Quotes ';
  if (secretOnly) {
    query += 'WHERE IsSecret = 1 ';
  } else if (!includeSecrets) {
    query += 'WHERE IsSecret = 0 ';
  }
  query += 'ORDER BY NEWID()';

  try {
    const result = await pool.request().query(query);
    if (result.recordset.length > 0) {
      res.json(result.recordset[0]);
    } else {
      res.status(404).json({ error: "No quotes found matching criteria." });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/quotes', async (req, res) => {
  const { quoteText, author, isSecret } = req.body;
  if (!quoteText) {
    return res.status(400).json({ error: "Quote text is required" });
  }

  if (useMockDb) {
    const newQuote = {
      QuoteID: mockDb.quotes.length + 1,
      QuoteText: quoteText,
      Author: author || 'Unknown',
      IsSecret: isSecret ? 1 : 0
    };
    mockDb.quotes.push(newQuote);
    return res.status(201).json(newQuote);
  }

  try {
    const request = pool.request();
    request.input('text', sql.NVarChar, quoteText);
    request.input('author', sql.NVarChar, author || 'Unknown');
    request.input('isSecret', sql.Bit, isSecret ? 1 : 0);

    const result = await request.query(
      `INSERT INTO Quotes (QuoteText, Author, IsSecret) 
       OUTPUT INSERTED.QuoteID, INSERTED.QuoteText, INSERTED.Author, INSERTED.IsSecret
       VALUES (@text, @author, @isSecret)`
    );

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------------------
// 📋 DAILY CHECKLIST API
// ----------------------------------------------------------------------------

app.get('/api/checklist', async (req, res) => {
  if (useMockDb) {
    const todayStr = getTodayDateString();
    const result = mockDb.dailyChecklist.map(item => {
      const isCompleted = mockDb.activityLog.some(log => 
        log.ActivityText === 'Checklist: ' + item.ItemName && 
        log.DateCompleted === todayStr
      ) ? 1 : 0;
      return {
        ItemID: item.ItemID,
        ItemName: item.ItemName,
        IsCompleted: isCompleted
      };
    });
    return res.json(result);
  }

  try {
    const query = `
      SELECT ItemID, ItemName,
        (CASE WHEN EXISTS (
          SELECT 1 FROM ActivityLog 
          WHERE ActivityText = 'Checklist: ' + ItemName 
            AND DateCompleted = CAST(GETDATE() AS DATE)
        ) THEN 1 ELSE 0 END) AS IsCompleted
      FROM DailyChecklist
    `;
    const result = await pool.request().query(query);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/checklist/toggle', async (req, res) => {
  const { itemName, isCompleted } = req.body;
  if (!itemName) {
    return res.status(400).json({ error: "Item name is required." });
  }

  const activityText = 'Checklist: ' + itemName;

  if (useMockDb) {
    const todayStr = getTodayDateString();
    if (isCompleted) {
      const exists = mockDb.activityLog.some(log => 
        log.ActivityText === activityText && log.DateCompleted === todayStr
      );
      if (!exists) {
        mockDb.activityLog.push({
          LogID: Date.now() + Math.floor(Math.random() * 1000),
          ActivityText: activityText,
          DateCompleted: todayStr,
          TimeCompleted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
        });
      }
    } else {
      mockDb.activityLog = mockDb.activityLog.filter(log => 
        !(log.ActivityText === activityText && log.DateCompleted === todayStr)
      );
    }
    return res.json({ success: true });
  }

  try {
    const request = pool.request();
    request.input('itemName', sql.NVarChar, itemName);
    request.input('activityText', sql.NVarChar, activityText);

    if (isCompleted) {
      await request.query(`
        IF NOT EXISTS (
          SELECT 1 FROM ActivityLog 
          WHERE ActivityText = @activityText 
            AND DateCompleted = CAST(GETDATE() AS DATE)
        )
        BEGIN
          INSERT INTO ActivityLog (ActivityText, DateCompleted, TimeCompleted) 
          VALUES (@activityText, CAST(GETDATE() AS DATE), CONVERT(TIME, GETDATE()))
        END
      `);
      res.json({ success: true });
    } else {
      await request.query(`
        DELETE FROM ActivityLog 
        WHERE ActivityText = @activityText 
          AND DateCompleted = CAST(GETDATE() AS DATE)
      `);
      res.json({ success: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------------------
// 📝 DYNAMIC TODO LIST API
// ----------------------------------------------------------------------------

app.get('/api/todo', async (req, res) => {
  if (useMockDb) {
    const sorted = [...mockDb.todoList].sort((a, b) => {
      if (a.IsCompleted !== b.IsCompleted) return a.IsCompleted - b.IsCompleted;
      return b.TaskID - a.TaskID;
    });
    return res.json(sorted);
  }

  try {
    const result = await pool.request().query(
      `SELECT TaskID, TaskName, IsCompleted, CreatedDate 
       FROM TodoList 
       ORDER BY IsCompleted ASC, TaskID DESC`
    );
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/todo', async (req, res) => {
  const { taskName } = req.body;
  if (!taskName) {
    return res.status(400).json({ error: "Task name is required." });
  }

  if (useMockDb) {
    const newTodo = {
      TaskID: Date.now(),
      TaskName: taskName,
      IsCompleted: 0,
      CreatedDate: getTodayDateString()
    };
    mockDb.todoList.push(newTodo);
    return res.status(201).json(newTodo);
  }

  try {
    const request = pool.request();
    request.input('taskName', sql.NVarChar, taskName);
    const result = await request.query(
      `INSERT INTO TodoList (TaskName, IsCompleted, CreatedDate) 
       OUTPUT INSERTED.TaskID, INSERTED.TaskName, INSERTED.IsCompleted, INSERTED.CreatedDate
       VALUES (@taskName, 0, CAST(GETDATE() AS DATE))`
    );
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/todo/:id', async (req, res) => {
  const taskId = parseInt(req.params.id);
  const { isCompleted } = req.body;

  if (useMockDb) {
    const todo = mockDb.todoList.find(t => t.TaskID === taskId);
    if (!todo) return res.status(404).json({ error: "Task not found." });
    
    todo.IsCompleted = isCompleted ? 1 : 0;
    const activityText = 'Todo: ' + todo.TaskName;
    const todayStr = getTodayDateString();

    if (isCompleted) {
      const exists = mockDb.activityLog.some(log => 
        log.ActivityText === activityText && log.DateCompleted === todayStr
      );
      if (!exists) {
        mockDb.activityLog.push({
          LogID: Date.now() + Math.floor(Math.random() * 1000),
          ActivityText: activityText,
          DateCompleted: todayStr,
          TimeCompleted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
        });
      }
    } else {
      mockDb.activityLog = mockDb.activityLog.filter(log => 
        !(log.ActivityText === activityText && log.DateCompleted === todayStr)
      );
    }

    return res.json({ success: true, taskName: todo.TaskName, isCompleted });
  }

  try {
    const request = pool.request();
    request.input('taskId', sql.Int, taskId);
    request.input('isCompleted', sql.Bit, isCompleted ? 1 : 0);

    const taskResult = await request.query('SELECT TaskName FROM TodoList WHERE TaskID = @taskId');
    if (taskResult.recordset.length === 0) {
      return res.status(404).json({ error: "Task not found." });
    }
    const taskName = taskResult.recordset[0].TaskName;
    const activityText = 'Todo: ' + taskName;
    request.input('activityText', sql.NVarChar, activityText);

    await request.query('UPDATE TodoList SET IsCompleted = @isCompleted WHERE TaskID = @taskId');

    if (isCompleted) {
      await request.query(`
        IF NOT EXISTS (
          SELECT 1 FROM ActivityLog 
          WHERE ActivityText = @activityText 
            AND DateCompleted = CAST(GETDATE() AS DATE)
        )
        BEGIN
          INSERT INTO ActivityLog (ActivityText, DateCompleted, TimeCompleted) 
          VALUES (@activityText, CAST(GETDATE() AS DATE), CONVERT(TIME, GETDATE()))
        END
      `);
    } else {
      await request.query(`
        DELETE FROM ActivityLog 
        WHERE ActivityText = @activityText 
          AND DateCompleted = CAST(GETDATE() AS DATE)
      `);
    }

    res.json({ success: true, taskName, isCompleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/todo/:id', async (req, res) => {
  const taskId = parseInt(req.params.id);

  if (useMockDb) {
    const todo = mockDb.todoList.find(t => t.TaskID === taskId);
    if (todo) {
      const activityText = 'Todo: ' + todo.TaskName;
      mockDb.activityLog = mockDb.activityLog.filter(log => log.ActivityText !== activityText);
      mockDb.todoList = mockDb.todoList.filter(t => t.TaskID !== taskId);
    }
    return res.json({ success: true });
  }

  try {
    const request = pool.request();
    request.input('taskId', sql.Int, taskId);
    
    const taskResult = await request.query('SELECT TaskName FROM TodoList WHERE TaskID = @taskId');
    if (taskResult.recordset.length > 0) {
      const taskName = taskResult.recordset[0].TaskName;
      request.input('activityText', sql.NVarChar, 'Todo: ' + taskName);
      await request.query('DELETE FROM ActivityLog WHERE ActivityText = @activityText');
    }

    await request.query('DELETE FROM TodoList WHERE TaskID = @taskId');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------------------
// 📈 ACTIVITY LOGS API
// ----------------------------------------------------------------------------

app.get('/api/activities/today', async (req, res) => {
  if (useMockDb) {
    const todayStr = getTodayDateString();
    const result = mockDb.activityLog
      .filter(log => log.DateCompleted === todayStr)
      .sort((a, b) => b.LogID - a.LogID);
    return res.json(result);
  }

  try {
    const result = await pool.request().query(
      `SELECT LogID, ActivityText, TimeCompleted, DateCompleted 
       FROM ActivityLog 
       WHERE DateCompleted = CAST(GETDATE() AS DATE) 
       ORDER BY LogID DESC`
    );
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/activities/week', async (req, res) => {
  if (useMockDb) {
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 6);
    
    const result = mockDb.activityLog.filter(log => {
      const logDate = new Date(log.DateCompleted);
      return logDate >= weekAgo && logDate <= today;
    }).sort((a, b) => {
      if (a.DateCompleted !== b.DateCompleted) {
        return new Date(b.DateCompleted) - new Date(a.DateCompleted);
      }
      return b.LogID - a.LogID;
    });
    return res.json(result);
  }

  try {
    const result = await pool.request().query(
      `SELECT LogID, ActivityText, DateCompleted, TimeCompleted 
       FROM ActivityLog 
       WHERE DateCompleted >= DATEADD(day, -6, CAST(GETDATE() AS DATE)) 
       ORDER BY DateCompleted DESC, TimeCompleted DESC`
    );
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/activities/by-date', async (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ error: "Date parameter is required (YYYY-MM-DD)." });
  }

  if (useMockDb) {
    const result = mockDb.activityLog
      .filter(log => log.DateCompleted === date)
      .sort((a, b) => b.LogID - a.LogID);
    return res.json(result);
  }

  try {
    const request = pool.request();
    request.input('dateStr', sql.VarChar, date);
    const result = await request.query(
      `SELECT LogID, ActivityText, TimeCompleted, DateCompleted 
       FROM ActivityLog 
       WHERE DateCompleted = CAST(@dateStr AS DATE) 
       ORDER BY LogID DESC`
    );
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/activities', async (req, res) => {
  const { activityText, date } = req.body;
  if (!activityText) {
    return res.status(400).json({ error: "Activity description is required." });
  }

  const logDate = date || getTodayDateString();

  if (useMockDb) {
    const newLog = {
      LogID: Date.now(),
      ActivityText: activityText,
      DateCompleted: logDate,
      TimeCompleted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    };
    mockDb.activityLog.push(newLog);
    return res.status(201).json(newLog);
  }

  try {
    const request = pool.request();
    request.input('text', sql.NVarChar, activityText);
    
    let result;
    if (date) {
      request.input('date', sql.VarChar, date);
      result = await request.query(
        `INSERT INTO ActivityLog (ActivityText, DateCompleted, TimeCompleted) 
         OUTPUT INSERTED.LogID, INSERTED.ActivityText, INSERTED.DateCompleted, INSERTED.TimeCompleted
         VALUES (@text, CAST(@date AS DATE), CONVERT(TIME, GETDATE()))`
      );
    } else {
      result = await request.query(
        `INSERT INTO ActivityLog (ActivityText, DateCompleted, TimeCompleted) 
         OUTPUT INSERTED.LogID, INSERTED.ActivityText, INSERTED.DateCompleted, INSERTED.TimeCompleted
         VALUES (@text, CAST(GETDATE() AS DATE), CONVERT(TIME, GETDATE()))`
      );
    }
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/activities/:id', async (req, res) => {
  const logId = parseInt(req.params.id);

  if (useMockDb) {
    mockDb.activityLog = mockDb.activityLog.filter(log => log.LogID !== logId);
    return res.json({ success: true });
  }

  try {
    const request = pool.request();
    request.input('logId', sql.Int, logId);
    await request.query('DELETE FROM ActivityLog WHERE LogID = @logId');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/activities/active-dates', async (req, res) => {
  if (useMockDb) {
    const dates = [...new Set(mockDb.activityLog.map(log => log.DateCompleted))];
    return res.json(dates);
  }

  try {
    const result = await pool.request().query(
      `SELECT DISTINCT DateCompleted 
       FROM ActivityLog 
       WHERE DateCompleted >= DATEADD(month, -2, CAST(GETDATE() AS DATE))`
    );
    const dates = result.recordset.map(r => {
      if (!r.DateCompleted) return null;
      const d = new Date(r.DateCompleted);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }).filter(Boolean);
    
    res.json(dates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------------------
// 🌟 FIRST-TIME EXPERIENCES NOTEPAD API
// ----------------------------------------------------------------------------

app.get('/api/first-times', async (req, res) => {
  if (useMockDb) {
    const sorted = [...mockDb.firstTimes].sort((a, b) => b.ExperienceID - a.ExperienceID);
    return res.json(sorted);
  }

  try {
    const result = await pool.request().query(
      `SELECT ExperienceID, Description, DateLogged 
       FROM FirstTimeExperiences 
       ORDER BY ExperienceID DESC`
    );
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/first-times', async (req, res) => {
  const { description } = req.body;
  if (!description) {
    return res.status(400).json({ error: "Description is required." });
  }

  if (useMockDb) {
    const newFT = {
      ExperienceID: Date.now(),
      Description: description,
      DateLogged: getTodayDateString()
    };
    mockDb.firstTimes.push(newFT);
    return res.status(201).json(newFT);
  }

  try {
    const request = pool.request();
    request.input('description', sql.NVarChar, description);
    const result = await request.query(
      `INSERT INTO FirstTimeExperiences (Description, DateLogged) 
       OUTPUT INSERTED.ExperienceID, INSERTED.Description, INSERTED.DateLogged
       VALUES (@description, CAST(GETDATE() AS DATE))`
    );
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/first-times/:id', async (req, res) => {
  const ftId = parseInt(req.params.id);

  if (useMockDb) {
    mockDb.firstTimes = mockDb.firstTimes.filter(t => t.ExperienceID !== ftId);
    return res.json({ success: true });
  }

  try {
    const request = pool.request();
    request.input('ftId', sql.Int, ftId);
    await request.query('DELETE FROM FirstTimeExperiences WHERE ExperienceID = @ftId');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------------------
// Start Server
// ----------------------------------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});