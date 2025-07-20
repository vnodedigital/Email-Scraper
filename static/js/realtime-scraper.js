/**
 * Professional Real-time Scraping System
 * Advanced email scraper with real-time progress tracking and animations
 */

class ScrapingManager {
    constructor() {
        this.activeTasks = new Map();
        this.progressIntervals = new Map();
        this.animationFrames = new Map();
        this.csrfToken = this.getCSRFToken();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeAnimations();
        this.checkUserCredits();
    }

    getCSRFToken() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'csrftoken') return value;
        }
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
    }

    setupEventListeners() {
        // Tab functionality
        this.setupTabNavigation();

        // Specific URL Scraping
        const specificForm = document.getElementById('specific-url-form');
        if (specificForm) {
            specificForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.startSpecificURLScraping();
            });
        }

        // Multi-level Scraping
        const multilevelForm = document.getElementById('multilevel-form');
        if (multilevelForm) {
            multilevelForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.startMultilevelScraping();
            });
        }

        // Google Search Scraping
        const googleForm = document.getElementById('google-form');
        if (googleForm) {
            googleForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.startGoogleScraping();
            });
        }

        // Stop all scraping
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('stop-scraping-btn')) {
                this.stopScraping(e.target.dataset.taskId);
            }
        });
    }

    setupTabNavigation() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.dataset.tab;
                
                // Remove active class from all tabs and contents
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding content
                btn.classList.add('active');
                const targetContent = document.getElementById(`tab-${targetTab}`);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });
    }

    initializeAnimations() {
        // Initialize particle effects and background animations
        this.createParticleEffect();
        this.animateBackgroundGradient();
    }

    createParticleEffect() {
        const canvas = document.getElementById('particle-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles = [];
        for (let i = 0; i < 50; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                radius: Math.random() * 3 + 1,
                opacity: Math.random() * 0.5 + 0.2
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            particles.forEach(particle => {
                particle.x += particle.vx;
                particle.y += particle.vy;
                
                if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
                if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;
                
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(13, 148, 136, ${particle.opacity})`;
                ctx.fill();
            });
            
            requestAnimationFrame(animate);
        };
        animate();
    }

    animateBackgroundGradient() {
        const gradientElements = document.querySelectorAll('.gradient-bg');
        gradientElements.forEach(el => {
            let hue = 0;
            setInterval(() => {
                hue = (hue + 1) % 360;
                el.style.background = `linear-gradient(135deg, hsl(${hue}, 70%, 95%) 0%, hsl(${(hue + 60) % 360}, 70%, 95%) 100%)`;
            }, 100);
        });
    }

    async checkUserCredits() {
        try {
            const response = await fetch('/accounts/api/user-profile/', {
                headers: {
                    'X-CSRFToken': this.csrfToken,
                }
            });
            const data = await response.json();
            this.updateCreditsDisplay(data.email_credits);
        } catch (error) {
            console.error('Error checking credits:', error);
        }
    }

    updateCreditsDisplay(credits) {
        const creditElements = document.querySelectorAll('.credits-display');
        creditElements.forEach(el => {
            el.textContent = credits;
            el.className = `credits-display ${this.getCreditClass(credits)}`;
        });
    }

    getCreditClass(credits) {
        if (credits > 100) return 'credits-high';
        if (credits > 20) return 'credits-medium';
        return 'credits-low';
    }

    async startSpecificURLScraping() {
        const url = document.getElementById('specific-url').value.trim();
        if (!url) {
            this.showError('Please enter a valid URL');
            return;
        }

        const taskData = {
            url: url,
            type: 'specific-url'
        };

        this.startScraping('specific-url', '/scraper/api/scrape/specific-url/', taskData);
    }

    async startMultilevelScraping() {
        const url = document.getElementById('multilevel-url').value.trim();
        const depth = parseInt(document.getElementById('multilevel-depth').value) || 2;
        
        if (!url) {
            this.showError('Please enter a valid URL');
            return;
        }

        const taskData = {
            url: url,
            depth: depth,
            type: 'multilevel'
        };

        this.startScraping('multilevel', '/scraper/api/scrape/multilevel/', taskData);
    }

    async startGoogleScraping() {
        const keyword = document.getElementById('google-keyword').value.trim();
        const country = document.getElementById('google-country').value;
        const resultLimit = parseInt(document.getElementById('google-limit').value) || 10;
        
        if (!keyword) {
            this.showError('Please enter a search keyword');
            return;
        }

        const taskData = {
            keyword: keyword,
            country: country,
            result_limit: resultLimit,
            type: 'google'
        };

        this.startScraping('google', '/scraper/api/scrape/google/', taskData);
    }

    async startScraping(type, endpoint, data) {
        try {
            // Show loading state
            this.showScrapingModal(type);
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.csrfToken,
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                const taskId = result.task_id;
                this.activeTasks.set(taskId, { type, data });
                this.startProgressTracking(taskId, type);
                this.showSuccessMessage(`${type} scraping started successfully!`);
            } else {
                this.handleScrapingError(result);
            }
        } catch (error) {
            this.showError('Network error occurred. Please try again.');
            console.error('Scraping error:', error);
        }
    }

    startProgressTracking(taskId, type) {
        const progressInterval = setInterval(async () => {
            try {
                const response = await fetch(`/scraper/api/progress/${taskId}/`, {
                    headers: {
                        'X-CSRFToken': this.csrfToken,
                    }
                });
                
                const progress = await response.json();
                
                if (response.ok) {
                    this.updateProgress(taskId, progress, type);
                    
                    if (progress.progress >= 100 || progress.status.toLowerCase().includes('error')) {
                        clearInterval(progressInterval);
                        this.progressIntervals.delete(taskId);
                        
                        if (progress.progress >= 100) {
                            this.handleScrapingComplete(taskId, progress);
                        }
                    }
                } else {
                    clearInterval(progressInterval);
                    this.progressIntervals.delete(taskId);
                    this.showError('Failed to track progress');
                }
            } catch (error) {
                console.error('Progress tracking error:', error);
            }
        }, 1000);

        this.progressIntervals.set(taskId, progressInterval);
    }

    updateProgress(taskId, progress, type) {
        const progressBar = document.getElementById(`progress-bar-${type}`);
        const progressText = document.getElementById(`progress-text-${type}`);
        const statusText = document.getElementById(`status-text-${type}`);

        if (progressBar) {
            progressBar.style.width = `${progress.progress}%`;
            progressBar.setAttribute('aria-valuenow', progress.progress);
        }

        if (progressText) {
            progressText.textContent = `${progress.progress}%`;
        }

        if (statusText) {
            statusText.textContent = progress.status;
        }

        // Add pulsing animation for active progress
        const container = document.getElementById(`scraping-container-${type}`);
        if (container && progress.progress < 100) {
            container.classList.add('scraping-active');
        }
    }

    handleScrapingComplete(taskId, progress) {
        const task = this.activeTasks.get(taskId);
        if (!task) return;

        const { type } = task;
        const container = document.getElementById(`scraping-container-${type}`);
        
        if (container) {
            container.classList.remove('scraping-active');
            container.classList.add('scraping-complete');
        }

        // Display results
        if (progress.data) {
            this.displayResults(type, progress.data);
            this.updateCreditsDisplay(progress.data.remaining_credits);
        }

        // Clean up
        this.activeTasks.delete(taskId);
        
        // Auto-hide modal after 3 seconds
        setTimeout(() => {
            this.hideScrapingModal(type);
        }, 3000);

        this.showSuccessMessage(`${type} scraping completed! Found ${progress.data?.total_found || 0} emails.`);
    }

    displayResults(type, data) {
        const resultsContainer = document.getElementById(`results-container-${type}`);
        if (!resultsContainer) return;

        const emails = data.emails || [];
        const urls = data.urls || [];

        let html = `
            <div class="results-header">
                <h3><i class="fas fa-check-circle"></i> Scraping Results</h3>
                <div class="results-stats">
                    <span class="stat-item">
                        <i class="fas fa-envelope"></i>
                        <strong>${emails.length}</strong> Emails Found
                    </span>
                    <span class="stat-item">
                        <i class="fas fa-link"></i>
                        <strong>${urls.length}</strong> URLs Processed
                    </span>
                    <span class="stat-item">
                        <i class="fas fa-clock"></i>
                        <strong>${data.processing_time?.toFixed(2)}s</strong> Processing Time
                    </span>
                </div>
            </div>
        `;

        if (emails.length > 0) {
            html += `
                <div class="emails-section">
                    <h4><i class="fas fa-at"></i> Found Emails</h4>
                    <div class="emails-grid">
                        ${emails.map(email => `
                            <div class="email-item">
                                <i class="fas fa-envelope"></i>
                                <span class="result-email">${email}</span>
                                <button class="copy-btn" onclick="copyToClipboard('${email}')">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        if (urls.length > 0 && type !== 'specific-url') {
            html += `
                <div class="urls-section">
                    <h4><i class="fas fa-globe"></i> Processed URLs</h4>
                    <div class="urls-list">
                        ${urls.slice(0, 10).map(url => `
                            <div class="url-item">
                                <i class="fas fa-external-link-alt"></i>
                                <a href="${url}" target="_blank">${url}</a>
                            </div>
                        `).join('')}
                        ${urls.length > 10 ? `<div class="url-item more">... and ${urls.length - 10} more URLs</div>` : ''}
                    </div>
                </div>
            `;
        }

        resultsContainer.innerHTML = html;
        resultsContainer.style.display = 'block';

        // Show export section if emails were found
        if (emails.length > 0) {
            const exportSection = document.getElementById(`export-section-${type}`);
            if (exportSection) {
                exportSection.style.display = 'block';
            }
        }

        // Animate results appearance
        setTimeout(() => {
            resultsContainer.classList.add('results-visible');
        }, 100);
    }

    showScrapingModal(type) {
        const modal = document.getElementById(`scraping-modal-${type}`);
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('modal-visible'), 10);
        }
    }

    hideScrapingModal(type) {
        const modal = document.getElementById(`scraping-modal-${type}`);
        if (modal) {
            modal.classList.remove('modal-visible');
            setTimeout(() => modal.style.display = 'none', 300);
        }
    }

    stopScraping(taskId) {
        if (this.progressIntervals.has(taskId)) {
            clearInterval(this.progressIntervals.get(taskId));
            this.progressIntervals.delete(taskId);
        }
        
        if (this.activeTasks.has(taskId)) {
            const task = this.activeTasks.get(taskId);
            this.activeTasks.delete(taskId);
            this.hideScrapingModal(task.type);
            this.showWarningMessage('Scraping stopped by user');
        }
    }

    handleScrapingError(error) {
        if (error.error && error.error.includes('credits')) {
            this.showCreditAlert();
        } else {
            this.showError(error.error || 'An error occurred during scraping');
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccessMessage(message) {
        this.showNotification(message, 'success');
    }

    showWarningMessage(message) {
        this.showNotification(message, 'warning');
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => notification.classList.add('notification-visible'), 10);

        // Auto remove
        setTimeout(() => {
            notification.classList.remove('notification-visible');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    showCreditAlert() {
        const modal = document.createElement('div');
        modal.className = 'credit-alert-modal';
        modal.innerHTML = `
            <div class="credit-alert-content">
                <div class="credit-alert-header">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Insufficient Credits</h3>
                </div>
                <div class="credit-alert-body">
                    <p>You don't have enough email credits to perform this scraping operation.</p>
                    <p>Please upgrade your plan or purchase more credits to continue.</p>
                </div>
                <div class="credit-alert-actions">
                    <button class="btn btn-primary" onclick="window.location.href='/package/package/'">
                        <i class="fas fa-upgrade"></i> Upgrade Plan
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.credit-alert-modal').remove()">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('modal-visible'), 10);
    }
}

// Global functions for export and copy functionality
window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Show success feedback
        const notification = document.createElement('div');
        notification.className = 'copy-success';
        notification.textContent = 'Email copied to clipboard!';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
    });
};

// Export functionality
window.exportResults = function(type, format) {
    const container = document.getElementById(`results-container-${type}`);
    const emailElements = container.querySelectorAll('.email-item .result-email, .email-item span');
    
    if (emailElements.length === 0) {
        alert('No emails found to export!');
        return;
    }

    const emails = Array.from(emailElements).map(el => el.textContent.trim()).filter(email => email);
    let content, filename, mimeType;

    if (format === 'csv') {
        content = 'Email Address\n' + emails.join('\n');
        filename = `scraped-emails-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
        mimeType = 'text/csv;charset=utf-8;';
    } else if (format === 'excel') {
        // Create proper Excel XML format for .xls file
        const excelHeader = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">
<DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
<Author>Email Scraper</Author>
<LastAuthor>Email Scraper</LastAuthor>
<Created>${new Date().toISOString()}</Created>
<Version>1.0</Version>
</DocumentProperties>
<ExcelWorkbook xmlns="urn:schemas-microsoft-com:office:excel">
<WindowHeight>9000</WindowHeight>
<WindowWidth>13860</WindowWidth>
<WindowTopX>0</WindowTopX>
<WindowTopY>0</WindowTopY>
<ProtectStructure>False</ProtectStructure>
<ProtectWindows>False</ProtectWindows>
</ExcelWorkbook>
<Styles>
<Style ss:ID="Header">
<Font ss:Bold="1" ss:Size="12"/>
<Interior ss:Color="#D3D3D3" ss:Pattern="Solid"/>
<Borders>
<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
</Borders>
</Style>
<Style ss:ID="Default">
<Borders>
<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
</Borders>
</Style>
</Styles>
<Worksheet ss:Name="Scraped Emails">
<Table>
<Row>
<Cell ss:StyleID="Header"><Data ss:Type="String">Email Address</Data></Cell>
</Row>`;
        
        const excelBody = emails.map(email => 
            `<Row><Cell ss:StyleID="Default"><Data ss:Type="String">${email}</Data></Cell></Row>`
        ).join('');
        
        const excelFooter = `</Table>
</Worksheet>
</Workbook>`;
        
        content = excelHeader + excelBody + excelFooter;
        filename = `scraped-emails-${type}-${new Date().toISOString().slice(0, 10)}.xls`;
        mimeType = 'application/vnd.ms-excel;charset=utf-8;';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Show success message
    const notification = document.createElement('div');
    notification.innerHTML = `
        <div style="
            position: fixed; 
            top: 20px; 
            right: 20px; 
            background: linear-gradient(135deg, #10b981, #059669);
            color: white; 
            padding: 1rem 1.5rem; 
            border-radius: 12px; 
            box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
            z-index: 10000;
            font-weight: 600;
            animation: slideInRight 0.3s ease;
        ">
            <i class="fas fa-check-circle"></i> 
            Exported ${emails.length} emails successfully!
        </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 3000);
};

window.exportEmails = function(type, format) {
    return window.exportResults(type, format);
};

// Initialize the scraping manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ScrapingManager();
});
