const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app } = require('electron');

let db;

// Get the path for the database file
function getDatabasePath() {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'invoice_generator.db');
}

// Initialize the database
function initializeDatabase() {
    return new Promise((resolve, reject) => {
        const dbPath = getDatabasePath();
        console.log('Database path:', dbPath);

        db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err);
                reject(err);
                return;
            }

            console.log('Connected to SQLite database');
            createTables()
                .then(() => {
                    console.log('Database initialized successfully');
                    resolve();
                })
                .catch(reject);
        });
    });
}

// Create all necessary tables
function createTables() {
    return new Promise((resolve, reject) => {
        const queries = [
            // Settings table - stores business details
            `CREATE TABLE IF NOT EXISTS Settings (
                id INTEGER PRIMARY KEY,
                businessName TEXT,
                address TEXT,
                gstin TEXT,
                ownerName TEXT,
                ownerPhone TEXT,
                logoPath TEXT
            )`,

            // Items table - master list of items for suggestions
            `CREATE TABLE IF NOT EXISTS Items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE,
                rate REAL,
                frequency INTEGER DEFAULT 0,
                lastUsed TEXT,
                createdAt TEXT DEFAULT CURRENT_TIMESTAMP
            )`,

            // Invoices table - main invoice records
            `CREATE TABLE IF NOT EXISTS Invoices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                invoiceNumber TEXT UNIQUE,
                customerName TEXT,
                invoiceDate TEXT,
                grandTotal REAL
            )`,

            // InvoiceItems table - line items for each invoice
            `CREATE TABLE IF NOT EXISTS InvoiceItems (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                invoice_id INTEGER,
                itemName TEXT,
                quantity INTEGER,
                rate REAL,
                amount REAL,
                FOREIGN KEY (invoice_id) REFERENCES Invoices (id)
            )`
        ];

        // Queries to add new columns to existing tables (for database upgrades)
        const upgradeQueries = [
            `ALTER TABLE Items ADD COLUMN frequency INTEGER DEFAULT 0`,
            `ALTER TABLE Items ADD COLUMN lastUsed TEXT`,
            `ALTER TABLE Items ADD COLUMN createdAt TEXT`
        ];

        let completed = 0;
        const total = queries.length;

        queries.forEach((query, index) => {
            db.run(query, (err) => {
                if (err) {
                    console.error(`Error creating table ${index}:`, err);
                    reject(err);
                    return;
                }

                completed++;
                if (completed === total) {
                    console.log('All tables created successfully');
                    // Now run upgrade queries to add new columns if they don't exist
                    runUpgradeQueries(upgradeQueries)
                        .then(resolve)
                        .catch(reject);
                }
            });
        });
    });
}

// Run upgrade queries to add new columns (ignore errors if columns already exist)
function runUpgradeQueries(upgradeQueries) {
    return new Promise((resolve) => {
        let completed = 0;
        const total = upgradeQueries.length;

        if (total === 0) {
            resolve();
            return;
        }

        upgradeQueries.forEach((query) => {
            db.run(query, (err) => {
                // Ignore errors for upgrade queries (column might already exist)
                if (err && !err.message.includes('duplicate column name')) {
                    console.log('Upgrade query note:', err.message);
                }

                completed++;
                if (completed === total) {
                    console.log('Database upgrade queries completed');
                    resolve();
                }
            });
        });
    });
}

// Get database instance
function getDatabase() {
    return db;
}

// Close database connection
function closeDatabase() {
    return new Promise((resolve) => {
        if (db) {
            db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                } else {
                    console.log('Database connection closed');
                }
                resolve();
            });
        } else {
            resolve();
        }
    });
}

// Database helper functions

// Settings functions
function getSettings() {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM Settings WHERE id = 1", (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row || {});
            }
        });
    });
}

function saveSettings(settings) {
    return new Promise((resolve, reject) => {
        const { businessName, address, gstin, ownerName, ownerPhone, logoPath } = settings;

        db.run(
            `INSERT OR REPLACE INTO Settings 
             (id, businessName, address, gstin, ownerName, ownerPhone, logoPath) 
             VALUES (1, ?, ?, ?, ?, ?, ?)`, [businessName, address, gstin, ownerName, ownerPhone, logoPath],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            }
        );
    });
}

// Items functions
function getItems() {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM Items 
                ORDER BY 
                    COALESCE(frequency, 0) DESC, 
                    CASE WHEN lastUsed IS NOT NULL THEN datetime(lastUsed) ELSE datetime('1970-01-01') END DESC,
                    name ASC`, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows || []);
            }
        });
    });
}

function saveOrUpdateItem(name, rate) {
    return new Promise((resolve, reject) => {
        db.run(
            "INSERT OR REPLACE INTO Items (name, rate) VALUES (?, ?)", [name, rate],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            }
        );
    });
}

function updateItemUsage(name) {
    return new Promise((resolve, reject) => {
        const currentTime = new Date().toISOString();

        db.run(
            `UPDATE Items 
             SET frequency = COALESCE(frequency, 0) + 1, 
                 lastUsed = ? 
             WHERE name = ?`, [currentTime, name],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            }
        );
    });
}

// Invoice functions
function saveInvoice(invoice) {
    return new Promise((resolve, reject) => {
        const { invoiceNumber, customerName, invoiceDate, grandTotal, items } = invoice;

        db.run(
            "INSERT INTO Invoices (invoiceNumber, customerName, invoiceDate, grandTotal) VALUES (?, ?, ?, ?)", [invoiceNumber, customerName, invoiceDate, grandTotal],
            function(err) {
                if (err) {
                    reject(err);
                    return;
                }

                const invoiceId = this.lastID;

                // Save invoice items
                if (items && items.length > 0) {
                    const itemPromises = items.map(item => {
                        return new Promise((resolveItem, rejectItem) => {
                            db.run(
                                "INSERT INTO InvoiceItems (invoice_id, itemName, quantity, rate, amount) VALUES (?, ?, ?, ?, ?)", [invoiceId, item.name, item.quantity, item.rate, item.amount],
                                function(err) {
                                    if (err) {
                                        rejectItem(err);
                                    } else {
                                        resolveItem();
                                    }
                                }
                            );
                        });
                    });

                    Promise.all(itemPromises)
                        .then(() => resolve(invoiceId))
                        .catch(reject);
                } else {
                    resolve(invoiceId);
                }
            }
        );
    });
}

function getInvoices() {
    return new Promise((resolve, reject) => {
        db.all(
            "SELECT * FROM Invoices ORDER BY invoiceDate DESC, invoiceNumber DESC",
            (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            }
        );
    });
}

function getInvoiceById(id) {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM Invoices WHERE id = ?", [id], (err, invoice) => {
            if (err) {
                reject(err);
                return;
            }

            if (!invoice) {
                resolve(null);
                return;
            }

            // Get invoice items
            db.all(
                "SELECT * FROM InvoiceItems WHERE invoice_id = ?", [id],
                (err, items) => {
                    if (err) {
                        reject(err);
                    } else {
                        invoice.items = items || [];
                        resolve(invoice);
                    }
                }
            );
        });
    });
}

function getNextInvoiceNumber() {
    return new Promise((resolve, reject) => {
        db.get(
            "SELECT MAX(CAST(SUBSTR(invoiceNumber, 4) AS INTEGER)) as maxNum FROM Invoices WHERE invoiceNumber LIKE 'INV%'",
            (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    const nextNum = (row.maxNum || 0) + 1;
                    const paddedNum = nextNum.toString().padStart(4, '0');
                    resolve(`INV${paddedNum}`);
                }
            }
        );
    });
}

module.exports = {
    initializeDatabase,
    getDatabase,
    closeDatabase,
    getSettings,
    saveSettings,
    getItems,
    saveOrUpdateItem,
    updateItemUsage,
    saveInvoice,
    getInvoices,
    getInvoiceById,
    getNextInvoiceNumber
};