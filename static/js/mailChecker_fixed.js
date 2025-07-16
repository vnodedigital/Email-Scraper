/**
 * Email Checker JavaScript Client
 * Handles communication with Django REST API for email verification
 */

class EmailChecker {
    constructor(apiBaseUrl = '/verifier/api/') {
        this.apiBaseUrl = apiBaseUrl;
        this.csrfToken = this.getCSRFToken();
    }

    /**
     * Get CSRF token from Django
     */
    getCSRFToken() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'csrftoken') {
                return value;
            }
        }
        return null;
    }

    /**
     * Make API request with proper headers
     */
    async makeRequest(endpoint, options = {}) {
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.csrfToken,
            },
            credentials: 'include', // Include cookies for session authentication
        };

        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers,
            },
        };

        try {
            const response = await fetch(this.apiBaseUrl + endpoint, mergedOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    /**
     * Check if API is healthy
     */
    async healthCheck() {
        try {
            const result = await this.makeRequest('health/');
            return result.status === 'healthy';
        } catch (error) {
            console.error('Health check failed:', error);
            return false;
        }
    }

    /**
     * Verify a single email address
     */
    async verifyEmail(email) {
        if (!email || typeof email !== 'string') {
            throw new Error('Valid email address is required');
        }

        try {
            const result = await this.makeRequest('check-email/', {
                method: 'POST',
                body: JSON.stringify({ email: email.trim() }),
            });

            return result;
        } catch (error) {
            console.error('Email verification failed:', error);
            throw error;
        }
    }

    /**
     * Verify multiple email addresses
     */
    async verifyEmails(emails, onProgress = null) {
        if (!Array.isArray(emails) || emails.length === 0) {
            throw new Error('Array of email addresses is required');
        }

        const results = [];
        const total = emails.length;
        
        for (let i = 0; i < emails.length; i++) {
            const email = emails[i];
            
            try {
                const result = await this.verifyEmail(email);
                results.push(result);
                
                if (onProgress) {
                    onProgress({
                        current: i + 1,
                        total: total,
                        percentage: Math.round(((i + 1) / total) * 100),
                        currentEmail: email,
                        result: result,
                    });
                }
            } catch (error) {
                const errorResult = {
                    email: email,
                    status: 'error',
                    reason: error.message,
                    score: 0.0,
                    is_disposable: false,
                    is_free_provider: false,
                    is_role_based: false,
                    is_catch_all: false,
                    is_blacklisted: false,
                    spf: null,
                    dmarc: null,
                    dkim: null,
                };
                
                results.push(errorResult);
                
                if (onProgress) {
                    onProgress({
                        current: i + 1,
                        total: total,
                        percentage: Math.round(((i + 1) / total) * 100),
                        currentEmail: email,
                        result: errorResult,
                    });
                }
            }
            
            // Add a small delay to prevent overwhelming the server
            if (i < emails.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        return results;
    }

    /**
     * Format verification result for display
     */
    formatResult(result) {
        const statusColors = {
            'valid': 'success',
            'invalid': 'error',
            'catch-all': 'warning',
            'error': 'error',
        };

        const statusIcons = {
            'valid': '✓',
            'invalid': '✗',
            'catch-all': '⚠',
            'error': '!',
        };

        return {
            ...result,
            statusColor: statusColors[result.status] || 'default',
            statusIcon: statusIcons[result.status] || '?',
            scoreColor: result.score >= 0.7 ? 'success' : 
                       result.score >= 0.4 ? 'warning' : 'error',
            scorePercentage: Math.round((result.score || 0) * 100),
        };
    }

    /**
     * Export results to CSV
     */
    exportToCSV(results, filename = 'email_verification_results.csv') {
        const headers = [
            'Email',
            'Status',
            'Reason',
            'Score',
            'Is Disposable',
            'Is Free Provider',
            'Is Role Based',
            'Is Catch All',
            'Is Blacklisted',
            'SPF Record',
            'DMARC Record',
            'DKIM Record',
        ];

        const csvContent = [
            headers.join(','),
            ...results.map(result => [
                result.email,
                result.status,
                `"${result.reason || ''}"`,
                result.score,
                result.is_disposable,
                result.is_free_provider,
                result.is_role_based,
                result.is_catch_all,
                result.is_blacklisted,
                `"${result.spf || ''}"`,
                `"${result.dmarc || ''}"`,
                `"${result.dkim || ''}"`,
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    /**
     * Get statistics from results
     */
    getStatistics(results) {
        const stats = {
            total: results.length,
            valid: 0,
            invalid: 0,
            catchAll: 0,
            error: 0,
            disposable: 0,
            freeProvider: 0,
            roleBased: 0,
            blacklisted: 0,
            averageScore: 0,
        };

        let totalScore = 0;

        results.forEach(result => {
            switch (result.status) {
                case 'valid':
                    stats.valid++;
                    break;
                case 'invalid':
                    stats.invalid++;
                    break;
                case 'catch-all':
                    stats.catchAll++;
                    break;
                case 'error':
                    stats.error++;
                    break;
            }

            if (result.is_disposable) stats.disposable++;
            if (result.is_free_provider) stats.freeProvider++;
            if (result.is_role_based) stats.roleBased++;
            if (result.is_blacklisted) stats.blacklisted++;

            totalScore += result.score || 0;
        });

        stats.averageScore = results.length > 0 ? (totalScore / results.length).toFixed(2) : 0;

        return stats;
    }
}

// Main CatchAllMailChecker class that works with the existing HTML template
class CatchAllMailChecker {
    constructor() {
        this.emailChecker = new EmailChecker();
        this.history = this.loadHistory();
        this.currentResults = [];
        this.isChecking = false;
        this.originalRows = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateHistoryDisplay();
        this.setupTabs();
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
                const targetPanel = document.getElementById(tab.id.replace('Tab', 'Panel'));
                if (targetPanel) {
                    targetPanel.classList.add('active');
                }
            });
        });
    }

    updateEmailCount() {
        const textarea = document.getElementById('multipleEmails');
        if (textarea) {
            const emails = this.parseEmailsFromText(textarea.value);
            const emailCount = document.getElementById('emailCount');
            if (emailCount) {
                emailCount.textContent = `${emails.length} emails entered`;
            }
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
            let result;
            if (file.name.endsWith('.csv')) {
                result = await this.parseCSVWithColumns(file);
            } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                result = await this.parseExcelWithColumns(file);
            } else {
                throw new Error('Unsupported file format');
            }

            this.originalRows = result.rows;
            
            if (filePreview) {
                filePreview.innerHTML = `
                    <span style="color: #22c55e;">✓ Found ${result.emails.length} email addresses</span>
                    <br><small>Preview: ${result.emails.slice(0, 5).join(', ')}${result.emails.length > 5 ? '...' : ''}</small>
                `;
            }
        } catch (error) {
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
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    
                    const emails = [];
                    const rows = jsonData;
                    
                    // Extract emails from all columns
                    jsonData.forEach(row => {
                        Object.values(row).forEach(value => {
                            if (typeof value === 'string' && this.isValidEmail(value)) {
                                emails.push(value);
                            }
                        });
                    });
                    
                    resolve({ emails: [...new Set(emails)], rows });
                } catch (error) {
                    reject(error);
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
        
        const activeTabId = activeTab.id;
        
        switch (activeTabId) {
            case 'singleTab':
                const singleEmail = document.getElementById('singleEmail');
                return singleEmail && singleEmail.value.trim() ? [singleEmail.value.trim()] : [];
                
            case 'multipleTab':
                const multipleEmails = document.getElementById('multipleEmails');
                return multipleEmails ? this.parseEmailsFromText(multipleEmails.value) : [];
                
            case 'fileTab':
                const fileInput = document.getElementById('fileInput');
                return fileInput && fileInput.files.length > 0 ? this.originalRows.map(row => 
                    Object.values(row).find(val => this.isValidEmail(val))
                ).filter(email => email) : [];
                
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

        try {
            const results = await this.emailChecker.verifyEmails(emails, (progress) => {
                this.updateProgress(progress.current, progress.total);
            });

            this.currentResults = results;
            this.displayResults(results);
            this.updateSummaryStats(results);
            this.addToHistory({
                timestamp: new Date().toISOString(),
                totalEmails: emails.length,
                results: results,
                summary: this.calculateSummary(results)
            });
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

    updateProgress(current, total) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const progressCount = document.getElementById('progressCount');
        
        const percentage = Math.round((current / total) * 100);
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        
        if (progressText) {
            progressText.textContent = `Checking emails... ${percentage}%`;
        }
        
        if (progressCount) {
            progressCount.textContent = `${current}/${total}`;
        }
    }

    displayResults(results) {
        const tbody = document.getElementById('resultsTableBody');
        if (!tbody) return;

        tbody.innerHTML = results.map((result, idx) => {
            const formatted = this.emailChecker.formatResult(result);
            const risk = this.getRiskLevel(result);
            
            return `
                <tr>
                    <td>${result.email || '-'}</td>
                    <td>${result.email ? result.email.split('@')[1] : '-'}</td>
                    <td>${result.is_free_provider ? 'Free' : result.is_disposable ? 'Disposable' : result.is_role_based ? 'Role' : '-'}</td>
                    <td>${result.is_blacklisted ? 'Blacklisted' : '-'}</td>
                    <td>${formatted.statusIcon}</td>
                    <td>${result.is_catch_all ? 'Yes' : 'No'}</td>
                    <td>${formatted.scorePercentage}%</td>
                    <td class="${risk.color}">${risk.text}</td>
                    <td><button class="action-btn details" data-row-idx="${idx}">Details</button></td>
                </tr>
            `;
        }).join('');
    }

    getRiskLevel(result) {
        const isValid = result.status === 'valid';
        const notDisposable = result.is_disposable === false;
        const notBlacklisted = result.is_blacklisted === false;
        const notRole = result.is_role_based === false;
        const goodScore = typeof result.score === 'number' && result.score >= 0.7;
        const hasAuth = !!(result.spf || result.dkim || result.dmarc);

        if (isValid && notDisposable && notBlacklisted && notRole && goodScore && hasAuth) {
            return { text: '✅ Safe', color: 'success' };
        }

        if (!isValid || result.is_blacklisted || result.is_disposable || (typeof result.score === 'number' && result.score < 0.4)) {
            return { text: '❌ High Risk', color: 'error' };
        }

        return { text: '⚠️ Medium Risk', color: 'warning' };
    }

    updateSummaryStats(results) {
        const stats = this.emailChecker.getStatistics(results);
        
        const totalEmails = document.getElementById('totalEmails');
        const validEmails = document.getElementById('validEmails');
        const catchAllEmails = document.getElementById('catchAllEmails');
        const invalidEmails = document.getElementById('invalidEmails');
        
        if (totalEmails) totalEmails.textContent = stats.total;
        if (validEmails) validEmails.textContent = stats.valid;
        if (catchAllEmails) catchAllEmails.textContent = stats.catchAll;
        if (invalidEmails) invalidEmails.textContent = stats.invalid;
    }

    showLoading(show) {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = show ? 'block' : 'none';
        }
    }

    showResults(show) {
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            resultsSection.style.display = show ? 'block' : 'none';
        }
    }

    showProgress(show) {
        const progressContainer = document.getElementById('progressContainer');
        const summaryStats = document.getElementById('summaryStats');
        const resultsTableContainer = document.getElementById('resultsTableContainer');
        
        if (progressContainer) {
            progressContainer.style.display = show ? 'block' : 'none';
        }
        
        if (summaryStats) {
            summaryStats.style.display = show ? 'none' : 'block';
        }
        
        if (resultsTableContainer) {
            resultsTableContainer.style.display = show ? 'none' : 'block';
        }
    }

    clearCurrentResults() {
        this.currentResults = [];
        const tbody = document.getElementById('resultsTableBody');
        if (tbody) tbody.innerHTML = '';
        
        this.showResults(false);
        const clearBtn = document.getElementById('clearBtn');
        if (clearBtn) clearBtn.style.display = 'none';
    }

    clearHistory() {
        this.history = [];
        localStorage.removeItem('emailVerificationHistory');
        this.updateHistoryDisplay();
    }

    exportResults() {
        if (this.currentResults.length > 0) {
            this.emailChecker.exportToCSV(this.currentResults);
        }
    }

    exportHistory() {
        if (this.history.length > 0) {
            const allResults = this.history.flatMap(entry => entry.results);
            this.emailChecker.exportToCSV(allResults, 'email_verification_history.csv');
        }
    }

    filterResults() {
        // Implementation for filtering results
        console.log('Filtering results...');
    }

    calculateSummary(results) {
        return this.emailChecker.getStatistics(results);
    }

    loadHistory() {
        const saved = localStorage.getItem('emailVerificationHistory');
        return saved ? JSON.parse(saved) : [];
    }

    addToHistory(entry) {
        this.history.push(entry);
        localStorage.setItem('emailVerificationHistory', JSON.stringify(this.history));
        this.updateHistoryDisplay();
    }

    updateHistoryDisplay() {
        const historyList = document.getElementById('historyList');
        if (!historyList) return;

        if (this.history.length === 0) {
            historyList.innerHTML = '<p class="no-history">No checks performed yet</p>';
            return;
        }

        historyList.innerHTML = this.history.map((entry, index) => `
            <div class="history-item">
                <div class="history-header">
                    <span class="history-date">${new Date(entry.timestamp).toLocaleString()}</span>
                    <span class="history-count">${entry.totalEmails} emails</span>
                </div>
                <div class="history-stats">
                    <span class="stat success">✓ ${entry.summary.valid}</span>
                    <span class="stat warning">⚠ ${entry.summary.catchAll}</span>
                    <span class="stat error">✗ ${entry.summary.invalid}</span>
                </div>
            </div>
        `).join('');
    }

    showDetailsModal(result) {
        // Create a simple modal for showing details
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Email Details: ${result.email}</h3>
                <div class="details-grid">
                    <div><strong>Status:</strong> ${result.status}</div>
                    <div><strong>Score:</strong> ${Math.round((result.score || 0) * 100)}%</div>
                    <div><strong>Reason:</strong> ${result.reason || 'N/A'}</div>
                    <div><strong>Disposable:</strong> ${result.is_disposable ? 'Yes' : 'No'}</div>
                    <div><strong>Free Provider:</strong> ${result.is_free_provider ? 'Yes' : 'No'}</div>
                    <div><strong>Role Based:</strong> ${result.is_role_based ? 'Yes' : 'No'}</div>
                    <div><strong>Catch-All:</strong> ${result.is_catch_all ? 'Yes' : 'No'}</div>
                    <div><strong>Blacklisted:</strong> ${result.is_blacklisted ? 'Yes' : 'No'}</div>
                    <div><strong>SPF:</strong> ${result.spf || 'Not found'}</div>
                    <div><strong>DMARC:</strong> ${result.dmarc || 'Not found'}</div>
                    <div><strong>DKIM:</strong> ${result.dkim || 'Not found'}</div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()">Close</button>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.emailChecker = new EmailChecker();
    window.catchAllMailChecker = new CatchAllMailChecker();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EmailChecker, CatchAllMailChecker };
}

// Make available globally
window.EmailChecker = EmailChecker;
window.CatchAllMailChecker = CatchAllMailChecker;
