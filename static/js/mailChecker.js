class CatchAllMailChecker {
    constructor() {
        this.history = this.loadHistory();
        this.currentResults = [];
        this.isChecking = false;
        this.originalRows = []; // Store original file rows with extra columns
        this.lowCreditWarningShown = false; // Track if low credit warning has been shown
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.updateHistoryDisplay();
        this.setupTabs();
        this.loadAndDisplayCredits(); // Load credits on initialization
    }

    // Load and display credits on page load
    async loadAndDisplayCredits() {
        try {
            const creditsData = await this.checkCredits();
            if (creditsData) {
                this.displayCredits(creditsData.verify_credits);
                
                // Show initial low credit warning if needed
                if (creditsData.verify_credits <= 5 && creditsData.verify_credits > 0) {
                    setTimeout(() => {
                        this.showCreditAlert(`You have ${creditsData.verify_credits} credits remaining. Consider purchasing more credits for uninterrupted email verification.`, 'warning');
                    }, 2000); // Show after 2 seconds
                }
            }
        } catch (error) {
            console.error('Failed to load credits:', error);
        }
    }
    
    setupEventListeners() {
        const checkBtn = document.getElementById('checkBtn');
        const clearBtn = document.getElementById('clearBtn');
        const clearHistoryBtn = document.getElementById('clearHistoryBtn');
        const exportHistoryBtn = document.getElementById('exportHistoryBtn');
        const exportResultsBtn = document.getElementById('exportResultsBtn');
        const fileInput = document.getElementById('fileInput');
        const multipleEmails = document.getElementById('multipleEmails');
        const statusFilter = document.getElementById('statusFilter');
        const searchFilter = document.getElementById('searchFilter');
        
        if (checkBtn) checkBtn.addEventListener('click', () => this.performBulkCheck());
        if (clearBtn) clearBtn.addEventListener('click', () => this.clearCurrentResults());
        if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        if (exportHistoryBtn) exportHistoryBtn.addEventListener('click', () => this.exportHistory());
        if (exportResultsBtn) exportResultsBtn.addEventListener('click', () => this.exportResults());
        if (fileInput) fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        if (multipleEmails) multipleEmails.addEventListener('input', () => this.updateEmailCount());
        if (statusFilter) statusFilter.addEventListener('change', () => this.filterResults());
        if (searchFilter) searchFilter.addEventListener('input', () => this.filterResults());
        
        // Enter key support for single email
        const singleEmail = document.getElementById('singleEmail');
        if (singleEmail) {
            singleEmail.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.performBulkCheck();
            });
        }
        
        // Delegated event for Details button
        const resultsTableBody = document.getElementById('resultsTableBody');
        if (resultsTableBody) {
            resultsTableBody.addEventListener('click', (e) => {
                const btn = e.target.closest('.action-btn.details');
                if (btn) {
                    const idx = btn.getAttribute('data-row-idx');
                    if (idx !== null && this.currentResults[idx]) {
                        this.showDetailsModal(this.currentResults[idx]);
                    }
                }
            });
        }
    }
    
    setupTabs() {
        const tabs = document.querySelectorAll('.tab-btn');
        const panels = document.querySelectorAll('.input-panel');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs and panels
                tabs.forEach(t => t.classList.remove('active'));
                panels.forEach(p => p.classList.remove('active'));
                
                // Add active class to clicked tab
                tab.classList.add('active');
                
                // Show corresponding panel
                const panelId = tab.id.replace('Tab', 'Panel');
                const panel = document.getElementById(panelId);
                if (panel) panel.classList.add('active');
            });
        });
    }
    
    updateEmailCount() {
        const textarea = document.getElementById('multipleEmails');
        const emailCount = document.getElementById('emailCount');
        if (textarea && emailCount) {
            const emails = this.parseEmailsFromText(textarea.value);
            emailCount.textContent = `${emails.length} emails entered`;
        }
    }
    
    parseEmailsFromText(text) {
        if (!text.trim()) return [];

        // Split by lines and commas, then filter valid emails
        const lines = text.split(/[\n,;]/).map(line => line.trim()).filter(line => line);
        return lines.filter(email => this.isValidEmail(email));
    }
    
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const fileInfo = document.getElementById('fileInfo');
        const filePreview = document.getElementById('filePreview');
        
        if (fileInfo) {
            fileInfo.style.display = 'block';
            const fileName = fileInfo.querySelector('.file-name');
            const fileSize = fileInfo.querySelector('.file-size');
            if (fileName) fileName.textContent = file.name;
            if (fileSize) fileSize.textContent = this.formatFileSize(file.size);
        }
        
        try {
            let emails = [];
            let originalRows = [];
            
            if (file.name.endsWith('.csv')) {
                const { emails: parsedEmails, rows } = await this.parseCSVWithColumns(file);
                emails = parsedEmails;
                originalRows = rows;
            } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                const { emails: parsedEmails, rows } = await this.parseExcelWithColumns(file);
                emails = parsedEmails;
                originalRows = rows;
            }
            
            const previewEmails = emails.slice(0, 10);
            if (filePreview) {
                filePreview.innerHTML = `
                    <strong>Found ${emails.length} emails:</strong><br>
                    ${previewEmails.join('<br>')}
                    ${emails.length > 10 ? `<br><em>... and ${emails.length - 10} more</em>` : ''}
                `;
            }
            
            this.fileEmails = emails;
            this.originalRows = originalRows;
        } catch (error) {
            console.error('File parsing error:', error);
            if (filePreview) {
                filePreview.innerHTML = `<span style="color: #e53e3e;">Error parsing file: ${error.message}</span>`;
            }
        }
    }
    
    async parseCSVWithColumns(file) {
        const text = await file.text();
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        let headers = [];
        let rows = [];
        let emails = [];
        
        lines.forEach((line, index) => {
            const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
            
            if (index === 0) {
                headers = columns;
                return;
            }
            
            const rowObj = {};
            headers.forEach((h, i) => rowObj[h] = columns[i] || '');
            rows.push(rowObj);
            
            // Try to find email in each column
            for (const col of columns) {
                if (this.isValidEmail(col)) {
                    emails.push(col);
                    rowObj.__email = col;
                    break;
                }
            }
        });
        
        return { emails: [...new Set(emails)], rows };
    }
    
    async parseExcelWithColumns(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
                    
                    let emails = [];
                    let rows = [];
                    
                    json.forEach(rowObj => {
                        rows.push(rowObj);
                        for (const key in rowObj) {
                            if (rowObj.hasOwnProperty(key) && typeof rowObj[key] === 'string' && this.isValidEmail(rowObj[key])) {
                                emails.push(rowObj[key]);
                                rowObj.__email = rowObj[key];
                                break;
                            }
                        }
                    });
                    
                    resolve({ emails: [...new Set(emails)], rows });
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = (err) => reject(err);
            reader.readAsArrayBuffer(file);
        });
    }
    
    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
    
    getEmailsToCheck() {
        const activeTab = document.querySelector('.tab-btn.active');
        if (!activeTab) return [];
        
        const tabId = activeTab.id;

        switch (tabId) {
            case 'singleTab':
                const singleEmail = document.getElementById('singleEmail');
                if (singleEmail) {
                    const email = singleEmail.value.trim();
                    return email && this.isValidEmail(email) ? [email] : [];
                }
                return [];

            case 'multipleTab':
                const multipleEmails = document.getElementById('multipleEmails');
                if (multipleEmails) {
                    return this.parseEmailsFromText(multipleEmails.value);
                }
                return [];

            case 'fileTab':
                return this.fileEmails || [];

            default:
                return [];
        }
    }
    
    async performBulkCheck() {
        if (this.isChecking) return;
        
        const emails = this.getEmailsToCheck();
        if (emails.length === 0) {
            alert('Please enter at least one valid email address');
            return;
        }
        
        // Check initial credits
        const initialCredits = await this.checkCredits();
        if (!initialCredits) {
            this.showCreditAlert('Unable to check credits. Please try again later.', 'error');
            return;
        }
        
        if (initialCredits.verify_credits <= 0) {
            this.showCreditAlert('Your credits are 0. Please purchase more credits to continue email verification.', 'error');
            return;
        }
        
        if (emails.length > initialCredits.verify_credits) {
            const proceed = confirm(`You have ${initialCredits.verify_credits} credits but want to check ${emails.length} emails. Only ${initialCredits.verify_credits} emails will be checked. Continue?`);
            if (!proceed) {
                return;
            }
        }
        
        if (emails.length > 100) {
            if (!confirm(`You're about to check ${emails.length} emails. This may take a while. Continue?`)) {
                return;
            }
        }
        
        this.isChecking = true;
        this.showLoading(true);
        this.showResults(true);
        this.showProgress(true);
        this.currentResults = [];
        
        const totalEmails = emails.length;
        let processedEmails = 0;
        let currentCredits = initialCredits.verify_credits;
        
        this.updateProgress(0, totalEmails);
        
        try {
            for (let i = 0; i < emails.length; i++) {
                const email = emails[i];
                
                // Check credits before each verification
                if (currentCredits <= 0) {
                    this.showCreditAlert('Your credits are 0. Email verification has been stopped.', 'error');
                    break;
                }
                
                try {
                    const result = await this.checkWithBackend(email);
                    
                    // Update current credits from response
                    if (result.remaining_credits !== undefined) {
                        currentCredits = result.remaining_credits;
                        this.displayCredits(currentCredits);
                        
                        // Show low credit warning
                        if (currentCredits <= 10 && currentCredits > 0) {
                            // Only show warning once per session
                            if (!this.lowCreditWarningShown) {
                                this.showCreditAlert(`Low credit warning: You have ${currentCredits} credits remaining. Consider purchasing more credits to continue verification.`, 'warning');
                                this.lowCreditWarningShown = true;
                            }
                        }
                    }
                    
                    // Attach original row if available
                    if (this.originalRows && this.originalRows.length) {
                        const orig = this.originalRows.find(r => r.__email === email);
                        if (orig) result._original = orig;
                    }
                    
                    this.currentResults.push(result);
                    processedEmails++;
                    
                    this.updateProgress(processedEmails, totalEmails);
                    this.updateResultsDisplay();
                    
                    // Check if credits are exhausted
                    if (currentCredits <= 0) {
                        this.showCreditAlert('Your credits are 0. Email verification has been stopped.', 'error');
                        break;
                    }
                    
                } catch (error) {
                    if (error.message.includes('INSUFFICIENT_CREDITS')) {
                        this.showCreditAlert('Your credits are 0. Email verification has been stopped.', 'error');
                        break;
                    }
                    
                    // For other errors, add error result and continue
                    this.currentResults.push({
                        email: email,
                        status: 'error',
                        reason: error.message,
                        score: 0.0
                    });
                    processedEmails++;
                    this.updateProgress(processedEmails, totalEmails);
                    this.updateResultsDisplay();
                }
            }
            
            const checkResult = {
                timestamp: new Date().toISOString(),
                totalEmails: processedEmails,
                results: this.currentResults,
                summary: this.calculateSummary(this.currentResults)
            };
            
            this.addToHistory(checkResult);
            
            // Show success message
            if (processedEmails > 0) {
                this.showSuccessMessage(processedEmails, currentCredits);
            }
        } catch (error) {
            console.error('Bulk check failed:', error);
            alert('An error occurred during the check. Please try again.');
        } finally {
            this.isChecking = false;
            this.showLoading(false);
            this.showProgress(false);
            const clearBtn = document.getElementById('clearBtn');
            if (clearBtn) clearBtn.style.display = 'inline-flex';
        }
    }
    
    async checkSingleEmail(email) {
        // No longer used, all logic moved to backend
        return await this.checkWithBackend(email);
    }
    
    // Updated to use Django REST API with credit checking
    async checkWithBackend(email, retries = 2) {
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                // Get CSRF token from hidden input or cookie
                let csrfToken = '';
                const csrfInput = document.querySelector('[name=csrfmiddlewaretoken]');
                if (csrfInput) {
                    csrfToken = csrfInput.value;
                } else {
                    // Fallback to cookie
                    const cookies = document.cookie.split(';');
                    for (let cookie of cookies) {
                        const [name, value] = cookie.trim().split('=');
                        if (name === 'csrftoken') {
                            csrfToken = value;
                            break;
                        }
                    }
                }
                
                const response = await fetch('/verifier/api/check-email/', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrfToken
                    },
                    body: JSON.stringify({ email })
                });
                
                if (!response.ok) {
                    if (response.status === 402) {
                        // Payment required - insufficient credits
                        const errorData = await response.json();
                        throw new Error(`INSUFFICIENT_CREDITS: ${errorData.message || 'Insufficient verify credits'}`);
                    }
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }
                
                const data = await response.json();
                return data;
            } catch (e) {
                if (e.message.includes('INSUFFICIENT_CREDITS')) {
                    // Don't retry on insufficient credits
                    throw e;
                }
                if (attempt === retries) {
                    return { email, status: 'error', reason: e.message };
                }
                await new Promise(res => setTimeout(res, 500 * (attempt + 1)));
            }
        }
    }
    
    // Method to check user's current credits
    async checkCredits() {
        try {
            let csrfToken = '';
            const csrfInput = document.querySelector('[name=csrfmiddlewaretoken]');
            if (csrfInput) {
                csrfToken = csrfInput.value;
            } else {
                const cookies = document.cookie.split(';');
                for (let cookie of cookies) {
                    const [name, value] = cookie.trim().split('=');
                    if (name === 'csrftoken') {
                        csrfToken = value;
                        break;
                    }
                }
            }
            
            const response = await fetch('/verifier/api/check-credits/', {
                method: 'GET',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }
            
            const data = await response.json();
            return data;
        } catch (e) {
            console.error('Failed to check credits:', e);
            return null;
        }
    }

    // Method to display credit information
    displayCredits(credits) {
        console.log(`Remaining credits: ${credits}`);
        
        // Update any credit display elements
        const creditElements = document.querySelectorAll('.credits-display');
        creditElements.forEach(element => {
            element.textContent = credits;
            
            // Remove existing credit classes
            element.classList.remove('credits-high', 'credits-medium', 'credits-low');
            
            // Add appropriate class based on credit amount
            if (credits >= 100) {
                element.classList.add('credits-high');
            } else if (credits >= 10) {
                element.classList.add('credits-medium');
            } else {
                element.classList.add('credits-low');
            }
        });
        
        // Update page title for low credits
        const pageTitle = document.querySelector('title');
        if (pageTitle && credits <= 10) {
            pageTitle.textContent = `(${credits} credits) Email Verifier`;
        }
    }

    // Risk assessment for each result
    getRiskLevel(r) {
        // Minimum safe conditions
        const isValid = r.status === 'valid' || r.status === 'deliverable';
        const notDisposable = r.is_disposable === false;
        const notBlacklisted = r.is_blacklisted === false;
        const notRole = r.is_role_based === false;
        const goodScore = typeof r.score === 'number' && r.score >= 0.7;
        const hasSPF = !!r.spf;
        const hasDKIM = !!r.dkim;
        const hasDMARC = !!r.dmarc;
        
        // At least one of SPF, DKIM, DMARC
        const hasAnyAuth = hasSPF || hasDKIM || hasDMARC;
        
        // Safe: all minimums met
        if (isValid && notDisposable && notBlacklisted && notRole && goodScore && hasAnyAuth) return '✅ safe';
        
        // High risk: any of these are bad
        if (!isValid || r.is_blacklisted || r.is_disposable || (typeof r.score === 'number' && r.score < 0.4)) return '❌ high';
        
        // Medium: not safe, not high
        return '⚠️ medium';
    }
    
    displayResults(results) {
        // Show all relevant info from backend
        const tbody = document.getElementById('resultsTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = results.map((r, idx) => {
            const risk = this.getRiskLevel(r);
            let riskColor = '';
            if (risk === '✅ safe') riskColor = 'style="color:green;font-weight:bold"';
            else if (risk === '⚠️ medium') riskColor = 'style="color:orange;font-weight:bold"';
            else if (risk === '❌ high') riskColor = 'style="color:red;font-weight:bold"';
            
            return `
            <tr>
                <td>${r.email || '-'}</td>
                <td>${r.email ? r.email.split('@')[1] : '-'}</td>
                <td>${r.is_free_provider ? 'Free' : r.is_disposable ? 'Disposable' : r.is_role_based ? 'Role' : '-'}</td>
                <td>${r.is_blacklisted ? 'Blacklisted' : '-'}</td>
                <td>${r.status === 'valid' ? '✔️' : r.status === 'catch-all' ? '⚠️' : r.status === 'invalid' ? '❌' : r.status === 'error' ? '❗' : '-'}</td>
                <td>${r.is_catch_all ? 'Yes' : 'No'}</td>
                <td>${typeof r.score === 'number' ? Math.round(r.score * 100) : '-'}</td>
                <td ${riskColor}>${risk}</td>
                <td><button class="action-btn details" data-row-idx="${idx}">Details</button></td>
            </tr>
            `;
        }).join('');
    }
    
    calculateSummary(results) {
        let valid = 0, invalid = 0, catchAll = 0;
        results.forEach(r => {
            if (r.is_catch_all) catchAll++;
            else if (r.status === 'valid') valid++;
            else invalid++;
        });
        return { total: results.length, valid, catchAll, invalid };
    }
    
    updateResultsDisplay() {
        // Update summary stats
        const summary = this.calculateSummary(this.currentResults);
        const totalEmails = document.getElementById('totalEmails');
        const validEmails = document.getElementById('validEmails');
        const catchAllEmails = document.getElementById('catchAllEmails');
        const invalidEmails = document.getElementById('invalidEmails');
        const summaryStats = document.getElementById('summaryStats');
        const resultsTableContainer = document.getElementById('resultsTableContainer');
        
        if (totalEmails) totalEmails.textContent = summary.total;
        if (validEmails) validEmails.textContent = summary.valid;
        if (catchAllEmails) catchAllEmails.textContent = summary.catchAll;
        if (invalidEmails) invalidEmails.textContent = summary.invalid;
        
        if (summaryStats) summaryStats.style.display = 'grid';
        if (resultsTableContainer) resultsTableContainer.style.display = 'block';
        
        this.displayResults(this.currentResults);
    }
    
    renderResultsTable() {
        // Just call updateResultsDisplay
        this.updateResultsDisplay();
    }
    
    filterResults() {
        const statusFilter = document.getElementById('statusFilter');
        const searchFilter = document.getElementById('searchFilter');
        
        if (!statusFilter || !searchFilter) return;
        
        const status = statusFilter.value;
        const search = searchFilter.value.trim().toLowerCase();
        
        let filtered = this.currentResults;
        
        if (status !== 'all') {
            if (status === 'catch-all') {
                filtered = filtered.filter(r => r.is_catch_all);
            } else {
                filtered = filtered.filter(r => r.status === status);
            }
        }
        
        if (search) {
            filtered = filtered.filter(r => (r.email || '').toLowerCase().includes(search));
        }
        
        this.displayResults(filtered);
    }
    
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.style.display = show ? 'flex' : 'none';
    }
    
    showResults(show) {
        const section = document.getElementById('resultsSection');
        if (section) section.style.display = show ? 'block' : 'none';
    }
    
    showProgress(show) {
        const container = document.getElementById('progressContainer');
        if (container) container.style.display = show ? 'block' : 'none';
    }
    
    updateProgress(done, total) {
        const percent = total ? Math.round((done / total) * 100) : 0;
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const progressCount = document.getElementById('progressCount');
        
        if (progressFill) progressFill.style.width = percent + '%';
        if (progressText) progressText.textContent = `Checking emails...`;
        if (progressCount) progressCount.textContent = `${done}/${total}`;
    }
    
    clearCurrentResults() {
        this.currentResults = [];
        const summaryStats = document.getElementById('summaryStats');
        const resultsTableContainer = document.getElementById('resultsTableContainer');
        const resultsSection = document.getElementById('resultsSection');
        const clearBtn = document.getElementById('clearBtn');
        
        if (summaryStats) summaryStats.style.display = 'none';
        if (resultsTableContainer) resultsTableContainer.style.display = 'none';
        if (resultsSection) resultsSection.style.display = 'none';
        if (clearBtn) clearBtn.style.display = 'none';
    }
    
    exportResults() {
        if (!this.currentResults.length) {
            alert('No results to export');
            return;
        }
        
        // Show export filter modal
        const exportModal = document.getElementById('exportFilterModal');
        if (exportModal) exportModal.style.display = 'flex';
    }
    
    addToHistory(checkResult) {
        this.history.unshift(checkResult);
        if (this.history.length > 50) {
            this.history = this.history.slice(0, 50); // Keep only last 50 checks
        }
        
        this.saveHistory();
        this.updateHistoryDisplay();
    }
    
    updateHistoryDisplay() {
        const historyList = document.getElementById('historyList');
        if (!historyList) return;

        if (this.history.length === 0) {
            historyList.innerHTML = '<p class="no-history">No checks performed yet</p>';
            return;
        }
        
        const html = this.history.map(item => {
            const date = new Date(item.timestamp).toLocaleString();
            const summary = item.summary;
            
            return `
                <div class="history-item">
                    <div class="history-item-header">
                        <span class="history-domain">${summary.total} emails checked</span>
                        <span class="history-timestamp">${date}</span>
                    </div>
                    <div class="history-summary">
                        <span class="history-tag tag-success">Valid: ${summary.valid}</span>
                        <span class="history-tag tag-warning">Catch-all: ${summary.catchAll}</span>
                        <span class="history-tag tag-error">Invalid: ${summary.invalid}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        historyList.innerHTML = html;
    }
    
    clearHistory() {
        if (confirm('Are you sure you want to clear all check history?')) {
            this.history = [];
            this.saveHistory();
            this.updateHistoryDisplay();
        }
    }
    
    exportHistory() {
        if (this.history.length === 0) {
            alert('No history to export');
            return;
        }
        
        const exportData = {
            exportDate: new Date().toISOString(),
            totalChecks: this.history.length,
            checks: this.history
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `email-verification-history-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    loadHistory() {
        try {
            const saved = localStorage.getItem('email-verifier-history');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Failed to load history:', error);
            return [];
        }
    }
    
    saveHistory() {
        try {
            localStorage.setItem('email-verifier-history', JSON.stringify(this.history));
        } catch (error) {
            console.error('Failed to save history:', error);
        }
    }
    
    showDetailsModal(result) {
        const detailsHtml = `
            <h3 style="margin-top:0">Details for: <span style="word-break:break-all">${result.email || '-'}</span></h3>
            <table style="width:100%;border-collapse:collapse;font-size:1em;">
                <tbody>
                    <tr><td style='font-weight:bold;'>Email</td><td>${result.email || '-'}</td></tr>
                    <tr><td style='font-weight:bold;'>Status</td><td>${result.status || '-'}</td></tr>
                    <tr><td style='font-weight:bold;'>Reason</td><td>${result.reason || '-'}</td></tr>
                    <tr><td style='font-weight:bold;'>Disposable</td><td>${result.is_disposable ? 'Yes' : 'No'}</td></tr>
                    <tr><td style='font-weight:bold;'>Free Provider</td><td>${result.is_free_provider ? 'Yes' : 'No'}</td></tr>
                    <tr><td style='font-weight:bold;'>Role-based</td><td>${result.is_role_based ? 'Yes' : 'No'}</td></tr>
                    <tr><td style='font-weight:bold;'>Catch-All</td><td>${result.is_catch_all ? 'Yes' : 'No'}</td></tr>
                    <tr><td style='font-weight:bold;'>Blacklisted</td><td>${result.is_blacklisted ? 'Yes' : 'No'}</td></tr>
                    <tr><td style='font-weight:bold;'>Score</td><td>${typeof result.score === 'number' ? Math.round(result.score * 100) : '-'}</td></tr>  
                    <tr><td style='font-weight:bold;'>SPF</td><td>${result.spf ? result.spf : 'None'}</td></tr>
                    <tr><td style='font-weight:bold;'>DKIM</td><td>${result.dkim ? result.dkim : 'None'}</td></tr>
                    <tr><td style='font-weight:bold;'>DMARC</td><td>${result.dmarc ? result.dmarc : 'None'}</td></tr>
                </tbody>
            </table>
        `;
        
        showDetailsModal(result.email, detailsHtml);
    }
    
    // Create and show professional credit alert modal
    showCreditAlert(message, type = 'warning') {
        // Remove existing modal if any
        const existingModal = document.getElementById('creditAlertModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'creditAlertModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease-out;
        `;

        // Define colors and icons based on type
        let bgColor, iconColor, icon, borderColor;
        switch(type) {
            case 'error':
                bgColor = '#fee2e2';
                iconColor = '#dc2626';
                icon = '⚠️';
                borderColor = '#fca5a5';
                break;
            case 'warning':
                bgColor = '#fef3c7';
                iconColor = '#d97706';
                icon = '⚠️';
                borderColor = '#fcd34d';
                break;
            case 'info':
                bgColor = '#dbeafe';
                iconColor = '#2563eb';
                icon = 'ℹ️';
                borderColor = '#93c5fd';
                break;
            default:
                bgColor = '#fef3c7';
                iconColor = '#d97706';
                icon = '⚠️';
                borderColor = '#fcd34d';
        }

        modal.innerHTML = `
            <div style="
                background: white;
                border-radius: 16px;
                padding: 0;
                min-width: 400px;
                max-width: 500px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                border: 1px solid ${borderColor};
                animation: slideIn 0.3s ease-out;
                overflow: hidden;
            ">
                <!-- Header -->
                <div style="
                    background: ${bgColor};
                    padding: 24px;
                    border-bottom: 1px solid ${borderColor};
                    display: flex;
                    align-items: center;
                    gap: 16px;
                ">
                    <div style="
                        width: 48px;
                        height: 48px;
                        background: white;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 24px;
                        color: ${iconColor};
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    ">
                        ${icon}
                    </div>
                    <div>
                        <h3 style="
                            margin: 0;
                            font-size: 20px;
                            font-weight: 600;
                            color: #1f2937;
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        ">Credit Alert</h3>
                        <p style="
                            margin: 4px 0 0 0;
                            font-size: 14px;
                            color: #6b7280;
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        ">Verification Status</p>
                    </div>
                </div>

                <!-- Content -->
                <div style="padding: 24px;">
                    <p style="
                        margin: 0 0 24px 0;
                        font-size: 16px;
                        color: #374151;
                        line-height: 1.6;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    ">${message}</p>
                    
                    <div style="display: flex; gap: 12px; justify-content: flex-end;">
                        <button id="creditAlertClose" style="
                            background: #f3f4f6;
                            color: #374151;
                            border: 1px solid #d1d5db;
                            padding: 12px 24px;
                            border-radius: 8px;
                            font-size: 14px;
                            font-weight: 500;
                            cursor: pointer;
                            transition: all 0.2s;
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        " onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'">
                            Close
                        </button>
                        <button id="creditAlertPurchase" style="
                            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 8px;
                            font-size: 14px;
                            font-weight: 500;
                            cursor: pointer;
                            transition: all 0.2s;
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                            Purchase Credits
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add CSS animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideIn {
                from { 
                    opacity: 0;
                    transform: translateY(-20px) scale(0.95);
                }
                to { 
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(modal);

        // Add event listeners
        const closeBtn = modal.querySelector('#creditAlertClose');
        const purchaseBtn = modal.querySelector('#creditAlertPurchase');

        const closeModal = () => {
            modal.style.animation = 'fadeOut 0.3s ease-out';
            modal.querySelector('div').style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.remove();
                }
            }, 300);
        };

        closeBtn.onclick = closeModal;
        purchaseBtn.onclick = () => {
            // You can redirect to purchase page or show purchase modal
            window.location.href = '/package/'; // Adjust URL as needed
        };

        // Close on overlay click
        modal.onclick = (e) => {
            if (e.target === modal) {
                closeModal();
            }
        };

        // Add fadeOut animation
        style.textContent += `
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            @keyframes slideOut {
                from { 
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
                to { 
                    opacity: 0;
                    transform: translateY(-20px) scale(0.95);
                }
            }
        `;
    }
    
    // Show success message when verification is complete
    showSuccessMessage(processedEmails, remainingCredits) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
            z-index: 10001;
            animation: slideInRight 0.3s ease-out;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            min-width: 300px;
        `;

        modal.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="
                    width: 32px;
                    height: 32px;
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                ">✓</div>
                <div>
                    <div style="font-weight: 600; font-size: 14px;">Verification Complete</div>
                    <div style="font-size: 12px; opacity: 0.9;">
                        ${processedEmails} emails verified • ${remainingCredits} credits remaining
                    </div>
                </div>
            </div>
        `;

        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from { 
                    opacity: 0;
                    transform: translateX(100px);
                }
                to { 
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            @keyframes slideOutRight {
                from { 
                    opacity: 1;
                    transform: translateX(0);
                }
                to { 
                    opacity: 0;
                    transform: translateX(100px);
                }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(modal);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            modal.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.remove();
                }
            }, 300);
        }, 4000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const checker = new CatchAllMailChecker();
    
    // Export filter modal logic
    const exportModal = document.getElementById('exportFilterModal');
    const closeExportModal = document.getElementById('closeExportFilterModal');
    
    if (closeExportModal) {
        closeExportModal.onclick = () => {
            if (exportModal) exportModal.style.display = 'none';
        };
    }
    
    if (exportModal) {
        exportModal.onclick = (e) => { 
            if (e.target === exportModal) exportModal.style.display = 'none'; 
        };
    }
    
    function getExportFilters() {
        const form = document.getElementById('exportFilterForm');
        if (!form) return {};
        
        return {
            valid: form.valid ? form.valid.checked : true,
            invalid: form.invalid ? form.invalid.checked : true,
            catchall: form.catchall ? form.catchall.checked : true,
            safe: form.safe ? form.safe.checked : true,
            medium: form.medium ? form.medium.checked : true,
            risk: form.risk ? form.risk.checked : true
        };
    }
    
    function getRiskLevel(r) {
        const isValid = r.status === 'valid' || r.status === 'deliverable';
        const notDisposable = r.is_disposable === false;
        const notBlacklisted = r.is_blacklisted === false;
        const notRole = r.is_role_based === false;
        const goodScore = typeof r.score === 'number' && r.score >= 0.7;
        const hasSPF = !!r.spf;
        const hasDKIM = !!r.dkim;
        const hasDMARC = !!r.dmarc;
        const hasAnyAuth = hasSPF || hasDKIM || hasDMARC;
        
        if (isValid && notDisposable && notBlacklisted && notRole && goodScore && hasAnyAuth) return 'safe';
        if (!isValid || r.is_blacklisted || r.is_disposable || (typeof r.score === 'number' && r.score < 0.4)) return 'risk';
        return 'medium';
    }
    
    function filterExportResults(results, filters) {
        return results.filter(r => {
            const risk = getRiskLevel(r);
            if (filters.safe && risk === 'safe') return true;
            if (filters.medium && risk === 'medium') return true;
            if (filters.risk && risk === 'risk') return true;
            if (filters.valid && r.status === 'valid') return true;
            if (filters.invalid && r.status === 'invalid') return true;
            if (filters.catchall && r.is_catch_all) return true;
            return false;
        });
    }
    
    function toCSV(rows, columns) {
        const escape = v => '"' + String(v).replace(/"/g, '""') + '"';
        return [
            columns.map(escape).join(','),
            ...rows.map(row => columns.map(col => escape(row[col] ?? '')).join(','))
        ].join('\r\n');
    }
    
    function toExcel(rows, columns) {
        // Simple Excel XML (works for basic data)
        let xml = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>';
        xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">';
        xml += '<Worksheet ss:Name="Sheet1"><Table>';
        xml += '<Row>' + columns.map(col => `<Cell><Data ss:Type="String">${col}</Data></Cell>`).join('') + '</Row>';
        rows.forEach(row => {
            xml += '<Row>' + columns.map(col => `<Cell><Data ss:Type="String">${row[col] ?? ''}</Data></Cell>`).join('') + '</Row>';
        });
        xml += '</Table></Worksheet></Workbook>';
        return xml;
    }
    
    function prepareExportRows(results) {
        // Collect all columns from original rows
        let allCols = new Set();
        results.forEach(r => {
            if (r._original) Object.keys(r._original).forEach(k => allCols.add(k));
        });
        allCols.delete('__email');
        
        // Only add 'email' if not present in original columns
        const hasEmail = allCols.has('email');
        const extraCols = ['validation', 'catch_all', 'risk_level'];
        const columns = [...allCols];
        if (!hasEmail) columns.push('email');
        columns.push(...extraCols);
        
        const rows = results.map(r => {
            const base = r._original ? { ...r._original } : {};
            if (!hasEmail) base.email = r.email;
            base.validation = r.status === 'valid' ? 'Valid' : 'Invalid';
            base.catch_all = r.is_catch_all ? 'Yes' : 'No';
            base.risk_level = getRiskLevel(r);
            return base;
        });
        
        return { columns, rows };
    }
    
    function doExport(type) {
        const filters = getExportFilters();
        const filtered = filterExportResults(checker.currentResults, filters);
        const { columns, rows } = prepareExportRows(filtered);
        
        if (type === 'csv') {
            const csv = toCSV(rows, columns);
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `email-verification-export-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else if (type === 'excel') {
            const xml = toExcel(rows, columns);
            const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `email-verification-export-${new Date().toISOString().split('T')[0]}.xls`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        
        if (exportModal) exportModal.style.display = 'none';
    }
    
    const exportAsCSV = document.getElementById('exportAsCSV');
    const exportAsExcel = document.getElementById('exportAsExcel');
    
    if (exportAsCSV) exportAsCSV.onclick = () => doExport('csv');
    if (exportAsExcel) exportAsExcel.onclick = () => doExport('excel');
});

// Simple modal implementation
function showDetailsModal(email, html) {
    let modal = document.getElementById('detailsModal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'detailsModal';
        modal.style.position = 'fixed';
        modal.style.left = '0';
        modal.style.top = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.4)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '9999';
        
        modal.innerHTML = `
            <div id='detailsModalContent' style='background:#fff;padding:24px 32px;border-radius:8px;max-width:420px;min-width:320px;box-shadow:0 2px 16px #0002;position:relative;'>
                <button id='closeDetailsModal' style='position:absolute;top:8px;right:8px;font-size:18px;background:none;border:none;cursor:pointer;' title='Close'>&times;</button>
                <div id='detailsModalBody'></div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.querySelector('#closeDetailsModal').onclick = () => modal.style.display = 'none';
        modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    } else {
        modal.style.display = 'flex';
    }
    
    // Always show a table, even if html is empty
    if (!html) {
        html = `
            <h3 style='margin-top:0;'>Details</h3>
            <table style='width:100%;border-collapse:collapse;font-size:1em;'>
                <tbody>
                    <tr><td colspan='2' style='text-align:center;color:#888;'>No details available</td></tr>
                </tbody>
            </table>
        `;
    }
    
    modal.querySelector('#detailsModalBody').innerHTML = html;
}
