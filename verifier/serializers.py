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
    remaining_credits = serializers.IntegerField(required=False)
