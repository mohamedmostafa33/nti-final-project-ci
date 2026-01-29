"""
Tests for Communities app
Coverage: Models, Serializers, Views, Permissions
"""
import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from communities.models import Community, CommunityMember

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def create_user():
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
    user = create_user()
    refresh = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    api_client.user = user
    return api_client


@pytest.fixture
def create_community(create_user):
    def _create_community(**kwargs):
        if 'creator' not in kwargs:
            kwargs['creator'] = create_user()
        defaults = {
            'id': 'testcommunity',
            'privacy_type': 'public'
        }
        defaults.update(kwargs)
        return Community.objects.create(**defaults)
    return _create_community


@pytest.mark.django_db
class TestCommunityModel:
    """Test Community model"""
    
    def test_create_community(self, create_user):
        """Test creating a community"""
        user = create_user()
        community = Community.objects.create(
            id='testcomm',
            creator=user,
            privacy_type='public'
        )
        
        assert community.id == 'testcomm'
        assert community.creator == user
        assert community.privacy_type == 'public'
        assert community.number_of_members == 0
        
    def test_get_image_url_with_no_image(self, create_community):
        """Test get_image_url with no image"""
        community = create_community()
        assert community.get_image_url() == ''
        
    def test_get_image_url_with_image_url(self, create_community):
        """Test get_image_url with base64 image_url"""
        community = create_community(image_url='data:image/png;base64,test')
        assert 'data:image' in community.get_image_url()


@pytest.mark.django_db
class TestCommunityMemberModel:
    """Test CommunityMember model"""
    
    def test_create_member(self, create_user, create_community):
        """Test creating a community member"""
        user = create_user()
        community = create_community()
        
        member = CommunityMember.objects.create(
            user=user,
            community=community,
            is_moderator=False
        )
        
        assert member.user == user
        assert member.community == community
        assert not member.is_moderator
        
    def test_unique_member_constraint(self, create_user, create_community):
        """Test unique constraint on user-community"""
        user = create_user()
        community = create_community()
        
        CommunityMember.objects.create(user=user, community=community)
        
        with pytest.raises(Exception):
            CommunityMember.objects.create(user=user, community=community)


@pytest.mark.django_db
class TestCommunityList:
    """Test community list endpoint"""
    
    def test_list_communities(self, api_client, create_community):
        """Test listing communities"""
        create_community(id='comm1')
        create_community(id='comm2')
        
        url = reverse('communities:community-list')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2
        
    def test_list_communities_includes_communityId(self, api_client, create_community):
        """Test that community list includes communityId field"""
        create_community(id='testcomm')
        
        url = reverse('communities:community-list')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'communityId' in response.data[0]
        assert 'id' in response.data[0]
        assert response.data[0]['communityId'] == response.data[0]['id']


@pytest.mark.django_db
class TestCommunityCreate:
    """Test community creation endpoint"""
    
    def test_create_community_authenticated(self, authenticated_client):
        """Test creating community as authenticated user"""
        url = reverse('communities:community-list')
        data = {
            'id': 'newcommunity',
            'privacyType': 'public'
        }
        response = authenticated_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert Community.objects.filter(id='newcommunity').exists()
        
    def test_create_community_unauthenticated(self, api_client):
        """Test creating community without authentication"""
        url = reverse('communities:community-list')
        data = {
            'id': 'newcommunity',
            'privacyType': 'public'
        }
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        
    def test_create_community_duplicate_id(self, authenticated_client, create_community):
        """Test creating community with duplicate ID"""
        create_community(id='existingcomm')
        
        url = reverse('communities:community-list')
        data = {
            'id': 'existingcomm',
            'privacyType': 'public'
        }
        response = authenticated_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestCommunityDetail:
    """Test community detail endpoint"""
    
    def test_get_community_detail(self, api_client, create_community):
        """Test getting community details"""
        community = create_community(id='testcomm')
        
        url = reverse('communities:community-detail', kwargs={'pk': 'testcomm'})
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == 'testcomm'
        
    def test_get_nonexistent_community(self, api_client):
        """Test getting non-existent community"""
        url = reverse('communities:community-detail', kwargs={'pk': 'nonexistent'})
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
        
    def test_update_community_as_creator(self, authenticated_client, create_community):
        """Test updating community as creator"""
        community = create_community(
            id='testcomm',
            creator=authenticated_client.user
        )
        
        url = reverse('communities:community-detail', kwargs={'pk': 'testcomm'})
        response = authenticated_client.patch(url, {
            'privacyType': 'private'
        }, format='json')
        
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestCommunityJoinLeave:
    """Test join/leave community endpoints"""
    
    def test_join_community(self, authenticated_client, create_community):
        """Test joining a community"""
        community = create_community(id='testcomm')
        
        url = reverse('communities:community-join', kwargs={'pk': 'testcomm'})
        response = authenticated_client.post(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert CommunityMember.objects.filter(
            user=authenticated_client.user,
            community=community
        ).exists()
        
    def test_join_community_unauthenticated(self, api_client, create_community):
        """Test joining community without authentication"""
        create_community(id='testcomm')
        
        url = reverse('communities:community-join', kwargs={'pk': 'testcomm'})
        response = api_client.post(url)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        
    def test_join_already_joined_community(self, authenticated_client, create_community):
        """Test joining a community already joined"""
        community = create_community(id='testcomm')
        CommunityMember.objects.create(
            user=authenticated_client.user,
            community=community
        )
        
        url = reverse('communities:community-join', kwargs={'pk': 'testcomm'})
        response = authenticated_client.post(url)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        
    def test_leave_community(self, authenticated_client, create_community):
        """Test leaving a community"""
        community = create_community(id='testcomm')
        CommunityMember.objects.create(
            user=authenticated_client.user,
            community=community
        )
        
        url = reverse('communities:community-leave', kwargs={'pk': 'testcomm'})
        response = authenticated_client.post(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert not CommunityMember.objects.filter(
            user=authenticated_client.user,
            community=community
        ).exists()
        
    def test_leave_not_joined_community(self, authenticated_client, create_community):
        """Test leaving a community not joined"""
        create_community(id='testcomm')
        
        url = reverse('communities:community-leave', kwargs={'pk': 'testcomm'})
        response = authenticated_client.post(url)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestCommunityMembers:
    """Test community members functionality"""
    
    def test_member_count_updates_on_join(self, authenticated_client, create_community):
        """Test that member count updates when joining"""
        community = create_community(id='testcomm')
        initial_count = community.number_of_members
        
        url = reverse('communities:community-join', kwargs={'pk': 'testcomm'})
        authenticated_client.post(url)
        
        community.refresh_from_db()
        assert community.number_of_members == initial_count + 1
