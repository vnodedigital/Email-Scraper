class CatchAllMailChecker {
    constructor() {
        this.history = []; // Will be loaded from database
        this.currentResults = [];
        this.isChecking = false;
        this.originalRows = []; // Store original file rows with extra columns
        this.lowCreditWarningShown = false; // Track if low credit warning has been shown
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupHistoryEventListeners(); // Set up event listeners for initial Django-rendered buttons
        this.loadHistoryFromDatabase(); // Load from database instead of localStorage
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
        const refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
        const exportResultsBtn = document.getElementById('exportResultsBtn');
        const fileInput = document.getElementById('fileInput');
        const multipleEmails = document.getElementById('multipleEmails');
        const statusFilter = document.getElementById('statusFilter');
        const searchFilter = document.getElementById('searchFilter');
        
        // Modal close buttons
        const closeDetailsModal = document.getElementById('closeDetailsModal');
        const closeExportFilterModal = document.getElementById('closeExportFilterModal');
        const exportDetailsBtn = document.getElementById('exportDetailsBtn');
        
        if (checkBtn) checkBtn.addEventListener('click', () => this.performBulkCheck());
        if (clearBtn) clearBtn.addEventListener('click', () => this.clearCurrentResults());
        if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        if (refreshHistoryBtn) refreshHistoryBtn.addEventListener('click', () => this.loadHistoryFromDatabase());
        if (exportResultsBtn) exportResultsBtn.addEventListener('click', () => this.exportResults());
        if (fileInput) fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        if (multipleEmails) multipleEmails.addEventListener('input', () => this.updateEmailCount());
        if (statusFilter) statusFilter.addEventListener('change', () => this.filterResults());
        if (searchFilter) searchFilter.addEventListener('input', () => this.filterResults());

        // Modal event listeners
        if (closeDetailsModal) {
            closeDetailsModal.addEventListener('click', () => {
                document.getElementById('detailsModal').style.display = 'none';
            });
        }
        
        if (closeExportFilterModal) {
            closeExportFilterModal.addEventListener('click', () => {
                document.getElementById('exportFilterModal').style.display = 'none';
            });
        }

        if (exportDetailsBtn) {
            exportDetailsBtn.addEventListener('click', () => {
                const historyId = exportDetailsBtn.dataset.historyId;
                if (historyId) {
                    this.showHistoryExportModal(historyId);
                }
            });
        }

        // Setup export filter modal buttons
        this.setupExportFilterModal();
        
        // Modal outside click handlers
        const detailsModal = document.getElementById('detailsModal');
        const exportFilterModal = document.getElementById('exportFilterModal');
        
        if (detailsModal) {
            detailsModal.addEventListener('click', (e) => {
                if (e.target === detailsModal) {
                    detailsModal.style.display = 'none';
                }
            });
        }

        if (exportFilterModal) {
            exportFilterModal.addEventListener('click', (e) => {
                if (e.target === exportFilterModal) {
                    exportFilterModal.style.display = 'none';
                }
            });
        }
        
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
                        this.showEmailDetailsModal(this.currentResults[idx]);
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
        
        // Generate a title for this verification batch
        const activeTab = document.querySelector('.tab-btn.active');
        let title = 'Email Verification';
        if (activeTab) {
            switch (activeTab.id) {
                case 'singleTab':
                    title = `Single Email - ${emails[0]}`;
                    break;
                case 'multipleTab':
                    title = `Multiple Emails - ${emails.length} emails`;
                    break;
                case 'fileTab':
                    const fileInput = document.getElementById('fileInput');
                    const fileName = fileInput?.files[0]?.name || 'Upload';
                    title = `File Upload - ${fileName}`;
                    break;
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
            // Process emails one by one for real-time updates (like in working commit c97be29b)
            for (let i = 0; i < emails.length; i++) {
                const email = emails[i];
                
                // Check credits before each verification
                if (currentCredits <= 0) {
                    this.showCreditAlert('Your credits are 0. Email verification has been stopped.', 'error');
                    break;
                }
                
                try {
                    // Verify single email using the single email API
                    const response = await fetch('/verifier/api/check-email/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                        },
                        body: JSON.stringify({ email: email })
                    });

                    const data = await response.json();

                    if (data.success) {
                        // Add successful verification result
                        const result = {
                            email: data.email,
                            status: data.status,
                            reason: data.reason || '',
                            is_catch_all: data.is_catch_all || false,
                            domain: data.domain || email.split('@')[1] || '',
                            score: data.score || 0,
                            is_disposable: data.is_disposable || false,
                            is_free_provider: data.is_free_provider || false,
                            is_role_based: data.is_role_based || false,
                            is_blacklisted: data.is_blacklisted || false,
                            spf: data.spf || '',
                            dkim: data.dkim || '',
                            dmarc: data.dmarc || ''
                        };
                        
                        // Attach original row if available
                        if (this.originalRows && this.originalRows.length) {
                            const orig = this.originalRows.find(r => r.__email === email);
                            if (orig) result._original = orig;
                        }
                        
                        this.currentResults.push(result);
                        processedEmails++;
                        
                        // Update credits
                        if (data.remaining_credits !== undefined) {
                            currentCredits = data.remaining_credits;
                            this.displayCredits(currentCredits);
                            
                            // Show low credit warning
                            if (currentCredits <= 10 && currentCredits > 0 && !this.lowCreditWarningShown) {
                                this.showCreditAlert(`Low credit warning: You have ${currentCredits} credits remaining. Consider purchasing more credits to continue verification.`, 'warning');
                                this.lowCreditWarningShown = true;
                            }
                        }
                        
                        // UPDATE DISPLAY IMMEDIATELY after each email (REAL-TIME UPDATES!)
                        this.updateProgress(processedEmails, totalEmails);
                        this.updateResultsDisplay();
                        
                        // Check if credits are exhausted
                        if (currentCredits <= 0) {
                            this.showCreditAlert('Your credits are 0. Email verification has been stopped.', 'error');
                            break;
                        }
                        
                    } else {
                        // Handle individual email verification failure
                        console.error(`Failed to verify ${email}:`, data);
                        
                        // Add error result
                        this.currentResults.push({
                            email: email,
                            status: 'error',
                            reason: data.error || 'Verification failed',
                            is_catch_all: false,
                            domain: email.split('@')[1] || '',
                            score: 0,
                            is_disposable: false,
                            is_free_provider: false,
                            is_role_based: false,
                            is_blacklisted: false,
                            spf: '',
                            dkim: '',
                            dmarc: ''
                        });
                        
                        processedEmails++;
                        
                        // UPDATE DISPLAY IMMEDIATELY even for errors
                        this.updateProgress(processedEmails, totalEmails);
                        this.updateResultsDisplay();
                        
                        // Update credits if available
                        if (data.current_credits !== undefined) {
                            currentCredits = data.current_credits;
                            this.displayCredits(currentCredits);
                        }
                        
                        // Stop if no credits left
                        if (data.current_credits === 0) {
                            this.showCreditAlert('Credits exhausted. Verification stopped.', 'error');
                            break;
                        }
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
                        is_catch_all: false,
                        domain: email.split('@')[1] || '',
                        score: 0,
                        is_disposable: false,
                        is_free_provider: false,
                        is_role_based: false,
                        is_blacklisted: false,
                        spf: '',
                        dkim: '',
                        dmarc: ''
                    });
                    
                    processedEmails++;
                    
                    // UPDATE DISPLAY IMMEDIATELY even for network errors
                    this.updateProgress(processedEmails, totalEmails);
                    this.updateResultsDisplay();
                }
            }
            
            // Save batch results to history after all emails are processed
            if (processedEmails > 0) {
                try {
                    const response = await fetch('/verifier/api/batch-verify/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                        },
                        body: JSON.stringify({
                            emails: emails.slice(0, processedEmails),
                            title: title,
                            precomputed_results: this.currentResults
                        })
                    });

                    const data = await response.json();
                    if (response.ok && data.success) {
                        // Show success message
                        const summary = data.summary;
                        const successMessage = `✅ Verification Complete!\n\n` +
                            `📧 Total: ${summary.total}\n` +
                            `✅ Valid: ${summary.valid}\n` +
                            `⚠️ Catch-All: ${summary.catchall}\n` +
                            `❌ Invalid: ${summary.invalid}\n` +
                            `🎯 Success Rate: ${summary.success_rate}%\n\n` +
                            `💳 Credits Used: ${summary.total}\n` +
                            `💰 Remaining Credits: ${currentCredits}`;
                        
                        this.showCreditAlert(successMessage, 'info');

                        // Refresh history display
                        this.loadHistoryFromDatabase();
                    }
                } catch (error) {
                    console.error('Failed to save batch to history:', error);
                    // Don't show error to user as verification was successful
                }
            }
            
        } catch (error) {
            console.error('Bulk verification error:', error);
            this.showCreditAlert('Network error during verification. Please try again.', 'error');
        } finally {
            this.isChecking = false;
            this.showLoading(false);
            this.showProgress(false);
            
            // Show Clear All button after verification is complete
            const clearBtn = document.getElementById('clearBtn');
            if (clearBtn) clearBtn.style.display = 'inline-flex';
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
            // Priority: Catch-all detection takes precedence over status
            const isCatchAll = r.is_catch_all || false;
            const status = (r.status || 'invalid').toLowerCase();
            
            // Apply same priority logic as backend: Catch-all > Valid > Invalid
            if (isCatchAll || status === 'catch-all') {
                catchAll++;
            } else if (status === 'valid') {
                valid++;
            } else {
                invalid++;
            }
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
            filtered = filtered.filter(r => {
                // Apply the same priority logic as in calculateSummary
                const isCatchAll = r.is_catch_all || false;
                const resultStatus = (r.status || 'invalid').toLowerCase();
                
                let effectiveStatus;
                if (isCatchAll || resultStatus === 'catch-all') {
                    effectiveStatus = 'catch-all';
                } else if (resultStatus === 'valid') {
                    effectiveStatus = 'valid';
                } else {
                    effectiveStatus = 'invalid';
                }
                
                return effectiveStatus === status;
            });
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
        
        // Make sure loading overlay is hidden when clearing results
        this.showLoading(false);
        this.showProgress(false);
        this.isChecking = false;
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
        // No longer needed since we're using database
        // this.history.unshift(checkResult);
        // if (this.history.length > 50) {
        //     this.history = this.history.slice(0, 50); // Keep only last 50 checks
        // }
        // 
        // this.saveHistory();
        // this.updateHistoryDisplay();
        
        // Refresh history from database
        this.loadHistoryFromDatabase();
    }

    async loadHistoryFromDatabase() {
        try {
            const response = await fetch('/verifier/history/', {
                method: 'GET',
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                this.history = data.history || [];
                this.updateHistoryDisplay();
            }
        } catch (error) {
            console.error('Failed to load history from database:', error);
        }
    }
    
    updateHistoryDisplay() {
        const historyList = document.getElementById('historyList');
        if (!historyList) return;

        if (this.history.length === 0) {
            historyList.innerHTML = '<p class="no-history">No checks performed yet</p>';
            return;
        }
        
        const html = this.history.map(item => {
            return `
                <div class="history-item" data-history-id="${item.id}">
                    <div class="history-header">
                        <div class="history-title">
                            <i class="fas fa-envelope-open"></i>
                            <span class="title">${item.title}</span>
                            <span class="email-count">${item.email_count} emails</span>
                        </div>
                        <div class="history-date">${item.formatted_date}</div>
                    </div>
                    <div class="history-stats">
                        <div class="stat-badge success">
                            <i class="fas fa-check-circle"></i>
                            <span>${item.valid_count} Valid</span>
                        </div>
                        <div class="stat-badge warning">
                            <i class="fas fa-inbox"></i>
                            <span>${item.catchall_count} Catch-All</span>
                        </div>
                        <div class="stat-badge error">
                            <i class="fas fa-times-circle"></i>
                            <span>${item.invalid_count} Invalid</span>
                        </div>
                        <div class="success-rate">
                            Success Rate: ${item.success_rate}%
                        </div>
                    </div>
                    <div class="history-actions">
                        <button class="btn-details" data-history-id="${item.id}">
                            <i class="fas fa-eye"></i> Details
                        </button>
                        <button class="btn-export" data-history-id="${item.id}">
                            <i class="fas fa-download"></i> Export
                        </button>
                        <button class="btn-delete" data-history-id="${item.id}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        historyList.innerHTML = html;
        
        // Add event listeners for the new buttons
        this.setupHistoryEventListeners();
    }

    setupHistoryEventListeners() {
        // Details buttons
        document.querySelectorAll('.btn-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const historyId = e.target.closest('.btn-details').dataset.historyId;
                this.showHistoryDetails(historyId);
            });
        });

        // Export buttons
        document.querySelectorAll('.btn-export').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const historyId = e.target.closest('.btn-export').dataset.historyId;
                this.showHistoryExportModal(historyId);
            });
        });

        // Delete buttons
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const historyId = e.target.closest('.btn-delete').dataset.historyId;
                this.deleteHistoryItem(historyId);
            });
        });
    }

    async showHistoryDetails(historyId) {
        try {
            // Get CSRF token more robustly
            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
                             document.querySelector('meta[name=csrf-token]')?.getAttribute('content') ||
                             '';
            
            console.log('Fetching history details for ID:', historyId);
            console.log('CSRF Token:', csrfToken ? 'Found' : 'Not found');
            
            const response = await fetch(`/verifier/history/${historyId}/`, {
                method: 'GET',
                headers: {
                    'X-CSRFToken': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/json',
                },
            });

            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);

            if (response.ok) {
                const data = await response.json();
                console.log('History data received:', data);
                const history = data.history;
                
                // Show the details modal
                this.showDetailsModal(history);
            } else {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                alert('Failed to load history details: ' + response.status);
            }
        } catch (error) {
            console.error('Failed to load history details:', error);
            alert('Failed to load history details: ' + error.message);
        }
    }

    showDetailsModal(historyData) {
        const modal = document.getElementById('detailsModal');
        const title = document.getElementById('detailsTitle');
        const subtitle = document.getElementById('detailsSubtitle');
        const summary = document.getElementById('detailsSummary');
        const tableBody = document.getElementById('detailsTableBody');
        const exportBtn = document.getElementById('exportDetailsBtn');

        console.log('Modal elements check:', {
            modal: !!modal,
            title: !!title,
            subtitle: !!subtitle,
            summary: !!summary,
            tableBody: !!tableBody,
            exportBtn: !!exportBtn
        });

        if (!modal) {
            console.error('Details modal not found');
            return;
        }

        // Set modal content with null checks
        if (title) {
            title.textContent = historyData.title;
        }
        if (subtitle) {
            subtitle.textContent = `${historyData.email_count} emails verified on ${historyData.formatted_date}`;
        }

        // Set export button data
        if (exportBtn) {
            exportBtn.dataset.historyId = historyData.id;
        }

        // Create summary stats
        if (summary) {
            summary.innerHTML = `
                <div class="detail-stat">
                    <div class="detail-stat-number">${historyData.email_count}</div>
                    <div class="detail-stat-label">Total Emails</div>
                </div>
                <div class="detail-stat">
                    <div class="detail-stat-number" style="color: #16a34a;">${historyData.valid_count}</div>
                    <div class="detail-stat-label">Valid</div>
                </div>
                <div class="detail-stat">
                    <div class="detail-stat-number" style="color: #d97706;">${historyData.catchall_count}</div>
                    <div class="detail-stat-label">Catch-All</div>
                </div>
                <div class="detail-stat">
                    <div class="detail-stat-number" style="color: #dc2626;">${historyData.invalid_count}</div>
                    <div class="detail-stat-label">Invalid</div>
                </div>
                <div class="detail-stat">
                    <div class="detail-stat-number" style="color: #0d9488;">${historyData.success_rate}%</div>
                    <div class="detail-stat-label">Success Rate</div>
                </div>
            `;
        }

        // Populate table with results
        const results = historyData.verified_emails?.results || [];
        this.populateDetailsTable(results);

        // Show modal
        modal.style.display = 'block';
    }

    populateDetailsTable(results) {
        const tableBody = document.getElementById('detailsTableBody');
        if (!tableBody) return;

        const html = results.map(result => {
            const score = result.score ? Math.round(result.score * 100) : 0;
            const riskLevel = this.getRiskLevelFromScore(score);
            const riskClass = score >= 70 ? 'safe' : score >= 41 ? 'medium' : 'high';

            // Extract domain from email if not available
            const domain = result.domain || (result.email ? result.email.split('@')[1] : '-');
            
            // Determine domain type
            const domainType = result.is_free_provider ? 'Free' : 
                              result.is_disposable ? 'Disposable' : 'Business';

            return `
                <tr>
                    <td>${result.email || '-'}</td>
                    <td>${domain}</td>
                    <td>${domainType}</td>
                    <td>${result.is_blacklisted ? 'Yes' : 'No'}</td>
                    <td>${(result.status || 'invalid').replace(/^./, str => str.toUpperCase())}</td>
                    <td>${result.is_catch_all ? 'Yes' : 'No'}</td>
                    <td>${score}</td>
                    <td class="risk-${riskClass}">${riskLevel}</td>
                </tr>
            `;
        }).join('');

        tableBody.innerHTML = html;

        // Setup filtering for the details table
        this.setupDetailsTableFiltering(results);
    }

    getRiskLevelFromScore(score) {
        if (score >= 70) return 'Safe';
        if (score >= 41) return 'Medium Risk';
        return 'High Risk';
    }

    setupDetailsTableFiltering(allResults) {
        const statusFilter = document.getElementById('detailsStatusFilter');
        const searchFilter = document.getElementById('detailsSearchFilter');

        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.filterDetailsTable(allResults));
        }
        if (searchFilter) {
            searchFilter.addEventListener('input', () => this.filterDetailsTable(allResults));
        }
    }

    filterDetailsTable(allResults) {
        const statusFilter = document.getElementById('detailsStatusFilter').value;
        const searchText = document.getElementById('detailsSearchFilter').value.toLowerCase();
        
        let filteredResults = allResults.filter(result => {
            // Status filter - fix field mapping
            let statusMatch = true;
            if (statusFilter !== 'all') {
                const status = result.status || 'invalid';
                const isCatchAll = result.is_catch_all || false;
                
                if (statusFilter === 'valid' && (status !== 'valid' || isCatchAll)) statusMatch = false;
                if (statusFilter === 'catch-all' && !isCatchAll) statusMatch = false;
                if (statusFilter === 'invalid' && status !== 'invalid') statusMatch = false;
            }

            // Search filter
            let searchMatch = true;
            if (searchText) {
                const email = (result.email || '').toLowerCase();
                const domain = (result.domain || (result.email ? result.email.split('@')[1] : '')).toLowerCase();
                searchMatch = email.includes(searchText) || domain.includes(searchText);
            }

            return statusMatch && searchMatch;
        });

        this.populateDetailsTableWithFiltered(filteredResults);
    }

    populateDetailsTableWithFiltered(results) {
        const tableBody = document.getElementById('detailsTableBody');
        if (!tableBody) return;

        const html = results.map(result => {
            const score = result.score ? Math.round(result.score * 100) : 0;
            const riskLevel = this.getRiskLevelFromScore(score);
            const riskClass = score >= 70 ? 'safe' : score >= 41 ? 'medium' : 'high';

            return `
                <tr>
                    <td>${result.email || '-'}</td>
                    <td>${result.domain || (result.email ? result.email.split('@')[1] : '-')}</td>
                    <td>${result.domain_type || '-'}</td>
                    <td>${result.is_blacklisted ? 'Yes' : 'No'}</td>
                    <td>${result.status || 'Invalid'}</td>
                    <td>${result.is_catch_all ? 'Yes' : 'No'}</td>
                    <td>${score}</td>
                    <td class="risk-${riskClass}">${riskLevel}</td>
                </tr>
            `;
        }).join('');

        tableBody.innerHTML = html;
    }

    showHistoryExportModal(historyId) {
        const modal = document.getElementById('exportFilterModal');
        if (modal) {
            // Store the history ID for export
            modal.dataset.historyId = historyId;
            modal.style.display = 'flex';
        }
    }

    async deleteHistoryItem(historyId) {
        // Show confirmation dialog
        if (!confirm('Are you sure you want to delete this verification history? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/verifier/history/${historyId}/delete/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Show success message
                    this.showCreditAlert('✅ History item deleted successfully!', 'info');
                    
                    // Remove the item from DOM immediately
                    const historyItem = document.querySelector(`[data-history-id="${historyId}"]`);
                    if (historyItem) {
                        historyItem.style.transform = 'translateX(-100%)';
                        historyItem.style.opacity = '0';
                        setTimeout(() => {
                            historyItem.remove();
                            
                            // Check if no history items left
                            const remainingItems = document.querySelectorAll('.history-item');
                            if (remainingItems.length === 0) {
                                const historyList = document.getElementById('historyList');
                                if (historyList) {
                                    historyList.innerHTML = '<p class="no-history">No checks performed yet</p>';
                                }
                            }
                        }, 300);
                    }
                } else {
                    this.showCreditAlert('❌ Failed to delete history item: ' + (data.error || 'Unknown error'), 'error');
                }
            } else {
                const data = await response.json();
                this.showCreditAlert('❌ Failed to delete history item: ' + (data.error || 'Server error'), 'error');
            }
        } catch (error) {
            console.error('Failed to delete history item:', error);
            this.showCreditAlert('❌ Network error: Failed to delete history item', 'error');
        }
    }
    
    clearHistory() {
        if (confirm('Are you sure you want to clear all check history? This action cannot be undone.')) {
            this.clearAllHistoryFromDatabase();
        }
    }

    async clearAllHistoryFromDatabase() {
        try {
            const response = await fetch('/verifier/history/clear-all/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                alert(data.message);
                this.loadHistoryFromDatabase(); // Refresh the display
            } else {
                alert('Failed to clear history');
            }
        } catch (error) {
            console.error('Failed to clear history:', error);
            alert('Failed to clear history');
        }
    }
    
    exportHistory() {
        // This method is no longer needed as we have individual export per history item
        alert('Please use the Export button on individual history items to export specific verification results.');
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

    setupExportFilterModal() {
        const exportAsCSV = document.getElementById('exportAsCSV');
        const exportAsExcel = document.getElementById('exportAsExcel');

        if (exportAsCSV) {
            exportAsCSV.addEventListener('click', () => {
                this.performHistoryExport('csv');
            });
        }

        if (exportAsExcel) {
            exportAsExcel.addEventListener('click', () => {
                this.performHistoryExport('excel');
            });
        }
    }

    async performHistoryExport(format) {
        const modal = document.getElementById('exportFilterModal');
        const historyId = modal?.dataset.historyId;

        if (!historyId) {
            alert('No history selected for export');
            return;
        }

        // Get filter values
        const form = document.getElementById('exportFilterForm');
        const formData = new FormData(form);
        const filters = {
            valid: formData.has('valid'),
            catchall: formData.has('catchall'),
            invalid: formData.has('invalid'),
            safe: formData.has('safe'),
            medium: formData.has('medium'),
            risk: formData.has('risk')
        };

        // Build query string
        const params = new URLSearchParams({
            format: format,
            ...filters
        });

        try {
            // Create download link
            const url = `/verifier/history/${historyId}/export/?${params.toString()}`;
            
            // Create temporary link and click it
            const a = document.createElement('a');
            a.href = url;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // Close modal
            modal.style.display = 'none';

        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed. Please try again.');
        }
    }
    
    showEmailDetailsModal(result) {
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
