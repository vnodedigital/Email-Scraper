from django.core.management.base import BaseCommand
from verifier.models import EmailVerificationHistory

class Command(BaseCommand):
    help = 'Fix email verification counts by recalculating from stored results'

    def handle(self, *args, **options):
        histories = EmailVerificationHistory.objects.all()
        
        for history in histories:
            self.stdout.write(f"Processing history ID: {history.id}")
            
            # Get the results from JSON data
            results = history.verified_emails.get('results', [])
            
            valid_count = 0
            catchall_count = 0
            invalid_count = 0
            
            self.stdout.write(f"Found {len(results)} results")
            
            for result in results:
                # Apply catch-all priority logic: if is_catch_all is True OR status is 'catch-all', count as catch-all
                is_catch_all = result.get('is_catch_all', False)
                status = result.get('status', 'invalid').lower().strip()
                email = result.get('email', 'unknown')
                
                self.stdout.write(f"  {email}: status='{status}', is_catch_all={is_catch_all}")
                
                # Apply priority: Catch-all > Valid > Invalid
                if is_catch_all or status == 'catch-all':
                    catchall_count += 1
                elif status == 'valid':
                    valid_count += 1
                else:
                    invalid_count += 1
            
            # Update the history record
            old_valid = history.valid_count
            old_catchall = history.catchall_count
            old_invalid = history.invalid_count
            
            history.valid_count = valid_count
            history.catchall_count = catchall_count
            history.invalid_count = invalid_count
            history.save()
            
            self.stdout.write(
                f"Updated history {history.id}: "
                f"Valid {old_valid}->{valid_count}, "
                f"Catch-all {old_catchall}->{catchall_count}, "
                f"Invalid {old_invalid}->{invalid_count}"
            )
        
        self.stdout.write(
            self.style.SUCCESS('Successfully fixed email verification counts')
        )
