class CatchAllMailChecker {
    constructor() {
        this.history = this.loadHistory();
        this.currentResults = [];
        this.isChecking = false;
        this.originalRows = []; // Store original file rows with extra columns
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

        checkBtn.addEventListener('click', () => this.performBulkCheck());
        clearBtn.addEventListener('click', () => this.clearCurrentResults());
        clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        exportHistoryBtn.addEventListener('click', () => this.exportHistory());
        exportResultsBtn.addEventListener('click', () => this.exportResults());
        fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        multipleEmails.addEventListener('input', () => this.updateEmailCount());
        statusFilter.addEventListener('change', () => this.filterResults());
        searchFilter.addEventListener('input', () => this.filterResults());

        // Enter key support for single email
        document.getElementById('singleEmail').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performBulkCheck();
        });

        // Delegated event for Details button
        document.getElementById('resultsTableBody').addEventListener('click', (e) => {
            const btn = e.target.closest('.action-btn.details');
            if (btn) {
                const idx = btn.getAttribute('data-row-idx');
                if (idx !== null && this.currentResults[idx]) {
                    this.showDetailsModal(this.currentResults[idx]);
                }
            }
        });
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
                document.getElementById(panelId).classList.add('active');
            });
        });
    }

    updateEmailCount() {
        const textarea = document.getElementById('multipleEmails');
        const emails = this.parseEmailsFromText(textarea.value);
        document.getElementById('emailCount').textContent = `${emails.length} emails entered`;
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
        fileInfo.style.display = 'block';
        fileInfo.querySelector('.file-name').textContent = file.name;
        fileInfo.querySelector('.file-size').textContent = this.formatFileSize(file.size);

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
            filePreview.innerHTML = `
                <strong>Found ${emails.length} emails:</strong><br>
                ${previewEmails.join('<br>')}
                ${emails.length > 10 ? `<br><em>... and ${emails.length - 10} more</em>` : ''}
            `;
            this.fileEmails = emails;
            this.originalRows = originalRows;
        } catch (error) {
            console.error('File parsing error:', error);
            filePreview.innerHTML = `<span style="color: #e53e3e;">Error parsing file: ${error.message}</span>`;
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
        const activeTab = document.querySelector('.tab-btn.active').id;
        
        switch (activeTab) {
            case 'singleTab':
                const singleEmail = document.getElementById('singleEmail').value.trim();
                return singleEmail && this.isValidEmail(singleEmail) ? [singleEmail] : [];
                
            case 'multipleTab':
                const multipleText = document.getElementById('multipleEmails').value;
                return this.parseEmailsFromText(multipleText);
                
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
        this.updateProgress(0, totalEmails);
        try {
            for (let i = 0; i < emails.length; i++) {
                const email = emails[i];
                const result = await this.checkWithBackend(email);
                // Attach original row if available
                if (this.originalRows && this.originalRows.length) {
                    const orig = this.originalRows.find(r => r.__email === email);
                    if (orig) result._original = orig;
                }
                this.currentResults.push(result);
                processedEmails++;
                this.updateProgress(processedEmails, totalEmails);
                this.updateResultsDisplay();
            }
            const checkResult = {
                timestamp: new Date().toISOString(),
                totalEmails: emails.length,
                results: this.currentResults,
                summary: this.calculateSummary(this.currentResults)
            };
            this.addToHistory(checkResult);
        } catch (error) {
            console.error('Bulk check failed:', error);
            alert('An error occurred during the check. Please try again.');
        } finally {
            this.isChecking = false;
            this.showLoading(false);
            this.showProgress(false);
            document.getElementById('clearBtn').style.display = 'inline-flex';
        }
    }

    async checkSingleEmail(email) {
        // No longer used, all logic moved to backend
        return await this.checkWithBackend(email);
    }

    async checkWithBackend(email, retries = 2) {
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const response = await fetch('http://localhost:8000/api/check_email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                if (!response.ok) throw new Error('Backend error');
                const data = await response.json();
                // Return all backend fields for full detail in UI
                return data;
            } catch (e) {
                if (attempt === retries) {
                    return { email, status: 'error', reason: e.message };
                }
                await new Promise(res => setTimeout(res, 500 * (attempt + 1)));
            }
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
        tbody.innerHTML = results.map((r, idx) => {
            const risk = this.getRiskLevel(r);
            let riskColor = '';
            if (risk === '✅ safe') riskColor = 'style="color:green;font-weight:bold"';
            else if (risk === '⚠️ medium') riskColor = 'style="color:orange;font-weight:bold"';
            else if (risk === '⛔ high') riskColor = 'style="color:red;font-weight:bold"';
            // Details popup content (escape backticks for inline JS)
            return `
            <tr>
                <td>${r.email || '-'}</td>
                <td>${r.email ? r.email.split('@')[1] : '-'}</td>
                <td>${r.is_free_provider ? 'Free' : r.is_disposable ? 'Disposable' : r.is_role_based ? 'Role' : '-'}</td>
                <td>${r.is_blacklisted ? 'Blacklisted' : '-'}</td>
                <td>${r.status === 'valid' ? '✔️' : r.status === 'catch-all' ? '⚠️' : r.status === 'invalid' ? '❌' : r.status === 'error' ? '❗' : '-'}</td>
                <td>${r.is_catch_all ? 'Yes' : 'No'}</td>
                <td>${typeof r.score === 'number' ? Math.round(r.score * 100) : '-'}</td>
                <td ${riskColor}>${risk.charAt(0).toUpperCase() + risk.slice(1)}</td>
                <td><button class="action-btn details" data-row-idx="${idx}">Details</button></td>
            </tr>
            `;
        }).join('');
        // Attach details popup handler (delegated)
        tbody.onclick = (e) => {
            const btn = e.target.closest('button.details');
            if (!btn) return;
            // Use the correct attribute: data-row-idx
            const idx = btn.getAttribute('data-row-idx');
            if (idx === null) return;
            const r = results[idx];
            if (!r) return;
            // Format details as readable HTML
            const detailsHtml = `
                <h3 style="margin-top:0">Details for: <span style="word-break:break-all">${r.email || '-'}</span></h3>
                <table style="width:100%;border-collapse:collapse;font-size:1em;">
                    <tbody>
                        <tr><td style='font-weight:bold;'>Email</td><td>${r.email || '-'}</td></tr>
                        <hr>
                        <tr><td style='font-weight:bold;'>Status</td><td>${r.status || '-'}</td></tr>
                        <hr>
                        <tr><td style='font-weight:bold;'>Reason</td><td>${r.reason || '-'}</td></tr>
                        <tr><td style='font-weight:bold;'>Disposable</td><td>${r.is_disposable ? 'Yes' : 'No'}</td></tr>
                        <tr><td style='font-weight:bold;'>Free Provider</td><td>${r.is_free_provider ? 'Yes' : 'No'}</td></tr>
                        <tr><td style='font-weight:bold;'>Role-based</td><td>${r.is_role_based ? 'Yes' : 'No'}</td></tr>
                        <tr><td style='font-weight:bold;'>Catch-All</td><td>${r.is_catch_all ? 'Yes' : 'No'}</td></tr>
                        <tr><td style='font-weight:bold;'>Blacklisted</td><td>${r.is_blacklisted ? 'Yes' : 'No'}</td></tr>
                        <tr><td style='font-weight:bold;'>Score</td><td>${typeof r.score === 'number' ? Math.round(r.score * 100) : '-'}</td></tr>
                        <tr><td style='font-weight:bold;'>SPF</td><td>${r.spf ? r.spf : 'None'}</td></tr>
                        <tr><td style='font-weight:bold;'>DKIM</td><td>${r.dkim ? r.dkim : 'None'}</td></tr>
                        <tr><td style='font-weight:bold;'>DMARC</td><td>${r.dmarc ? r.dmarc : 'None'}</td></tr>
                    </tbody>
                </table>
            `;
            showDetailsModal(r.email, detailsHtml);
        };
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
        document.getElementById('totalEmails').textContent = summary.total;
        document.getElementById('validEmails').textContent = summary.valid;
        document.getElementById('catchAllEmails').textContent = summary.catchAll;
        document.getElementById('invalidEmails').textContent = summary.invalid;
        document.getElementById('summaryStats').style.display = 'grid';
        document.getElementById('resultsTableContainer').style.display = 'block';
        this.displayResults(this.currentResults);
    }

    renderResultsTable() {
        // Just call updateResultsDisplay
        this.updateResultsDisplay();
    }

    filterResults() {
        const status = document.getElementById('statusFilter').value;
        const search = document.getElementById('searchFilter').value.trim().toLowerCase();
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
        overlay.style.display = show ? 'flex' : 'none';
    }

    showResults(show) {
        const section = document.getElementById('resultsSection');
        section.style.display = show ? 'block' : 'none';
    }

    showProgress(show) {
        document.getElementById('progressContainer').style.display = show ? 'block' : 'none';
    }

    updateProgress(done, total) {
        const percent = total ? Math.round((done / total) * 100) : 0;
        document.getElementById('progressFill').style.width = percent + '%';
        document.getElementById('progressText').textContent = `Checking emails...`;
        document.getElementById('progressCount').textContent = `${done}/${total}`;
    }

    clearCurrentResults() {
        this.currentResults = [];
        document.getElementById('summaryStats').style.display = 'none';
        document.getElementById('resultsTableContainer').style.display = 'none';
        document.getElementById('resultsSection').style.display = 'none';
        document.getElementById('clearBtn').style.display = 'none';
    }

    exportResults() {
        if (!this.currentResults.length) {
            alert('No results to export');
            return;
        }
        // Show export filter modal
        document.getElementById('exportFilterModal').style.display = 'flex';
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
        
        if (this.history.length === 0) {
            historyList.innerHTML = '<p class="no-history">No checks performed yet</p>';
            return;
        }

        const html = this.history.map(item => {
            const date = new Date(item.timestamp).toLocaleString();
            const tags = [];
            
            if (item.results.mxRecords?.status === 'success') tags.push('<span class="history-tag tag-success">MX ✓</span>');
            if (item.results.smtpTest?.overallStatus === 'success') tags.push('<span class="history-tag tag-success">SMTP ✓</span>');
            if (item.results.catchAllStatus?.status === 'enabled') tags.push('<span class="history-tag tag-warning">Catch-all ON</span>');
            if (item.results.catchAllStatus?.status === 'disabled') tags.push('<span class="history-tag tag-success">Catch-all OFF</span>');
            
            const score = item.results.deliverabilityScore?.score || 0;
            const scoreClass = score >= 80 ? 'tag-success' : score >= 60 ? 'tag-warning' : 'tag-error';
            tags.push(`<span class="history-tag ${scoreClass}">Score: ${score}/100</span>`);

            return `
                <div class="history-item">
                    <div class="history-item-header">
                        <span class="history-domain">${item.domain}</span>
                        <span class="history-timestamp">${date}</span>
                    </div>
                    <div class="history-summary">
                        ${tags.join('')}
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
        a.download = `catchall-check-history-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    loadHistory() {
        try {
            const saved = localStorage.getItem('catchall-checker-history');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Failed to load history:', error);
            return [];
        }
    }

    saveHistory() {
        try {
            localStorage.setItem('catchall-checker-history', JSON.stringify(this.history));
        } catch (error) {
            console.error('Failed to save history:', error);
        }
    }

    showDetailsModal(result) {
        // Compose the full HTML (heading + table) as in detailsHtml
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
        // Use the global function to show the modal
        showDetailsModal(result.email, detailsHtml);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const checker = new CatchAllMailChecker();
    // Export filter modal logic
    const exportModal = document.getElementById('exportFilterModal');
    const closeExportModal = document.getElementById('closeExportFilterModal');
    closeExportModal.onclick = () => exportModal.style.display = 'none';
    exportModal.onclick = (e) => { if (e.target === exportModal) exportModal.style.display = 'none'; };
    function getExportFilters() {
        const form = document.getElementById('exportFilterForm');
        return {
            valid: form.valid.checked,
            invalid: form.invalid.checked,
            catchall: form.catchall.checked,
            safe: form.safe.checked,
            medium: form.medium.checked,
            risk: form.risk.checked
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
        return [columns.map(escape).join(','), ...rows.map(row => columns.map(col => escape(row[col] ?? '')).join(','))].join('\r\n');
    }
    function toExcel(rows, columns) {
        // Simple Excel XML (works for basic data, not for large files)
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
    function prepareFExportRows(results) {
        // Collect all columns from original rows
        let allCols = new Set();
        results.forEach(r => {
            if (r._original) Object.keys(r._original).forEach(k => allCols.add(k));
        });
        allCols.delete('__email');
        // Only add 'email' if not present in original columns
        const hasEmail = allCols.has('email');
        const extraCols = ['validation', 'catch_all', 'risk level'];
        const columns = [...allCols];
        if (!hasEmail) columns.push('email');
        columns.push(...extraCols);
        const rows = results.map(r => {
            const base = r._original ? { ...r._original } : {};
            if (!hasEmail) base.email = r.email;
            base.validation = r.status === 'valid' ? 'Valid' : 'Invalid';
            base.catch_all = r.is_catch_all ? 'Yes' : 'No';
            base['risk level'] = getRiskLevel(r);
            return base;
        });
        return { columns, rows };
    }
    function doExport(type) {
        const filters = getExportFilters();
        const filtered = filterExportResults(checker.currentResults, filters);
        const { columns, rows } = prepareFExportRows(filtered);
        if (type === 'csv') {
            const csv = toCSV(rows, columns);
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `catchall-export-${new Date().toISOString().split('T')[0]}.csv`;
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
            a.download = `catchall-export-${new Date().toISOString().split('T')[0]}.xls`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        exportModal.style.display = 'none';
    }
    document.getElementById('exportAsCSV').onclick = () => doExport('csv');
    document.getElementById('exportAsExcel').onclick = () => doExport('excel');
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
        modal.innerHTML = `<div id='detailsModalContent' style='background:#fff;padding:24px 32px;border-radius:8px;max-width:420px;min-width:320px;box-shadow:0 2px 16px #0002;position:relative;'>
            <button id='closeDetailsModal' style='position:absolute;top:8px;right:8px;font-size:18px;background:none;border:none;cursor:pointer;' title='Close'>&times;</button>
            <div id='detailsModalBody'></div>
        </div>`;
        document.body.appendChild(modal);
        modal.querySelector('#closeDetailsModal').onclick = () => modal.style.display = 'none';
        modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    } else {
        modal.style.display = 'flex';
    }
    // Always show a table, even if html is empty
    if (!html) {
        html = `<h3 style='margin-top:0;'>Details</h3>
        <table style='width:100%;border-collapse:collapse;font-size:1em;'>
            <tbody>
                <tr><td colspan='2' style='text-align:center;color:#888;'>No details available</td></tr>
            </tbody>
        </table>`;
    }
    modal.querySelector('#detailsModalBody').innerHTML = html;
}
