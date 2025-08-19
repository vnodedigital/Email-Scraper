// Fix for the Details button in results table
// This script directly modifies the DOM to override the email details functionality

// Fix for Email Details button functionality
(function() {
    // Wait for the DOM to fully load before executing
    function initDetailsButton() {
        console.log('Email Verifier Fix Script Loading');
        
        // Create a custom details modal in the DOM
        const modalDiv = document.createElement('div');
        modalDiv.id = 'emailDetailsModal';
        modalDiv.style.display = 'none';
        modalDiv.style.position = 'fixed';
        modalDiv.style.top = '0';
        modalDiv.style.left = '0';
        modalDiv.style.width = '100%';
        modalDiv.style.height = '100%';
        modalDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modalDiv.style.backdropFilter = 'blur(5px)';
        modalDiv.style.zIndex = '10000';
        modalDiv.style.overflowY = 'auto';
        
        const modalContent = document.createElement('div');
        modalContent.id = 'emailDetailsContent';
        modalContent.style.background = 'white';
        modalContent.style.margin = '40px auto';
        modalContent.style.padding = '0';
        modalContent.style.borderRadius = '16px';
        modalContent.style.width = '90%';
        modalContent.style.maxWidth = '800px';
        modalContent.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.3)';
        modalContent.style.position = 'relative';
        modalContent.style.overflow = 'hidden';
        
        const modalHeader = document.createElement('div');
        modalHeader.id = 'emailDetailsHeader';
        modalHeader.style.background = 'linear-gradient(135deg, #0d9488, #14b8a6)';
        modalHeader.style.color = 'white';
        modalHeader.style.padding = '1.5rem 2rem';
        modalHeader.style.borderRadius = '16px 16px 0 0';
        
        const modalTitle = document.createElement('h2');
        modalTitle.style.margin = '0 0 0.5rem 0';
        modalTitle.style.fontSize = '1.5rem';
        modalTitle.style.display = 'flex';
        modalTitle.style.alignItems = 'center';
        modalTitle.style.gap = '0.75rem';
        
        const titleIcon = document.createElement('i');
        titleIcon.className = 'fas fa-envelope';
        
        const titleText = document.createElement('span');
        titleText.id = 'emailDetailsTitle';
        titleText.textContent = 'Email Details';
        
        modalTitle.appendChild(titleIcon);
        modalTitle.appendChild(titleText);
        
        const closeButton = document.createElement('button');
        closeButton.id = 'closeEmailDetailsModal';
        closeButton.innerHTML = '&times;';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '1rem';
        closeButton.style.right = '1.5rem';
        closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
        closeButton.style.border = 'none';
        closeButton.style.color = 'white';
        closeButton.style.fontSize = '1.5rem';
        closeButton.style.cursor = 'pointer';
        closeButton.style.width = '40px';
        closeButton.style.height = '40px';
        closeButton.style.borderRadius = '50%';
        closeButton.style.display = 'flex';
        closeButton.style.alignItems = 'center';
        closeButton.style.justifyContent = 'center';
        
        const modalBody = document.createElement('div');
        modalBody.id = 'emailDetailsBody';
        modalBody.style.padding = '2rem';
        
        modalHeader.appendChild(modalTitle);
        modalHeader.appendChild(closeButton);
        
        modalContent.appendChild(modalHeader);
        modalContent.appendChild(modalBody);
        
        modalDiv.appendChild(modalContent);
        document.body.appendChild(modalDiv);
        
        // Close modal functionality
        closeButton.addEventListener('click', function() {
            modalDiv.style.display = 'none';
        });
        
        // Close on outside click
        modalDiv.addEventListener('click', function(e) {
            if (e.target === modalDiv) {
                modalDiv.style.display = 'none';
            }
        });

        // The core fix: Override the global showDetailsModal function
        window.showDetailsModal = function(email, html) {
            console.log('Intercepted showDetailsModal call for email:', email);
            
            // Find the result object based on email
            let resultObject = null;
            if (window.mailChecker && window.mailChecker.currentResults) {
                resultObject = window.mailChecker.currentResults.find(r => r.email === email);
            }
            
            if (resultObject) {
                // Use our enhanced modal if we have the full result object
                showEnhancedEmailDetails(resultObject);
            } else {
                // Fallback to original content if we can't find the result object
                document.getElementById('emailDetailsTitle').textContent = email || 'Email Details';
                document.getElementById('emailDetailsBody').innerHTML = html;
                modalDiv.style.display = 'block';
            }
            
            // Don't proceed with the original modal
            return false;
        };
        
        // Also override the class method if possible
        if (window.mailChecker) {
            console.log('Overriding original showEmailDetailsModal method');
            window.mailChecker.showEmailDetailsModal = function(result) {
                console.log('Intercepted showEmailDetailsModal call with result:', result);
                showEnhancedEmailDetails(result);
                return false; // Prevent default behavior
            };
        }
        
        // Function to show enhanced email details
        function showEnhancedEmailDetails(result) {
            console.log('Showing enhanced email details for:', result.email);
            
            // Set the email in the title
            document.getElementById('emailDetailsTitle').textContent = result.email || 'Email Details';
            
            // Create the detailed content HTML
            let detailsHTML = '<h3 style="margin-top:0; font-size: 18px; color: #0d9488;">Email Verification Details</h3>';
            detailsHTML += '<p style="word-break:break-all; font-weight: bold; font-size: 16px; margin-bottom: 20px;">' + (result.email || '-') + '</p>';
            
            // Validation Result section
            detailsHTML += '<div style="margin-bottom: 15px; padding: 10px; background: #f8fafc; border-radius: 8px;">';
            detailsHTML += '<h4 style="margin-top: 0; color: #0d9488; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;"><i class="fas fa-check-circle"></i> Validation Result</h4>';
            detailsHTML += '<table style="width:100%; border-collapse:collapse; font-size:14px;"><tbody>';
            
            // Status row with conditional formatting
            let statusColor = result.status === 'valid' ? '#16a34a' : (result.is_catch_all ? '#d97706' : '#dc2626');
            let statusBg = result.status === 'valid' ? '#dcfce7' : (result.is_catch_all ? '#fef3c7' : '#fee2e2');
            let statusText = result.status === 'valid' ? 'Valid' : (result.is_catch_all ? 'Catch-All' : 'Invalid');
            
            detailsHTML += '<tr><td style="padding: 8px 4px; font-weight:bold; width: 40%;">Status:</td>';
            detailsHTML += '<td style="padding: 8px 4px;"><span style="padding: 5px 10px; border-radius: 20px; font-weight: bold; background: ' + 
                        statusBg + '; color: ' + statusColor + ';">' + statusText + '</span></td></tr>';
            
            detailsHTML += '<tr><td style="padding: 8px 4px; font-weight:bold;">Reason:</td>';
            detailsHTML += '<td style="padding: 8px 4px;">' + (result.reason || 'N/A') + '</td></tr>';
            
            detailsHTML += '<tr><td style="padding: 8px 4px; font-weight:bold;">Score:</td>';
            detailsHTML += '<td style="padding: 8px 4px;">' + (typeof result.score === 'number' ? Math.round(result.score * 100) : 'N/A') + '/100</td></tr>';
            
            detailsHTML += '<tr><td style="padding: 8px 4px; font-weight:bold;">Validation Time:</td>';
            detailsHTML += '<td style="padding: 8px 4px;">' + (result.validation_time || 'N/A') + '</td></tr>';
            detailsHTML += '</tbody></table></div>';
            
            // Email Properties section
            detailsHTML += '<div style="margin-bottom: 15px; padding: 10px; background: #f8fafc; border-radius: 8px;">';
            detailsHTML += '<h4 style="margin-top: 0; color: #0d9488; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">';
            detailsHTML += '<i class="fas fa-info-circle"></i> Email Properties</h4>';
            detailsHTML += '<table style="width:100%; border-collapse:collapse; font-size:14px;"><tbody>';
            
            // Extract domain from email if not provided
            let domain = result.domain;
            if (!domain && result.email) {
                let parts = result.email.split('@');
                domain = parts.length > 1 ? parts[1] : 'N/A';
            } else if (!domain) {
                domain = 'N/A';
            }
            
            detailsHTML += '<tr><td style="padding: 8px 4px; font-weight:bold; width: 40%;">Domain:</td>';
            detailsHTML += '<td style="padding: 8px 4px;">' + domain + '</td></tr>';
            
            // Email properties with conditional coloring
            detailsHTML += '<tr><td style="padding: 8px 4px; font-weight:bold;">Free Provider:</td>';
            detailsHTML += '<td style="padding: 8px 4px;"><span style="color: ' + (result.is_free_provider ? '#d97706' : '#16a34a') + '">';
            detailsHTML += (result.is_free_provider ? 'Yes' : 'No') + '</span></td></tr>';
            
            detailsHTML += '<tr><td style="padding: 8px 4px; font-weight:bold;">Disposable/Temporary:</td>';
            detailsHTML += '<td style="padding: 8px 4px;"><span style="color: ' + (result.is_disposable ? '#dc2626' : '#16a34a') + '">';
            detailsHTML += (result.is_disposable ? 'Yes' : 'No') + '</span></td></tr>';
            
            detailsHTML += '<tr><td style="padding: 8px 4px; font-weight:bold;">Role-based:</td>';
            detailsHTML += '<td style="padding: 8px 4px;"><span style="color: ' + (result.is_role_based ? '#d97706' : '#16a34a') + '">';
            detailsHTML += (result.is_role_based ? 'Yes' : 'No') + '</span></td></tr>';
            
            detailsHTML += '<tr><td style="padding: 8px 4px; font-weight:bold;">Catch-All Domain:</td>';
            detailsHTML += '<td style="padding: 8px 4px;"><span style="color: ' + (result.is_catch_all ? '#d97706' : '#16a34a') + '">';
            detailsHTML += (result.is_catch_all ? 'Yes' : 'No') + '</span></td></tr>';
            
            detailsHTML += '<tr><td style="padding: 8px 4px; font-weight:bold;">Blacklisted:</td>';
            detailsHTML += '<td style="padding: 8px 4px;"><span style="color: ' + (result.is_blacklisted ? '#dc2626' : '#16a34a') + '">';
            detailsHTML += (result.is_blacklisted ? 'Yes' : 'No') + '</span></td></tr>';
            detailsHTML += '</tbody></table></div>';
            
            // SMTP Verification section
            detailsHTML += '<div style="margin-bottom: 15px; padding: 10px; background: #f8fafc; border-radius: 8px;">';
            detailsHTML += '<h4 style="margin-top: 0; color: #0d9488; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">';
            detailsHTML += '<i class="fas fa-server"></i> SMTP Verification</h4>';
            detailsHTML += '<table style="width:100%; border-collapse:collapse; font-size:14px;"><tbody>';
            
            // SMTP status with conditional coloring
            let smtpColor = '';
            let smtpText = '';
            if (result.smtp_valid === true) {
                smtpColor = '#16a34a';
                smtpText = 'Yes';
            } else if (result.smtp_valid === false) {
                smtpColor = '#dc2626';
                smtpText = 'No';
            } else {
                smtpColor = '#d97706';
                smtpText = 'Unknown';
            }
            
            detailsHTML += '<tr><td style="padding: 8px 4px; font-weight:bold; width: 40%;">SMTP Valid:</td>';
            detailsHTML += '<td style="padding: 8px 4px;"><span style="color: ' + smtpColor + '">' + smtpText + '</span></td></tr>';
            
            detailsHTML += '<tr><td style="padding: 8px 4px; font-weight:bold;">MX Host:</td>';
            detailsHTML += '<td style="padding: 8px 4px;">' + (result.mx_host || 'N/A') + '</td></tr>';
            
            detailsHTML += '<tr><td style="padding: 8px 4px; font-weight:bold;">Port:</td>';
            detailsHTML += '<td style="padding: 8px 4px;">' + (result.port || 'N/A') + '</td></tr>';
            
            detailsHTML += '<tr><td style="padding: 8px 4px; font-weight:bold;">SMTP Status:</td>';
            detailsHTML += '<td style="padding: 8px 4px;">' + (result.smtp_status || 'N/A') + '</td></tr>';
            
            detailsHTML += '<tr><td style="padding: 8px 4px; font-weight:bold;">SMTP Response:</td>';
            detailsHTML += '<td style="padding: 8px 4px; word-break: break-word;">' + (result.smtp_response || 'N/A') + '</td></tr>';
            detailsHTML += '</tbody></table></div>';
            
            // Security Records section
            detailsHTML += '<div style="margin-bottom: 0; padding: 10px; background: #f8fafc; border-radius: 8px;">';
            detailsHTML += '<h4 style="margin-top: 0; color: #0d9488; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">';
            detailsHTML += '<i class="fas fa-shield-alt"></i> Security Records</h4>';
            detailsHTML += '<table style="width:100%; border-collapse:collapse; font-size:14px;"><tbody>';
            
            detailsHTML += '<tr><td style="padding: 8px 4px; font-weight:bold; width: 40%;">SPF:</td>';
            detailsHTML += '<td style="padding: 8px 4px;">' + (result.spf || 'Not found') + '</td></tr>';
            
            detailsHTML += '<tr><td style="padding: 8px 4px; font-weight:bold;">DKIM:</td>';
            detailsHTML += '<td style="padding: 8px 4px;">' + (result.dkim || 'Not found') + '</td></tr>';
            
            detailsHTML += '<tr><td style="padding: 8px 4px; font-weight:bold;">DMARC:</td>';
            detailsHTML += '<td style="padding: 8px 4px;">' + (result.dmarc || 'Not found') + '</td></tr>';
            
            detailsHTML += '</tbody></table></div>';
            
            // Insert content into modal body
            document.getElementById('emailDetailsBody').innerHTML = detailsHTML;
            
            // Show the modal
            modalDiv.style.display = 'block';
        }
        
        // Make our function globally available
        window.showEnhancedEmailDetails = showEnhancedEmailDetails;
        
        console.log('Email Verifier Fix Script Loaded Successfully');
    }
    
    // If the DOM is already loaded, run init now, otherwise wait for DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDetailsButton);
    } else {
        initDetailsButton();
    }
})();
                <h3 style="margin-top:0; font-size: 18px; color: #0d9488;">Email Verification Details</h3>
                <p style="word-break:break-all; font-weight: bold; font-size: 16px; margin-bottom: 20px;">${result.email || '-'}</p>
                
                <div style="margin-bottom: 15px; padding: 10px; background: #f8fafc; border-radius: 8px;">
                    <h4 style="margin-top: 0; color: #0d9488; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
                        <i class="fas fa-check-circle"></i> Validation Result
                    </h4>
                    <table style="width:100%; border-collapse:collapse; font-size:14px;">
                        <tbody>
                            <tr>
                                <td style="padding: 8px 4px; font-weight:bold; width: 40%;">Status:</td>
                                <td style="padding: 8px 4px;">
                                    <span style="
                                        padding: 5px 10px;
                                        border-radius: 20px;
                                        font-weight: bold;
                                        background: ${result.status === 'valid' ? '#dcfce7' : result.is_catch_all ? '#fef3c7' : '#fee2e2'};
                                        color: ${result.status === 'valid' ? '#16a34a' : result.is_catch_all ? '#d97706' : '#dc2626'};
                                    ">
                                        ${result.status === 'valid' ? 'Valid' : result.is_catch_all ? 'Catch-All' : 'Invalid'}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 4px; font-weight:bold;">Reason:</td>
                                <td style="padding: 8px 4px;">${result.reason || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 4px; font-weight:bold;">Score:</td>
                                <td style="padding: 8px 4px;">${typeof result.score === 'number' ? Math.round(result.score * 100) : 'N/A'}/100</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 4px; font-weight:bold;">Validation Time:</td>
                                <td style="padding: 8px 4px;">${result.validation_time || 'N/A'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <div style="margin-bottom: 15px; padding: 10px; background: #f8fafc; border-radius: 8px;">
                    <h4 style="margin-top: 0; color: #0d9488; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
                        <i class="fas fa-info-circle"></i> Email Properties
                    </h4>
                    <table style="width:100%; border-collapse:collapse; font-size:14px;">
                        <tbody>
                            <tr>
                                <td style="padding: 8px 4px; font-weight:bold; width: 40%;">Domain:</td>
                                <td style="padding: 8px 4px;">${result.domain || result.email?.split('@')[1] || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 4px; font-weight:bold;">Free Provider:</td>
                                <td style="padding: 8px 4px;">
                                    <span style="color: ${result.is_free_provider ? '#d97706' : '#16a34a'}">
                                        ${result.is_free_provider ? 'Yes' : 'No'}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 4px; font-weight:bold;">Disposable/Temporary:</td>
                                <td style="padding: 8px 4px;">
                                    <span style="color: ${result.is_disposable ? '#dc2626' : '#16a34a'}">
                                        ${result.is_disposable ? 'Yes' : 'No'}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 4px; font-weight:bold;">Role-based:</td>
                                <td style="padding: 8px 4px;">
                                    <span style="color: ${result.is_role_based ? '#d97706' : '#16a34a'}">
                                        ${result.is_role_based ? 'Yes' : 'No'}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 4px; font-weight:bold;">Catch-All Domain:</td>
                                <td style="padding: 8px 4px;">
                                    <span style="color: ${result.is_catch_all ? '#d97706' : '#16a34a'}">
                                        ${result.is_catch_all ? 'Yes' : 'No'}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 4px; font-weight:bold;">Blacklisted:</td>
                                <td style="padding: 8px 4px;">
                                    <span style="color: ${result.is_blacklisted ? '#dc2626' : '#16a34a'}">
                                        ${result.is_blacklisted ? 'Yes' : 'No'}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <div style="margin-bottom: 15px; padding: 10px; background: #f8fafc; border-radius: 8px;">
                    <h4 style="margin-top: 0; color: #0d9488; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
                        <i class="fas fa-server"></i> SMTP Verification
                    </h4>
                    <table style="width:100%; border-collapse:collapse; font-size:14px;">
                        <tbody>
                            <tr>
                                <td style="padding: 8px 4px; font-weight:bold; width: 40%;">SMTP Valid:</td>
                                <td style="padding: 8px 4px;">
                                    <span style="color: ${result.smtp_valid === true ? '#16a34a' : result.smtp_valid === false ? '#dc2626' : '#d97706'}">
                                        ${result.smtp_valid === true ? 'Yes' : result.smtp_valid === false ? 'No' : 'Unknown'}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 4px; font-weight:bold;">MX Host:</td>
                                <td style="padding: 8px 4px;">${result.mx_host || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 4px; font-weight:bold;">Port:</td>
                                <td style="padding: 8px 4px;">${result.port || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 4px; font-weight:bold;">SMTP Status:</td>
                                <td style="padding: 8px 4px;">${result.smtp_status || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 4px; font-weight:bold;">SMTP Response:</td>
                                <td style="padding: 8px 4px; word-break: break-word;">${result.smtp_response || 'N/A'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <div style="margin-bottom: 0; padding: 10px; background: #f8fafc; border-radius: 8px;">
                    <h4 style="margin-top: 0; color: #0d9488; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
                        <i class="fas fa-shield-alt"></i> Security Records
                    </h4>
                    <table style="width:100%; border-collapse:collapse; font-size:14px;">
                        <tbody>
                            <tr>
                                <td style="padding: 8px 4px; font-weight:bold; width: 40%;">SPF:</td>
                                <td style="padding: 8px 4px;">${result.spf || 'Not found'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 4px; font-weight:bold;">DKIM:</td>
                                <td style="padding: 8px 4px;">${result.dkim || 'Not found'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 4px; font-weight:bold;">DMARC:</td>
                                <td style="padding: 8px 4px;">${result.dmarc || 'Not found'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
            
            // Use the existing modal implementation but with enhanced content
            showDetailsModal(result.email, detailsHtml);
        };
        
        console.log('Email verifier details button functionality enhanced!');
    }
});
