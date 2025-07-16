#!/usr/bin/env python3
"""
Test script for the Django REST API Email Verifier
"""

import json
import requests
from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

class EmailVerifierAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)

    def test_health_check(self):
        """Test the health check endpoint"""
        url = reverse('verifier:health_check')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'healthy')

    def test_api_root(self):
        """Test the API root endpoint"""
        url = reverse('verifier:api_root')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'ok')

    def test_check_email_valid_input(self):
        """Test email verification with valid input"""
        url = reverse('verifier:check_email_api')
        data = {'email': 'test@gmail.com'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('email', response.data)
        self.assertIn('status', response.data)
        self.assertIn('score', response.data)

    def test_check_email_invalid_input(self):
        """Test email verification with invalid input"""
        url = reverse('verifier:check_email_api')
        data = {'email': 'invalid-email'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_check_email_missing_email(self):
        """Test email verification with missing email"""
        url = reverse('verifier:check_email_api')
        data = {}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unauthenticated_access(self):
        """Test that unauthenticated users cannot access the API"""
        self.client.logout()
        url = reverse('verifier:check_email_api')
        data = {'email': 'test@example.com'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


def test_api_manually():
    """
    Manual test function to test the API endpoints directly
    This can be run separately to test the API when the Django server is running
    """
    base_url = 'http://localhost:8000/verifier/api/'
    
    # Test health check
    print("Testing health check...")
    try:
        response = requests.get(base_url + 'health/')
        print(f"Health check status: {response.status_code}")
        print(f"Health check response: {response.json()}")
    except Exception as e:
        print(f"Health check failed: {e}")
    
    # Test API root
    print("\nTesting API root...")
    try:
        response = requests.get(base_url)
        print(f"API root status: {response.status_code}")
        print(f"API root response: {response.json()}")
    except Exception as e:
        print(f"API root failed: {e}")

    # Test email verification (this will fail without authentication)
    print("\nTesting email verification (without auth)...")
    try:
        response = requests.post(base_url + 'check-email/', 
                               json={'email': 'test@gmail.com'})
        print(f"Email verification status: {response.status_code}")
        if response.status_code == 200:
            print(f"Email verification response: {response.json()}")
        else:
            print(f"Email verification error: {response.text}")
    except Exception as e:
        print(f"Email verification failed: {e}")


if __name__ == '__main__':
    test_api_manually()
