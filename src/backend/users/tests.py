"""
Tests for Users app
Coverage: Models, Serializers, Views, Authentication
"""
import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


@pytest.fixture
def api_client():
    """Return API client"""
    return APIClient()


@pytest.fixture
def user_data():
    """Sample user data"""
    return {
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'TestPass123!',
        'password2': 'TestPass123!'
    }


@pytest.fixture
def create_user():
    """Factory to create users"""
    def _create_user(**kwargs):
        defaults = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'testpass123'
        }
        defaults.update(kwargs)
        password = defaults.pop('password')
        user = User.objects.create(**defaults)
        user.set_password(password)
        user.save()
        return user
    return _create_user


@pytest.fixture
def authenticated_client(api_client, create_user):
    """Return authenticated API client"""
    user = create_user()
    refresh = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    api_client.user = user
    return api_client


@pytest.mark.django_db
class TestUserModel:
    """Test User model"""
    
    def test_create_user(self):
        """Test creating a user"""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        assert user.username == 'testuser'
        assert user.email == 'test@example.com'
        assert user.check_password('testpass123')
        
    def test_create_superuser(self):
        """Test creating a superuser"""
        user = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='adminpass123'
        )
        assert user.is_superuser
        assert user.is_staff


@pytest.mark.django_db
class TestUserRegistration:
    """Test user registration endpoint"""
    
    def test_register_user_success(self, api_client, user_data):
        """Test successful user registration"""
        url = reverse('users:register')
        response = api_client.post(url, user_data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert 'access' in response.data
        assert 'refresh' in response.data
        assert 'user' in response.data
        assert User.objects.filter(username=user_data['username']).exists()
        
    def test_register_password_mismatch(self, api_client, user_data):
        """Test registration with password mismatch"""
        user_data['password2'] = 'DifferentPass123!'
        url = reverse('users:register')
        response = api_client.post(url, user_data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        
    def test_register_duplicate_username(self, api_client, user_data, create_user):
        """Test registration with existing username"""
        create_user(username=user_data['username'])
        url = reverse('users:register')
        response = api_client.post(url, user_data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        
    def test_register_duplicate_email(self, api_client, user_data, create_user):
        """Test registration with existing email"""
        create_user(email=user_data['email'])
        user_data['username'] = 'different_user'
        url = reverse('users:register')
        response = api_client.post(url, user_data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        
    def test_register_missing_fields(self, api_client):
        """Test registration with missing fields"""
        url = reverse('users:register')
        response = api_client.post(url, {}, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestUserLogin:
    """Test user login endpoint"""
    
    def test_login_success(self, api_client, create_user):
        """Test successful login"""
        user = create_user(username='testuser', email='test@example.com')
        url = reverse('users:login')
        response = api_client.post(url, {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'testpass123'
        }, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data
        assert 'user' in response.data
        
    def test_login_wrong_password(self, api_client, create_user):
        """Test login with wrong password"""
        create_user(username='testuser', email='test@example.com')
        url = reverse('users:login')
        response = api_client.post(url, {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'wrongpassword'
        }, format='json')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        
    def test_login_nonexistent_user(self, api_client):
        """Test login with non-existent user"""
        url = reverse('users:login')
        response = api_client.post(url, {
            'username': 'nonexistent',
            'email': 'none@example.com',
            'password': 'testpass123'
        }, format='json')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        
    def test_login_missing_fields(self, api_client):
        """Test login with missing fields"""
        url = reverse('users:login')
        response = api_client.post(url, {}, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestUserProfile:
    """Test user profile endpoint"""
    
    def test_get_profile_authenticated(self, authenticated_client):
        """Test getting profile for authenticated user"""
        url = reverse('users:profile')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'username' in response.data
        assert 'email' in response.data
        
    def test_get_profile_unauthenticated(self, api_client):
        """Test getting profile without authentication"""
        url = reverse('users:profile')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        
    def test_update_profile(self, authenticated_client):
        """Test updating user profile"""
        url = reverse('users:profile')
        response = authenticated_client.patch(url, {
            'username': 'updateduser'
        }, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['username'] == 'updateduser'


@pytest.mark.django_db
class TestTokenRefresh:
    """Test JWT token refresh"""
    
    def test_token_refresh(self, api_client, create_user):
        """Test refreshing access token"""
        user = create_user()
        refresh = RefreshToken.for_user(user)
        
        url = reverse('users:token_refresh')
        response = api_client.post(url, {
            'refresh': str(refresh)
        }, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
