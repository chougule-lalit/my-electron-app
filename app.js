// Main Alpine.js application
function invoiceApp() {
    return {
        // Application state
        currentView: 'dashboard',
        isLoading: false,

        // Data stores
        settings: {},
        invoices: [],
        items: [],

        // Settings form data
        settingsForm: {
            businessName: '',
            address: '',
            gstin: '',
            ownerName: '',
            ownerPhone: '',
            logoPath: ''
        },

        // Current invoice being edited
        currentInvoice: {
            id: null,
            invoiceNumber: '',
            customerName: '',
            invoiceDate: '',
            items: [],
            grandTotal: 0
        },

        // Initialize the application
        init() {
            console.log('Invoice Generator App initialized');
            try {
                this.loadInitialData();
            } catch (error) {
                console.error('Error during app initialization:', error);
            }
        },

        // Load initial data from database
        async loadInitialData() {
            this.isLoading = true;
            try {
                await this.loadSettings();
                await this.loadInvoices();
                await this.loadItems();
                this.populateSettingsForm();
            } catch (error) {
                console.error('Error loading initial data:', error);
                this.showError('Failed to load application data');
            } finally {
                this.isLoading = false;
            }
        },

        // Populate settings form with loaded data
        populateSettingsForm() {
            this.settingsForm = {
                businessName: this.settings.businessName || '',
                address: this.settings.address || '',
                gstin: this.settings.gstin || '',
                ownerName: this.settings.ownerName || '',
                ownerPhone: this.settings.ownerPhone || '',
                logoPath: this.settings.logoPath ? `file://${this.settings.logoPath}` : ''
            };

            // Update window title
            this.updateWindowTitle();
        },

        // Update window title dynamically
        updateWindowTitle() {
            const title = this.settings.businessName || this.settingsForm.businessName || 'Vijay Stores';
            document.title = title;
        },

        // Database operations
        async loadSettings() {
            try {
                this.settings = await window.electronAPI.getSettings();
            } catch (error) {
                console.error('Error loading settings:', error);
                this.settings = {};
            }
        },

        async loadInvoices() {
            try {
                this.invoices = await window.electronAPI.getInvoices();
            } catch (error) {
                console.error('Error loading invoices:', error);
                this.invoices = [];
            }
        },

        async loadItems() {
            try {
                this.items = await window.electronAPI.getItems();
            } catch (error) {
                console.error('Error loading items:', error);
                this.items = [];
            }
        },

        // Navigation
        createNewInvoice() {
            this.currentView = 'invoice';
            this.resetCurrentInvoice();
            this.generateInvoiceNumber();

            // Ensure form is properly enabled and focused after a short delay
            setTimeout(() => {
                this.enableAllFormInputs();
                // Find the customer name input and focus it
                const customerInput = document.querySelector('input[x-model="currentInvoice.customerName"]');
                if (customerInput) {
                    customerInput.focus();
                }
            }, 100);
        },

        // Helper method to enable all form inputs
        enableAllFormInputs() {
            const allInputs = document.querySelectorAll('#invoice-form input, #invoice-form textarea, #invoice-form select');
            allInputs.forEach(input => {
                if (!input.hasAttribute('readonly')) {
                    input.disabled = false;
                    input.style.pointerEvents = 'auto';
                    input.style.opacity = '1';
                }
            });
        },

        resetCurrentInvoice() {
            // Force reactivity by using a completely new object
            this.currentInvoice = {
                id: null,
                invoiceNumber: '',
                customerName: '',
                invoiceDate: this.getTodayDateString(),
                items: [this.createEmptyItem()],
                grandTotal: 0
            };

            // Clear any loading states
            this.isLoading = false;
        },

        createEmptyItem() {
            return {
                name: '',
                quantity: 1,
                rate: 0,
                amount: 0,
                suggestions: [],
                showSuggestions: false,
                selectedSuggestionIndex: -1,
                searchTimer: null
            };
        },

        async generateInvoiceNumber() {
            try {
                this.currentInvoice.invoiceNumber = await window.electronAPI.getNextInvoiceNumber();
            } catch (error) {
                console.error('Error generating invoice number:', error);
                // Fallback to a simple number
                this.currentInvoice.invoiceNumber = `INV${String(this.invoices.length + 1).padStart(4, '0')}`;
            }
        },

        // Invoice Item Management
        addInvoiceItem() {
            this.currentInvoice.items.push(this.createEmptyItem());
        },

        removeInvoiceItem(index) {
            if (this.currentInvoice.items.length > 1) {
                this.currentInvoice.items.splice(index, 1);
                this.calculateGrandTotal();
            }
        },

        calculateItemAmount(index) {
            const item = this.currentInvoice.items[index];
            item.amount = (item.quantity || 0) * (item.rate || 0);
            this.calculateGrandTotal();
        },

        calculateGrandTotal() {
            this.currentInvoice.grandTotal = this.currentInvoice.items.reduce((total, item) => {
                return total + (item.amount || 0);
            }, 0);
        },

        // Item Suggestions - Enhanced with fuzzy search and prioritization
        async updateItemSuggestions(query, index) {
            const item = this.currentInvoice.items[index];

            if (query.length < 1) {
                item.suggestions = [];
                return;
            }

            // Clear previous debounce timer
            if (item.searchTimer) {
                clearTimeout(item.searchTimer);
            }

            // Debounce search to avoid excessive filtering
            item.searchTimer = setTimeout(() => {
                this.performItemSearch(query, index);
            }, 300);
        },

        performItemSearch(query, index) {
            const item = this.currentInvoice.items[index];
            const searchQuery = query.toLowerCase().trim();

            if (searchQuery.length === 0) {
                item.suggestions = [];
                return;
            }

            // Enhanced fuzzy search with scoring
            const suggestions = this.items.map(masterItem => {
                    const name = masterItem.name.toLowerCase();
                    let score = 0;

                    // Exact match gets highest score
                    if (name === searchQuery) {
                        score = 100;
                    }
                    // Starts with query gets high score
                    else if (name.startsWith(searchQuery)) {
                        score = 80;
                    }
                    // Contains query gets medium score
                    else if (name.includes(searchQuery)) {
                        score = 60;
                    }
                    // Fuzzy match (individual characters)
                    else if (this.fuzzyMatch(searchQuery, name)) {
                        score = 40;
                    }

                    // Boost score for frequently used items
                    if (masterItem.frequency) {
                        score += Math.min(masterItem.frequency * 2, 20);
                    }

                    // Boost score for recently used items
                    if (masterItem.lastUsed) {
                        const daysSinceUsed = (Date.now() - new Date(masterItem.lastUsed)) / (1000 * 60 * 60 * 24);
                        if (daysSinceUsed < 7) {
                            score += 15 - Math.floor(daysSinceUsed * 2);
                        }
                    }

                    return {...masterItem, score };
                })
                .filter(item => item.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, 8); // Show up to 8 suggestions

            item.suggestions = suggestions;
        },

        // Simple fuzzy matching algorithm
        fuzzyMatch(pattern, text) {
            let patternIndex = 0;
            for (let i = 0; i < text.length && patternIndex < pattern.length; i++) {
                if (text[i] === pattern[patternIndex]) {
                    patternIndex++;
                }
            }
            return patternIndex === pattern.length;
        },

        showSuggestions(index) {
            this.currentInvoice.items[index].showSuggestions = true;
            this.currentInvoice.items[index].selectedSuggestionIndex = -1;
        },

        hideSuggestions(index) {
            // Add a small delay to allow for click events on suggestions
            setTimeout(() => {
                this.currentInvoice.items[index].showSuggestions = false;
                this.currentInvoice.items[index].selectedSuggestionIndex = -1;
            }, 150);
        },

        // Enhanced keyboard navigation for suggestions
        handleSuggestionKeydown(event, index) {
            const item = this.currentInvoice.items[index];

            if (!item.showSuggestions || item.suggestions.length === 0) {
                return;
            }

            switch (event.key) {
                case 'ArrowDown':
                    event.preventDefault();
                    item.selectedSuggestionIndex = Math.min(
                        item.selectedSuggestionIndex + 1,
                        item.suggestions.length - 1
                    );
                    break;

                case 'ArrowUp':
                    event.preventDefault();
                    item.selectedSuggestionIndex = Math.max(
                        item.selectedSuggestionIndex - 1, -1
                    );
                    break;

                case 'Enter':
                    event.preventDefault();
                    if (item.selectedSuggestionIndex >= 0) {
                        this.selectSuggestion(index, item.suggestions[item.selectedSuggestionIndex]);
                    }
                    break;

                case 'Escape':
                    event.preventDefault();
                    item.showSuggestions = false;
                    item.selectedSuggestionIndex = -1;
                    break;
            }
        },

        selectSuggestion(index, suggestion) {
            const item = this.currentInvoice.items[index];
            item.name = suggestion.name;
            item.rate = suggestion.rate;
            item.suggestions = [];
            item.showSuggestions = false;
            item.selectedSuggestionIndex = -1;
            this.calculateItemAmount(index);

            // Update usage statistics
            this.updateItemUsageStats(suggestion.name);
        },

        // Track item usage for better suggestions
        async updateItemUsageStats(itemName) {
            try {
                await window.electronAPI.updateItemUsage(itemName);
                // Refresh items to get updated usage stats
                await this.loadItems();
            } catch (error) {
                console.error('Error updating item usage stats:', error);
            }
        },

        // Invoice Validation and Saving
        canSaveInvoice() {
            return this.currentInvoice.customerName.trim() !== '' &&
                this.currentInvoice.items.some(item => item.name.trim() !== '');
        },

        async saveInvoice() {
            if (!this.canSaveInvoice()) {
                this.showError('Please fill in customer name and at least one item.');
                return;
            }

            this.isLoading = true;
            try {
                // Clean and prepare invoice data
                const cleanItems = this.currentInvoice.items
                    .filter(item => item.name.trim() !== '')
                    .map(item => ({
                        name: item.name,
                        quantity: item.quantity || 1,
                        rate: item.rate || 0,
                        amount: item.amount || 0
                    }));

                const invoiceData = {
                    id: this.currentInvoice.id,
                    invoiceNumber: this.currentInvoice.invoiceNumber,
                    customerName: this.currentInvoice.customerName.trim(),
                    invoiceDate: this.currentInvoice.invoiceDate,
                    grandTotal: this.currentInvoice.grandTotal,
                    items: cleanItems
                };

                console.log('Saving invoice data:', invoiceData);

                // Save invoice to database
                const savedInvoice = await window.electronAPI.saveInvoice(invoiceData);

                // Update items master list with new items
                await this.updateItemsMasterList(cleanItems);

                // Refresh data
                await this.loadInvoices();
                await this.loadItems();

                this.showSuccess('Invoice saved successfully!');

                // Reset current invoice for a fresh start
                this.resetCurrentInvoice();
                this.generateInvoiceNumber();

                // Navigate back to dashboard
                this.currentView = 'dashboard';

            } catch (error) {
                console.error('Error saving invoice:', error);
                this.showError('Failed to save invoice. Please try again.');
            } finally {
                this.isLoading = false;
            }
        },

        async updateItemsMasterList(invoiceItems) {
            try {
                for (const item of invoiceItems) {
                    if (item.name.trim() !== '' && item.rate > 0) {
                        await window.electronAPI.saveItem(item.name, item.rate);
                    }
                }
            } catch (error) {
                console.error('Error updating items master list:', error);
            }
        },

        // Print and PDF functionality
        async printInvoice() {
            if (!this.canSaveInvoice()) {
                this.showError('Please complete the invoice before printing.');
                return;
            }

            console.log('Print button clicked, showing print preview...');

            try {
                // Always show print preview for now (more reliable)
                this.currentView = 'print-preview';

                // Optional: Check if direct printing is available in the background
                // This can be enhanced later for direct printing
                /*
                const hasPrinter = await window.electronAPI.checkPrinterAvailable();
                if (hasPrinter) {
                    // Direct print functionality can be added here
                }
                */
            } catch (error) {
                console.error('Error in print function:', error);
                this.showError('Error accessing print functionality. Please try again.');
            }
        },

        // Show print preview for current invoice (called from invoice editor)
        async showPrintPreview() {
            if (!this.canSaveInvoice()) {
                this.showError('Please complete the invoice before previewing.');
                return;
            }

            try {
                // Ensure currentInvoice has properly formatted items
                if (!this.currentInvoice.items || this.currentInvoice.items.length === 0) {
                    this.showError('Please add at least one item to the invoice.');
                    return;
                }

                // Filter out empty items
                this.currentInvoice.items = this.currentInvoice.items.filter(item =>
                    item.name && item.name.trim() !== ''
                );

                if (this.currentInvoice.items.length === 0) {
                    this.showError('Please add at least one item to the invoice.');
                    return;
                }

                // Navigate to print preview
                this.currentView = 'print-preview';
            } catch (error) {
                console.error('Error showing print preview:', error);
                this.showError('Failed to show print preview: ' + error.message);
            }
        },

        // Direct print function (can be called from print preview)
        async directPrint() {
            if (!this.canSaveInvoice()) {
                this.showError('Please complete the invoice before printing.');
                return;
            }

            this.isLoading = true;
            try {
                // Clean the invoice data - remove circular references and functions
                const cleanInvoice = {
                    id: this.currentInvoice.id || null,
                    invoiceNumber: this.currentInvoice.invoiceNumber || '',
                    customerName: this.currentInvoice.customerName || '',
                    invoiceDate: this.currentInvoice.invoiceDate || '',
                    grandTotal: this.currentInvoice.grandTotal || 0,
                    items: (this.currentInvoice.items || []).map(item => ({
                        name: item.name || item.itemName || '', // Handle both field names
                        quantity: item.quantity || 0,
                        rate: item.rate || 0,
                        amount: item.amount || 0
                    })).filter(item => item.name && item.name.trim() !== '')
                };

                // Clean the settings data
                const cleanSettings = {
                    businessName: this.settings.businessName || '',
                    address: this.settings.address || '',
                    gstin: this.settings.gstin || '',
                    ownerName: this.settings.ownerName || '',
                    ownerPhone: this.settings.ownerPhone || '',
                    logoPath: this.settings.logoPath || ''
                };

                // Serialize data for IPC transfer
                const invoiceData = {
                    invoice: JSON.stringify(cleanInvoice),
                    settings: JSON.stringify(cleanSettings)
                };

                // Direct print
                await window.electronAPI.printInvoice(invoiceData);
                this.showSuccess('Print job sent successfully!');
            } catch (error) {
                console.error('Error with direct printing:', error);
                this.showError(`Printing failed: ${error.message || 'Unknown error'}`);
            } finally {
                this.isLoading = false;
            }
        },

        async saveAsPDF() {
            if (!this.canSaveInvoice()) {
                this.showError('Please complete the invoice before saving as PDF.');
                return;
            }

            this.isLoading = true;
            try {
                console.log('Preparing invoice data for PDF generation...');
                this.showSuccess('Generating PDF... Please wait.');

                // Clean the invoice data - remove circular references and functions
                const cleanInvoice = {
                    id: this.currentInvoice.id,
                    invoiceNumber: this.currentInvoice.invoiceNumber,
                    customerName: this.currentInvoice.customerName,
                    invoiceDate: this.currentInvoice.invoiceDate,
                    grandTotal: this.currentInvoice.grandTotal,
                    items: this.currentInvoice.items.map(item => ({
                        name: item.name,
                        quantity: item.quantity,
                        rate: item.rate,
                        amount: item.amount
                    })).filter(item => item.name && item.name.trim() !== '')
                };

                // Clean the settings data
                const cleanSettings = {
                    businessName: this.settings.businessName || '',
                    address: this.settings.address || '',
                    gstin: this.settings.gstin || '',
                    ownerName: this.settings.ownerName || '',
                    ownerPhone: this.settings.ownerPhone || '',
                    logoPath: this.settings.logoPath || ''
                };

                // Serialize data properly for IPC transfer
                const invoiceData = {
                    invoice: JSON.stringify(cleanInvoice),
                    settings: JSON.stringify(cleanSettings)
                };

                console.log('Calling PDF generation...');
                const pdfPath = await window.electronAPI.saveInvoiceAsPDF(invoiceData);
                if (pdfPath) {
                    this.showSuccess(`Invoice saved as PDF successfully!`);
                    // Return to invoice view after successful save
                    setTimeout(() => {
                        this.currentView = 'invoice';
                    }, 1500);
                }
            } catch (error) {
                console.error('Error saving PDF:', error);
                this.showError(`Failed to save PDF: ${error.message || 'Unknown error'}`);
            } finally {
                this.isLoading = false;
            }
        }, // Settings Management
        async saveSettings() {
            this.isLoading = true;
            try {
                // Prepare settings data for database (strip file:// from logo path)
                const settingsToSave = {
                    ...this.settingsForm,
                    logoPath: this.settingsForm.logoPath.startsWith('file://') ?
                        this.settingsForm.logoPath.substring(7) : this.settingsForm.logoPath
                };

                // Save settings to database
                await window.electronAPI.saveSettings(settingsToSave);

                // Update local settings
                this.settings = {...settingsToSave };

                // Update window title
                this.updateWindowTitle();

                this.showSuccess('Settings saved successfully!');
            } catch (error) {
                console.error('Error saving settings:', error);
                this.showError('Failed to save settings. Please try again.');
            } finally {
                this.isLoading = false;
            }
        },

        // Handle logo upload
        async handleLogoUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            // Validate file type
            if (!file.type.startsWith('image/')) {
                this.showError('Please select a valid image file.');
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                this.showError('Image file is too large. Please select a file smaller than 5MB.');
                return;
            }

            try {
                // Read file as array buffer
                const arrayBuffer = await file.arrayBuffer();
                const fileData = {
                    name: file.name,
                    data: Array.from(new Uint8Array(arrayBuffer))
                };

                // Save logo file and get path
                const logoPath = await window.electronAPI.saveLogo(fileData);

                // Create a file:// URL for display
                this.settingsForm.logoPath = `file://${logoPath}`;

                this.showSuccess('Logo uploaded successfully!');
            } catch (error) {
                console.error('Error uploading logo:', error);
                this.showError('Failed to upload logo. Please try again.');
            }
        },

        // Remove logo
        removeLogo() {
            this.settingsForm.logoPath = '';
        },

        // Utility functions
        getTodayDateString() {
            return new Date().toISOString().split('T')[0];
        },

        // Window control functions
        async minimizeWindow() {
            await window.electronAPI.minimizeWindow();
        },

        async maximizeWindow() {
            await window.electronAPI.maximizeWindow();
        },

        async closeWindow() {
            await window.electronAPI.closeWindow();
        },

        formatCurrency(amount) {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR'
            }).format(amount || 0);
        },

        formatDate(dateString) {
            return new Date(dateString).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        },

        // Animation helpers
        fadeIn(element) {
            element.style.opacity = '0';
            element.style.transform = 'translateY(20px)';
            element.offsetHeight; // Force reflow
            element.style.transition = 'all 0.3s ease';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        },

        // Dashboard and Invoice Management Functions

        // Filter and search state
        searchQuery: '',
        dateFilter: {
            startDate: '',
            endDate: ''
        },
        sortBy: 'date-desc',
        filteredInvoices: [],

        // Initialize filtered invoices when data loads
        initializeFiltering() {
            this.filteredInvoices = [...this.invoices];
            this.filterInvoices();
        },

        // Main filtering function
        filterInvoices() {
            let filtered = [...this.invoices];

            // Filter by search query (customer name)
            if (this.searchQuery && this.searchQuery.trim()) {
                const query = this.searchQuery.toLowerCase().trim();
                filtered = filtered.filter(invoice =>
                    invoice.customerName.toLowerCase().includes(query)
                );
            }

            // Filter by date range
            if (this.dateFilter.startDate) {
                const startDate = new Date(this.dateFilter.startDate);
                filtered = filtered.filter(invoice =>
                    new Date(invoice.invoiceDate) >= startDate
                );
            }

            if (this.dateFilter.endDate) {
                const endDate = new Date(this.dateFilter.endDate);
                endDate.setHours(23, 59, 59, 999); // Include the entire end date
                filtered = filtered.filter(invoice =>
                    new Date(invoice.invoiceDate) <= endDate
                );
            }

            // Sort the results
            this.sortInvoices(filtered);

            this.filteredInvoices = filtered;
        },

        // Sorting function
        sortInvoices(invoices) {
            invoices.sort((a, b) => {
                switch (this.sortBy) {
                    case 'date-desc':
                        return new Date(b.invoiceDate) - new Date(a.invoiceDate);
                    case 'date-asc':
                        return new Date(a.invoiceDate) - new Date(b.invoiceDate);
                    case 'number-desc':
                        return b.invoiceNumber.localeCompare(a.invoiceNumber);
                    case 'number-asc':
                        return a.invoiceNumber.localeCompare(b.invoiceNumber);
                    case 'customer-asc':
                        return a.customerName.localeCompare(b.customerName);
                    case 'customer-desc':
                        return b.customerName.localeCompare(a.customerName);
                    case 'amount-desc':
                        return (b.grandTotal || 0) - (a.grandTotal || 0);
                    case 'amount-asc':
                        return (a.grandTotal || 0) - (b.grandTotal || 0);
                    default:
                        return 0;
                }
            });
        },

        // Clear all filters
        clearFilters() {
            this.searchQuery = '';
            this.dateFilter.startDate = '';
            this.dateFilter.endDate = '';
            this.sortBy = 'date-desc';
            this.filterInvoices();
        },

        // Invoice actions
        async editInvoice(invoice) {
            try {
                this.isLoading = true;

                // Load the full invoice with items
                const fullInvoice = await window.electronAPI.getInvoice(invoice.id);

                // Populate the current invoice
                this.currentInvoice = {
                    id: fullInvoice.id,
                    invoiceNumber: fullInvoice.invoiceNumber,
                    customerName: fullInvoice.customerName,
                    invoiceDate: fullInvoice.invoiceDate,
                    items: fullInvoice.items.map(item => ({
                        ...this.createEmptyItem(),
                        name: item.name || item.itemName || '', // Use the mapped name field
                        quantity: item.quantity,
                        rate: item.rate,
                        amount: item.amount
                    })),
                    grandTotal: fullInvoice.grandTotal
                };

                // Switch to invoice editor
                this.currentView = 'invoice';

                // Enable form inputs after a short delay
                setTimeout(() => {
                    this.enableAllFormInputs();
                }, 100);

            } catch (error) {
                console.error('Error loading invoice for editing:', error);
                this.showError('Failed to load invoice for editing');
            } finally {
                this.isLoading = false;
            }
        },

        async printInvoice(invoice) {
            try {
                this.isLoading = true;

                // Load the full invoice with items for print preview
                const fullInvoice = await window.electronAPI.getInvoice(invoice.id);

                // Load the invoice into current invoice for print preview
                this.currentInvoice = {
                    id: fullInvoice.id,
                    invoiceNumber: fullInvoice.invoiceNumber,
                    customerName: fullInvoice.customerName,
                    invoiceDate: fullInvoice.invoiceDate,
                    items: fullInvoice.items.map(item => ({
                        name: item.name || item.itemName || '',
                        quantity: item.quantity || 0,
                        rate: item.rate || 0,
                        amount: item.amount || 0
                    })),
                    grandTotal: fullInvoice.grandTotal
                };

                // Navigate to print preview
                this.currentView = 'print-preview';

            } catch (error) {
                console.error('Error loading invoice for printing:', error);
                this.showError('Failed to load invoice for printing: ' + error.message);
            } finally {
                this.isLoading = false;
            }
        },

        async duplicateInvoice(invoice) {
            try {
                this.isLoading = true;

                // Load the full invoice with items
                const fullInvoice = await window.electronAPI.getInvoice(invoice.id);

                // Create a new invoice based on the existing one
                this.currentInvoice = {
                    id: null, // New invoice
                    invoiceNumber: '', // Will be auto-generated
                    customerName: fullInvoice.customerName,
                    invoiceDate: this.getTodayDateString(),
                    items: fullInvoice.items.map(item => ({
                        ...this.createEmptyItem(),
                        name: item.name || item.itemName || '', // Use the mapped name field
                        quantity: item.quantity,
                        rate: item.rate,
                        amount: item.amount
                    })),
                    grandTotal: fullInvoice.grandTotal
                };

                // Generate new invoice number
                await this.generateInvoiceNumber();

                // Switch to invoice editor
                this.currentView = 'invoice';

                // Enable form inputs after a short delay
                setTimeout(() => {
                    this.enableAllFormInputs();
                }, 100);

            } catch (error) {
                console.error('Error duplicating invoice:', error);
                this.showError('Failed to duplicate invoice');
            } finally {
                this.isLoading = false;
            }
        },

        // Dashboard statistics
        getThisMonthCount() {
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();

            return this.invoices.filter(invoice => {
                const invoiceDate = new Date(invoice.invoiceDate);
                return invoiceDate.getMonth() === currentMonth &&
                    invoiceDate.getFullYear() === currentYear;
            }).length;
        },

        getTotalRevenue() {
            return this.invoices.reduce((total, invoice) => {
                return total + (invoice.grandTotal || 0);
            }, 0);
        },

        getAverageInvoice() {
            if (this.invoices.length === 0) return 0;
            return this.getTotalRevenue() / this.invoices.length;
        },

        getTotalValue() {
            return this.filteredInvoices.reduce((total, invoice) => {
                return total + (invoice.grandTotal || 0);
            }, 0);
        },

        // Utility functions
        formatDate(dateString) {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        },

        formatCurrency(amount) {
            if (!amount && amount !== 0) return '0.00';
            return Number(amount).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        },

        // Override loadInvoices to initialize filtering
        async loadInvoices() {
            try {
                this.invoices = await window.electronAPI.getInvoices();
                this.initializeFiltering();
            } catch (error) {
                console.error('Error loading invoices:', error);
                this.invoices = [];
                this.filteredInvoices = [];
            }
        },

        // Error handling
        showError(message) {
            // Simple error display - can be enhanced with proper notifications
            console.error(message);
            alert('Error: ' + message); // Simple alert for now
        },

        showSuccess(message) {
            // Simple success display - can be enhanced with proper notifications
            console.log(message);
            alert('Success: ' + message); // Simple alert for now
        }
    };
} // Electron API wrapper
window.electronAPI = {
    // Settings
    getSettings: () => window.require('electron').ipcRenderer.invoke('db-get-settings'),
    saveSettings: (settings) => window.require('electron').ipcRenderer.invoke('db-save-settings', settings),
    saveLogo: (file) => window.require('electron').ipcRenderer.invoke('save-logo', file),

    // Items
    getItems: () => window.require('electron').ipcRenderer.invoke('db-get-items'),
    saveItem: (name, rate) => window.require('electron').ipcRenderer.invoke('db-save-item', name, rate),
    updateItemUsage: (name) => window.require('electron').ipcRenderer.invoke('db-update-item-usage', name),

    // Invoices
    getInvoices: () => window.require('electron').ipcRenderer.invoke('db-get-invoices'),
    getInvoice: (id) => window.require('electron').ipcRenderer.invoke('db-get-invoice', id),
    saveInvoice: (invoice) => window.require('electron').ipcRenderer.invoke('db-save-invoice', invoice),
    getNextInvoiceNumber: () => window.require('electron').ipcRenderer.invoke('db-get-next-invoice-number'),

    // Print and PDF
    checkPrinterAvailable: () => window.require('electron').ipcRenderer.invoke('check-printer-available'),
    printInvoice: (invoiceData) => window.require('electron').ipcRenderer.invoke('print-invoice', invoiceData),
    saveInvoiceAsPDF: (invoiceData) => window.require('electron').ipcRenderer.invoke('save-invoice-pdf', invoiceData),

    // Window controls
    minimizeWindow: () => window.require('electron').ipcRenderer.invoke('window-minimize'),
    maximizeWindow: () => window.require('electron').ipcRenderer.invoke('window-maximize'),
    closeWindow: () => window.require('electron').ipcRenderer.invoke('window-close')
};

// Initialize Alpine.js data
document.addEventListener('alpine:init', () => {
    console.log('Alpine.js initialized');
});