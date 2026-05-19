from django.urls import path

from .views import LoginView, SignupView, UserListView

urlpatterns = [
    path("signup/", SignupView.as_view(), name="signup"),
    path("login/", LoginView.as_view(), name="login"),
    path("users/", UserListView.as_view(), name="user-list"),
]
