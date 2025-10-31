const { app, BrowserWindow, ipcMain, dialog } = require('electron/main')
const path = require('path')
const fs = require('fs').promises
const db = require('./db')
const puppeteer = require('puppeteer')

// Cache browser instance for better performance
let cachedBrowser = null;

async function getBrowser() {
    if (!cachedBrowser || !cachedBrowser.isConnected()) {
        cachedBrowser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });
    }
    return cachedBrowser;
}

const createWindow = () => {
        const win = new BrowserWindow({
            width: 1400,
            height: 900,
            minWidth: 1000,
            minHeight: 700,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                enableRemoteModule: true
            },
            show: true, // Show immediately for debugging
            frame: true, // Use default frame for now
            titleBarStyle: 'default',
            backgroundColor: '#0f172a', // Dark background to match theme
            icon: null // Can add app icon later
        })

        // Load the HTML file
        win.loadFile('index.html')

        // Debug: Log when window is created
        console.log('Window created successfully')

        // Debug: Log when window loads
        win.webContents.once('did-finish-load', () => {
            console.log('Window content loaded successfully')
                // Force window to show and focus
            win.show()
            win.focus()
            win.moveTop()
        })

        // Remove the menu bar
        win.setMenuBarVisibility(false)

        // Store window reference globally for IPC handlers
        global.mainWindow = win

        // Open DevTools only in development mode (comment out for production)
        // win.webContents.openDevTools()

        // Window event handlers
        win.on('closed', () => {
            // Dereference the window object
            console.log('Window closed')
            global.mainWindow = null
        })

        // Error handling
        win.webContents.on('crashed', () => {
            console.error('Window crashed')
        })

        win.on('unresponsive', () => {
            console.error('Window became unresponsive')
        })

        return win
    } // Initialize database and create window when app is ready
app.whenReady().then(async() => {
    try {
        await db.initializeDatabase()
        console.log('Database initialized successfully')
        createWindow()
    } catch (error) {
        console.error('Failed to initialize database:', error)
        app.quit()
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', async() => {
    await db.closeDatabase()

    // Close cached browser if it exists
    if (cachedBrowser && cachedBrowser.isConnected()) {
        await cachedBrowser.close()
        cachedBrowser = null
    }

    if (process.platform !== 'darwin') {
        app.quit()
    }
})

// IPC handlers for database operations
ipcMain.handle('db-get-settings', async() => {
    return await db.getSettings()
})

ipcMain.handle('db-save-settings', async(event, settings) => {
    return await db.saveSettings(settings)
})

ipcMain.handle('db-get-items', async() => {
    return await db.getItems()
})

ipcMain.handle('db-save-item', async(event, name, rate) => {
    return await db.saveOrUpdateItem(name, rate)
})

ipcMain.handle('db-update-item-usage', async(event, name) => {
    return await db.updateItemUsage(name)
})

ipcMain.handle('db-save-invoice', async(event, invoice) => {
    return await db.saveInvoice(invoice)
})

ipcMain.handle('db-get-invoices', async() => {
    return await db.getInvoices()
})

ipcMain.handle('db-get-invoice', async(event, id) => {
    const invoice = await db.getInvoiceById(id)

    // Map database field names to frontend field names
    if (invoice && invoice.items) {
        invoice.items = invoice.items.map(item => ({
            id: item.id,
            name: item.itemName || '', // Map itemName to name for frontend compatibility
            quantity: item.quantity || 0,
            rate: item.rate || 0,
            amount: item.amount || 0
        }))
    }

    return invoice
})

ipcMain.handle('db-get-next-invoice-number', async() => {
    return await db.getNextInvoiceNumber()
})

// Logo handling
ipcMain.handle('save-logo', async(event, fileData) => {
    try {
        // Create logos directory if it doesn't exist
        const userDataPath = app.getPath('userData')
        const logoDir = path.join(userDataPath, 'logos')

        try {
            await fs.access(logoDir)
        } catch {
            await fs.mkdir(logoDir, { recursive: true })
        }

        // Generate unique filename
        const timestamp = Date.now()
        const extension = path.extname(fileData.name) || '.jpg'
        const filename = `logo_${timestamp}${extension}`
        const logoPath = path.join(logoDir, filename)

        // Convert file data to buffer and save
        const buffer = Buffer.from(fileData.data)
        await fs.writeFile(logoPath, buffer)

        // Return the file path for storage in database
        return logoPath
    } catch (error) {
        console.error('Error saving logo:', error)
        throw error
    }
})

// Print and PDF functionality
ipcMain.handle('check-printer-available', async() => {
    try {
        // Simple check - assume printer is available
        // This can be enhanced later with proper printer detection
        return true
    } catch (error) {
        console.error('Error checking printers:', error)
        return false
    }
})

ipcMain.handle('print-invoice', async(event, invoiceData) => {
    let printWindow = null;

    try {
        // Validate input data
        if (!invoiceData || !invoiceData.invoice || !invoiceData.settings) {
            throw new Error('Invalid invoice data: missing required fields');
        }

        // Parse the data safely
        let invoice, settings;
        try {
            invoice = JSON.parse(invoiceData.invoice);
            settings = JSON.parse(invoiceData.settings);
        } catch (parseError) {
            throw new Error('Invalid JSON data: ' + parseError.message);
        }

        // Validate parsed data
        if (!invoice) {
            throw new Error('Invoice data is null or undefined');
        }

        if (!invoice.invoiceNumber) {
            throw new Error('Invoice number is required');
        }

        // Ensure items array exists
        if (!invoice.items) {
            invoice.items = [];
        }

        // Create a new window for printing
        printWindow = new BrowserWindow({
            width: 800,
            height: 600,
            show: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        })

        // Generate HTML content
        const htmlContent = await generateInvoiceHTML(invoice, settings)

        // Load the HTML content
        await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`)

        // Wait for the content to load
        await new Promise(resolve => {
            printWindow.webContents.once('did-finish-load', resolve)
        })

        // Show print dialog with timeout to prevent hanging
        const printPromise = printWindow.webContents.print({
            silent: false,
            printBackground: true,
            margins: {
                marginType: 'custom',
                top: 0.4,
                bottom: 0.4,
                left: 0.4,
                right: 0.4
            }
        });

        // Add timeout to prevent hanging indefinitely
        const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => {
                resolve(true); // Resolve after timeout
            }, 5000); // 5 second timeout
        });

        // Race between print and timeout
        await Promise.race([printPromise, timeoutPromise]);

        return true

    } catch (error) {
        console.error('Error printing invoice:', error)
        throw new Error(`Failed to print invoice: ${error.message}`)
    } finally {
        // Clean up the print window
        if (printWindow && !printWindow.isDestroyed()) {
            printWindow.close()
        }
    }
})

// PDF generation function
async function generateInvoiceHTML(invoice, settings) {
    // Ensure items array exists and filter valid items
    const items = (invoice.items || []).filter(item => item && item.name && item.name.trim() !== '')

    // Convert logo to base64 if it exists
    let logoDataUrl = '';
    if (settings.logoPath && settings.logoPath.trim() !== '') {
        try {
            const logoPath = settings.logoPath.startsWith('file://') ?
                settings.logoPath.substring(7) : settings.logoPath;
            const logoBuffer = await fs.readFile(logoPath);
            const logoExtension = path.extname(logoPath).toLowerCase();
            let mimeType = 'image/jpeg'; // default

            if (logoExtension === '.png') mimeType = 'image/png';
            else if (logoExtension === '.gif') mimeType = 'image/gif';
            else if (logoExtension === '.webp') mimeType = 'image/webp';

            logoDataUrl = `data:${mimeType};base64,${logoBuffer.toString('base64')}`;
        } catch (error) {
            console.error('Error loading logo for PDF:', error);
            logoDataUrl = ''; // Fall back to no logo
        }
    }

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
            @page {
                size: A5;
                margin: 10mm;
            }
            
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: Arial, sans-serif;
                line-height: 1.4;
                color: #333;
                background: white;
            }
            
            .invoice-container {
                width: 100%;
                max-width: 148mm;
                margin: 0 auto;
                padding: 5mm;
            }
            
            .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 20px;
                border-bottom: 2px solid #e5e5e5;
                padding-bottom: 15px;
            }
            
            .business-info {
                flex: 1;
            }
            
            .business-logo {
                width: 50px;
                height: 50px;
                object-fit: contain;
                margin-bottom: 8px;
                max-width: 50px;
                max-height: 50px;
                image-rendering: crisp-edges;
            }
            
            .business-name {
                font-size: 18px;
                font-weight: bold;
                color: #1a1a1a;
                margin-bottom: 4px;
            }
            
            .business-address {
                font-size: 10px;
                color: #666;
                line-height: 1.3;
                white-space: pre-line;
            }
            
            .business-gstin {
                font-size: 9px;
                color: #888;
                margin-top: 4px;
            }
            
            .business-contact {
                margin-top: 8px;
                padding-top: 6px;
                border-top: 1px solid #e5e5e5;
            }
            
            .owner-name, .owner-phone {
                font-size: 9px;
                color: #666;
                line-height: 1.2;
            }
            
            .owner-name {
                font-weight: 600;
            }
            
            .invoice-details {
                text-align: right;
            }
            
            .invoice-title {
                font-size: 16px;
                font-weight: bold;
                color: #1a1a1a;
                margin-bottom: 4px;
            }
            
            .invoice-number, .invoice-date {
                font-size: 10px;
                color: #666;
                margin-bottom: 2px;
            }
            
            .customer-section {
                background-color: #f8f9fa;
                padding: 10px;
                border-radius: 4px;
                margin-bottom: 15px;
            }
            
            .customer-label {
                font-size: 9px;
                font-weight: bold;
                color: #666;
                margin-bottom: 4px;
            }
            
            .customer-name {
                font-size: 12px;
                font-weight: 600;
                color: #1a1a1a;
            }
            
            .items-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 15px;
                font-size: 10px;
            }
            
            .items-table th {
                background-color: #f1f1f1;
                padding: 6px 4px;
                text-align: left;
                font-weight: bold;
                border-bottom: 1px solid #ddd;
                font-size: 9px;
            }
            
            .items-table th:nth-child(2),
            .items-table th:nth-child(3),
            .items-table th:nth-child(4) {
                text-align: right;
            }
            
            .items-table td {
                padding: 6px 4px;
                border-bottom: 1px solid #eee;
            }
            
            .items-table td:nth-child(2),
            .items-table td:nth-child(3),
            .items-table td:nth-child(4) {
                text-align: right;
            }
            
            .totals-section {
                display: flex;
                justify-content: flex-end;
                margin-bottom: 15px;
            }
            
            .totals-table {
                width: 120px;
                border-top: 2px solid #333;
                padding-top: 8px;
            }
            
            .total-row {
                display: flex;
                justify-content: space-between;
                font-size: 12px;
                font-weight: bold;
                color: #1a1a1a;
            }
            
            .footer {
                border-top: 1px solid #e5e5e5;
                padding-top: 10px;
                text-align: center;
                font-size: 8px;
                color: #888;
                margin-top: 15px;
            }
            
            .authorization {
                font-weight: 600;
                margin-bottom: 4px;
                font-size: 9px;
            }
            
            .contact-info {
                margin-top: 4px;
            }
        </style>
    </head>
    <body>
        <div class="invoice-container">
            <!-- Header -->
            <div class="header">
                <div class="business-info">
                    ${logoDataUrl ? `<img src="${logoDataUrl}" class="business-logo" alt="Business Logo">` : ''}
                    <div class="business-name">${settings.businessName || 'Business Name'}</div>
                    <div class="business-address">${settings.address || 'Business Address'}</div>
                    ${settings.gstin ? `<div class="business-gstin">GSTIN: ${settings.gstin}</div>` : ''}
                    ${settings.foodLicenseNumber ? `<div class="business-gstin">Food License: ${settings.foodLicenseNumber}</div>` : ''}
                    <div class="business-contact">
                        <div class="owner-name">${settings.ownerName || ''}</div>
                        <div class="owner-phone">${settings.ownerPhone || ''}</div>
                    </div>
                </div>
                <div class="invoice-details">
                    <div class="invoice-title">INVOICE</div>
                    <div class="invoice-number"># ${invoice.invoiceNumber}</div>
                    <div class="invoice-date">Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}</div>
                </div>
            </div>
            
            <!-- Customer Details -->
            <div class="customer-section">
                <div class="customer-label">Bill To:</div>
                <div class="customer-name">${invoice.customerName}</div>
            </div>
            
            <!-- Items Table -->
            <table class="items-table">
                <thead>
                    <tr>
                        <th style="width: 50%;">Item</th>
                        <th style="width: 15%;">Qty</th>
                        <th style="width: 20%;">Rate</th>
                        <th style="width: 20%;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr>
                            <td>${item.name}</td>
                            <td>${item.quantity}</td>
                            <td>₹${parseFloat(item.rate).toFixed(2)}</td>
                            <td>₹${parseFloat(item.amount).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <!-- Totals -->
            <div class="totals-section">
                <div class="totals-table">
                    <div class="total-row">
                        <span>Total Amount:</span>
                        <span>₹${parseFloat(invoice.grandTotal).toFixed(2)}</span>
                    </div>
                </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
                <div class="authorization">This is a computer-generated invoice and does not require physical signature or stamp.</div>
                <div class="contact-info">For any queries, please contact: ${settings.ownerPhone || 'N/A'}</div>
            </div>
        </div>
    </body>
    </html>
    `
}

ipcMain.handle('save-invoice-pdf', async(event, invoiceData) => {
    let browser = null;
    
    try {
        // Parse the data safely
        const invoice = JSON.parse(invoiceData.invoice);
        const settings = JSON.parse(invoiceData.settings);
        
        // Show save dialog first
        const result = await dialog.showSaveDialog({
            title: 'Save Invoice as PDF',
            defaultPath: `Invoice_${invoice.invoiceNumber}.pdf`,
            filters: [
                { name: 'PDF Files', extensions: ['pdf'] }
            ]
        })

        if (result.canceled) {
            return null
        }

        const filePath = result.filePath
        
        // Use cached browser instance for better performance
        browser = await getBrowser()
        const page = await browser.newPage()
        
        // Optimize page settings for faster rendering
        await page.setDefaultNavigationTimeout(10000);
        await page.setDefaultTimeout(10000);
        
        // Generate HTML content
        const htmlContent = await generateInvoiceHTML(invoice, settings)
        
        // Set content with minimal wait requirements
        await page.setContent(htmlContent, { 
            waitUntil: 'domcontentloaded',
            timeout: 10000 
        })
        
        // Generate PDF with A5 format
        await page.pdf({
            path: filePath,
            format: 'A5',
            margin: {
                top: '10mm',
                right: '10mm',
                bottom: '10mm',
                left: '10mm'
            },
            printBackground: true
        })
        
        // Close the page but keep browser for reuse
        await page.close()
        
        console.log('PDF generated successfully:', filePath)
        return filePath

    } catch (error) {
        console.error('Error generating PDF:', error)
        throw new Error(`Failed to generate PDF: ${error.message}`)
    }
    // Note: We don't close the browser here to keep it cached for next use
})

// Window control IPC handlers
ipcMain.handle('window-minimize', () => {
    const win = global.mainWindow
    if (win) win.minimize()
})

ipcMain.handle('window-maximize', () => {
    const win = global.mainWindow
    if (win) {
        if (win.isMaximized()) {
            win.unmaximize()
        } else {
            win.maximize()
        }
    }
})

ipcMain.handle('window-close', () => {
    const win = global.mainWindow
    if (win) win.close()
})