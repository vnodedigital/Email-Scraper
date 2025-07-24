from rest_framework import serializers


class EmailVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    
    def validate_email(self, value):
        """
        Basic email validation
        """
        if not value:
            raise serializers.ValidationError("Email is required")
        return value


class EmailVerificationResponseSerializer(serializers.Serializer):
    email = serializers.EmailField()
    domain = serializers.CharField(allow_blank=True, required=False)
    status = serializers.CharField()
    reason = serializers.CharField(allow_blank=True)
    is_disposable = serializers.BooleanField()
    is_free_provider = serializers.BooleanField()
    is_role_based = serializers.BooleanField()
    is_catch_all = serializers.BooleanField()
    is_blacklisted = serializers.BooleanField()
    score = serializers.FloatField()
    spf = serializers.CharField(allow_null=True, allow_blank=True)
    dmarc = serializers.CharField(allow_null=True, allow_blank=True)
    dkim = serializers.CharField(allow_null=True, allow_blank=True)
    # CRITICAL: Add missing SMTP fields that backend returns
    smtp_valid = serializers.BooleanField(allow_null=True, required=False)
    mx_host = serializers.CharField(allow_null=True, allow_blank=True, required=False)
    port = serializers.IntegerField(allow_null=True, required=False)
    remaining_credits = serializers.IntegerField(required=False)
