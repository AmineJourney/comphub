from rest_framework import serializers
from .models import Process


class ProcessListSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    responsible_email = serializers.CharField(source='responsible.email', read_only=True)

    class Meta:
        model = Process
        fields = [
            'id', 'reference', 'title', 'process_type', 'version',
            'effective_date', 'status', 'department', 'department_name',
            'responsible', 'responsible_email', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProcessSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    responsible_email = serializers.CharField(source='responsible.email', read_only=True)
    replacement_email = serializers.CharField(source='replacement.email', read_only=True)

    class Meta:
        model = Process
        fields = [
            'id', 'company', 'reference', 'title', 'process_type', 'version',
            'effective_date', 'finality', 'status',
            'department', 'department_name',
            'responsible', 'responsible_email',
            'replacement', 'replacement_email',
            'indicators', 'inputs', 'outputs', 'activities',
            'risks', 'opportunities',
            'required_knowledge', 'critical_resources', 'work_environment',
            'associated_documents', 'approval',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']

    def validate(self, attrs):
        request = self.context.get('request')
        company = getattr(request, 'tenant', None)
        if company:
            attrs['company'] = company

        department = attrs.get('department', getattr(self.instance, 'department', None))
        if department and department.company != attrs.get('company'):
            raise serializers.ValidationError({
                'department': 'Department must belong to your company'
            })

        for user_field in ('responsible', 'replacement'):
            user = attrs.get(user_field, getattr(self.instance, user_field, None))
            if user and company:
                is_member = user.memberships.filter(
                    company=company,
                    is_active=True,
                    is_deleted=False,
                ).exists()
                if not is_member:
                    raise serializers.ValidationError({
                        user_field: 'User must be an active member of your company'
                    })

        return attrs
