from django.contrib import admin
from django.http import HttpResponse
from .models import EmailVerificationHistory
import xlwt
from datetime import datetime


def export_to_excel(modeladmin, request, queryset):
    """
    Export selected EmailVerificationHistory records to Excel format (.xls)
    """
    print(f"Export action called with {queryset.count()} items")  # Debug
    
    # Create workbook and worksheet
    response = HttpResponse(content_type='application/ms-excel')
    response['Content-Disposition'] = f'attachment; filename="email_verification_history_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xls"'
    
    wb = xlwt.Workbook(encoding='utf-8')
    ws = wb.add_sheet('Email Verification History')
    
    # Define styles
    header_style = xlwt.XFStyle()
    header_font = xlwt.Font()
    header_font.bold = True
    header_style.font = header_font
    
    date_style = xlwt.XFStyle()
    date_style.num_format_str = 'M/D/YY H:MM'
    
    # Write headers
    headers = [
        'User', 'Title', 'Status', 'Email Count', 'Valid Count', 
        'Invalid Count', 'Catch-All Count', 'Success Rate (%)', 
        'Credits Used', 'Created At', 'Updated At'
    ]
    
    for col, header in enumerate(headers):
        ws.write(0, col, header, header_style)
    
    # Write data
    for row, history in enumerate(queryset, start=1):
        ws.write(row, 0, str(history.user.username))
        ws.write(row, 1, history.title)
        ws.write(row, 2, history.status)
        ws.write(row, 3, history.email_count)
        ws.write(row, 4, history.valid_count)
        ws.write(row, 5, history.invalid_count)
        ws.write(row, 6, history.catchall_count)
        ws.write(row, 7, f"{history.success_rate}%")
        ws.write(row, 8, history.credits_used or 0)
        ws.write(row, 9, history.created_at, date_style)
        ws.write(row, 10, history.updated_at, date_style)
    
    # Auto-adjust column widths
    for col in range(len(headers)):
        ws.col(col).width = 4000  # Adjust width as needed
    
    wb.save(response)
    return response

export_to_excel.short_description = "Export selected items to Excel (.xls)"


def export_detailed_to_excel(modeladmin, request, queryset):
    """
    Export selected EmailVerificationHistory records with detailed email data to Excel format (.xls)
    """
    # Create workbook and worksheet
    response = HttpResponse(content_type='application/ms-excel')
    response['Content-Disposition'] = f'attachment; filename="detailed_email_verification_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xls"'
    
    wb = xlwt.Workbook(encoding='utf-8')
    
    # Summary sheet
    ws_summary = wb.add_sheet('Summary')
    
    # Define styles
    header_style = xlwt.XFStyle()
    header_font = xlwt.Font()
    header_font.bold = True
    header_style.font = header_font
    
    date_style = xlwt.XFStyle()
    date_style.num_format_str = 'M/D/YY H:MM'
    
    # Write summary headers
    summary_headers = [
        'User', 'Title', 'Status', 'Email Count', 'Valid Count', 
        'Invalid Count', 'Catch-All Count', 'Success Rate (%)', 
        'Credits Used', 'Created At'
    ]
    
    for col, header in enumerate(summary_headers):
        ws_summary.write(0, col, header, header_style)
    
    # Write summary data
    for row, history in enumerate(queryset, start=1):
        ws_summary.write(row, 0, str(history.user.username))
        ws_summary.write(row, 1, history.title)
        ws_summary.write(row, 2, history.status)
        ws_summary.write(row, 3, history.email_count)
        ws_summary.write(row, 4, history.valid_count)
        ws_summary.write(row, 5, history.invalid_count)
        ws_summary.write(row, 6, history.catchall_count)
        ws_summary.write(row, 7, f"{history.success_rate}%")
        ws_summary.write(row, 8, history.credits_used or 0)
        ws_summary.write(row, 9, history.created_at, date_style)
    
    # Detailed emails sheet
    ws_details = wb.add_sheet('Email Details')
    
    # Detailed headers
    detail_headers = [
        'Verification ID', 'Title', 'Email', 'Status', 'Domain', 'Score', 
        'Is Catch-All', 'Is Disposable', 'Is Free Provider', 'Is Role Based', 
        'Is Blacklisted', 'SPF', 'DKIM', 'DMARC', 'Reason'
    ]
    
    for col, header in enumerate(detail_headers):
        ws_details.write(0, col, header, header_style)
    
    # Write detailed email data
    detail_row = 1
    for history in queryset:
        if history.verified_emails:
            import json
            try:
                emails_data = json.loads(history.verified_emails)
                for email_data in emails_data:
                    ws_details.write(detail_row, 0, history.id)
                    ws_details.write(detail_row, 1, history.title)
                    ws_details.write(detail_row, 2, email_data.get('email', ''))
                    ws_details.write(detail_row, 3, email_data.get('status', ''))
                    ws_details.write(detail_row, 4, email_data.get('domain', ''))
                    ws_details.write(detail_row, 5, email_data.get('score', ''))
                    ws_details.write(detail_row, 6, 'Yes' if email_data.get('is_catch_all') else 'No')
                    ws_details.write(detail_row, 7, 'Yes' if email_data.get('is_disposable') else 'No')
                    ws_details.write(detail_row, 8, 'Yes' if email_data.get('is_free_provider') else 'No')
                    ws_details.write(detail_row, 9, 'Yes' if email_data.get('is_role_based') else 'No')
                    ws_details.write(detail_row, 10, 'Yes' if email_data.get('is_blacklisted') else 'No')
                    ws_details.write(detail_row, 11, email_data.get('spf', ''))
                    ws_details.write(detail_row, 12, email_data.get('dkim', ''))
                    ws_details.write(detail_row, 13, email_data.get('dmarc', ''))
                    ws_details.write(detail_row, 14, email_data.get('reason', ''))
                    detail_row += 1
            except (json.JSONDecodeError, TypeError):
                # If JSON parsing fails, skip this record
                continue
    
    # Auto-adjust column widths for both sheets
    for col in range(len(summary_headers)):
        ws_summary.col(col).width = 4000
    
    for col in range(len(detail_headers)):
        ws_details.col(col).width = 4000
    
    wb.save(response)
    return response

export_detailed_to_excel.short_description = "Export selected items with email details to Excel (.xls)"


@admin.register(EmailVerificationHistory)
class EmailVerificationHistoryAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'email_count', 'valid_count', 'invalid_count', 'catchall_count', 'success_rate', 'created_at')
    list_filter = ('status', 'created_at', 'user')
    search_fields = ('user__username', 'title')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)
    actions = ['export_to_excel_action', 'export_detailed_to_excel_action']  # Use string references
    
    def export_to_excel_action(self, request, queryset):
        """Export selected items to Excel"""
        return export_to_excel(self, request, queryset)
    export_to_excel_action.short_description = "Export selected items to Excel (.xls)"
    
    def export_detailed_to_excel_action(self, request, queryset):
        """Export selected items with detailed email data to Excel"""
        return export_detailed_to_excel(self, request, queryset)
    export_detailed_to_excel_action.short_description = "Export selected items with email details to Excel (.xls)"
    
    def get_actions(self, request):
        """Override to ensure actions are properly registered"""
        actions = super().get_actions(request)
        # Debug: Print available actions
        print(f"Available actions: {list(actions.keys())}")
        return actions
    
    def has_export_permission(self, request):
        """Check if user has permission to export"""
        return request.user.is_staff or request.user.is_superuser
    
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'title', 'status')
        }),
        ('Statistics', {
            'fields': ('email_count', 'valid_count', 'invalid_count', 'catchall_count', 'credits_used')
        }),
        ('Data', {
            'fields': ('verified_emails',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
