from django.db.models import Count
from rest_framework import generics
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import User

from .models import Project, Task
from accounts.permissions import IsAdminRole
from .serializers import (
    ProjectListSerializer,
    ProjectSerializer,
    TaskMemberStatusSerializer,
    TaskSerializer,
)


class ProjectListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), IsAdminRole()]
        return super().get_permissions()

    def get_serializer_class(self):
        if self.request.method == "GET":
            return ProjectListSerializer
        return ProjectSerializer

    def get_queryset(self):
        qs = Project.objects.annotate(task_count=Count("tasks")).select_related("created_by").prefetch_related(
            "team_members"
        )
        user = self.request.user
        if getattr(user, "role", None) == User.Role.ADMIN:
            return qs
        return qs.filter(team_members=user).distinct()


class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Project.objects.prefetch_related("team_members").select_related("created_by")

    def get_permissions(self):
        if self.request.method in ("PUT", "DELETE"):
            return [IsAuthenticated(), IsAdminRole()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        return ProjectSerializer

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        if getattr(user, "role", None) == User.Role.ADMIN:
            return qs
        return qs.filter(team_members=user)


class TaskListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), IsAdminRole()]
        return super().get_permissions()

    def get_serializer_class(self):
        return TaskSerializer

    def get_queryset(self):
        qs = Task.objects.select_related("project", "assigned_to")
        user = self.request.user
        project_id = self.request.query_params.get("project")
        if getattr(user, "role", None) == User.Role.ADMIN:
            if project_id:
                qs = qs.filter(project_id=project_id)
            return qs
        qs = qs.filter(assigned_to=user)
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs


class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Task.objects.select_related("project", "assigned_to")

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH") and getattr(self.request.user, "role", None) != User.Role.ADMIN:
            return TaskMemberStatusSerializer
        return TaskSerializer

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        if getattr(user, "role", None) == User.Role.ADMIN:
            return qs
        return qs.filter(assigned_to=user)

    def destroy(self, request, *args, **kwargs):
        if getattr(request.user, "role", None) != User.Role.ADMIN:
            raise PermissionDenied("Only admins can delete tasks.")
        return super().destroy(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        user = request.user
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        if getattr(user, "role", None) != User.Role.ADMIN:
            serializer = TaskMemberStatusSerializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return Response(TaskSerializer(instance, context={"request": request}).data)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def put(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)
