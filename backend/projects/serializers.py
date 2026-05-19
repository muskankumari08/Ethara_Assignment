from rest_framework import serializers

from accounts.models import User
from accounts.serializers import UserSummarySerializer

from .models import Project, Task


class TaskSerializer(serializers.ModelSerializer):
    assigned_to_detail = UserSummarySerializer(source="assigned_to", read_only=True)

    class Meta:
        model = Task
        fields = (
            "id",
            "title",
            "description",
            "status",
            "due_date",
            "assigned_to",
            "assigned_to_detail",
            "project",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("created_at", "updated_at")

    def validate(self, attrs):
        project = attrs.get("project") or getattr(self.instance, "project", None)
        assigned_to = attrs.get("assigned_to", getattr(self.instance, "assigned_to", None))
        if assigned_to and project and not project.team_members.filter(pk=assigned_to.pk).exists():
            raise serializers.ValidationError(
                {"assigned_to": "Assigned user must be a team member of this project."}
            )
        return attrs


class TaskMemberStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ("status",)

    def validate_status(self, value):
        if value not in dict(Task.Status.choices):
            raise serializers.ValidationError("Invalid status.")
        return value


class ProjectSerializer(serializers.ModelSerializer):
    team_members_detail = UserSummarySerializer(source="team_members", many=True, read_only=True)
    team_ids = serializers.PrimaryKeyRelatedField(source="team_members", many=True, read_only=True)
    team_member_ids = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        many=True,
        write_only=True,
        required=False,
        source="team_members",
    )
    created_by_detail = UserSummarySerializer(source="created_by", read_only=True)

    class Meta:
        model = Project
        fields = (
            "id",
            "name",
            "description",
            "created_by",
            "created_by_detail",
            "created_at",
            "team_members_detail",
            "team_ids",
            "team_member_ids",
        )
        read_only_fields = ("created_by", "created_at")

    def create(self, validated_data):
        members = validated_data.pop("team_members", [])
        user = self.context["request"].user
        project = Project.objects.create(created_by=user, **validated_data)
        ids = {m.pk for m in members} | {user.pk}
        project.team_members.set(User.objects.filter(pk__in=ids))
        return project

    def update(self, instance, validated_data):
        members = validated_data.pop("team_members", None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if members is not None:
            ids = {m.pk for m in members} | {instance.created_by_id}
            instance.team_members.set(User.objects.filter(pk__in=ids))
        return instance


class ProjectListSerializer(serializers.ModelSerializer):
    team_members_detail = UserSummarySerializer(source="team_members", many=True, read_only=True)
    created_by_detail = UserSummarySerializer(source="created_by", read_only=True)
    task_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Project
        fields = (
            "id",
            "name",
            "description",
            "created_at",
            "created_by_detail",
            "team_members_detail",
            "task_count",
        )
