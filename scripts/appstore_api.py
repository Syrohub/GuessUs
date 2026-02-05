#!/usr/bin/env python3
"""
App Store Connect API Client
Uses JWT authentication with the API key
"""

import json
import time
import jwt
import requests
from pathlib import Path

SECRETS_DIR = Path(__file__).parent.parent / "secrets"
API_BASE = "https://api.appstoreconnect.apple.com/v1"

def load_config():
    """Load API configuration"""
    config_file = SECRETS_DIR / "api_config.json"
    with open(config_file) as f:
        return json.load(f)

def load_private_key(key_file):
    """Load the private key"""
    key_path = SECRETS_DIR / key_file
    with open(key_path) as f:
        return f.read()

def generate_token(issuer_id, key_id, private_key):
    """Generate JWT token for App Store Connect API"""
    # Token expires in 20 minutes (max allowed)
    expiration = int(time.time()) + 20 * 60
    
    payload = {
        "iss": issuer_id,
        "iat": int(time.time()),
        "exp": expiration,
        "aud": "appstoreconnect-v1"
    }
    
    headers = {
        "alg": "ES256",
        "kid": key_id,
        "typ": "JWT"
    }
    
    token = jwt.encode(
        payload,
        private_key,
        algorithm="ES256",
        headers=headers
    )
    
    return token

def get_headers():
    """Get authorization headers"""
    config = load_config()
    private_key = load_private_key(config["key_file"])
    token = generate_token(config["issuer_id"], config["key_id"], private_key)
    
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def api_get(endpoint):
    """Make GET request to API"""
    url = f"{API_BASE}/{endpoint}"
    headers = get_headers()
    response = requests.get(url, headers=headers)
    return response

def list_apps():
    """List all apps"""
    response = api_get("apps")
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error {response.status_code}: {response.text}")
        return None

def list_bundle_ids():
    """List all registered bundle IDs"""
    response = api_get("bundleIds")
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error {response.status_code}: {response.text}")
        return None

def get_app_info(app_id):
    """Get detailed app info"""
    response = api_get(f"apps/{app_id}")
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error {response.status_code}: {response.text}")
        return None

def list_in_app_purchases(app_id):
    """List in-app purchases for an app"""
    response = api_get(f"apps/{app_id}/inAppPurchasesV2")
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error {response.status_code}: {response.text}")
        return None

if __name__ == "__main__":
    print("🔗 Testing App Store Connect API connection...")
    print("=" * 50)
    
    # Test: List apps
    print("\n📱 Fetching apps...")
    apps_data = list_apps()
    
    if apps_data and "data" in apps_data:
        apps = apps_data["data"]
        print(f"✅ Found {len(apps)} app(s):\n")
        
        for app in apps:
            attrs = app["attributes"]
            print(f"  📦 {attrs.get('name', 'N/A')}")
            print(f"     Bundle ID: {attrs.get('bundleId', 'N/A')}")
            print(f"     SKU: {attrs.get('sku', 'N/A')}")
            print(f"     App ID: {app['id']}")
            print()
            
            # Check for IAP
            print(f"     💰 Checking In-App Purchases...")
            iap_data = list_in_app_purchases(app['id'])
            if iap_data and "data" in iap_data:
                iaps = iap_data["data"]
                if iaps:
                    print(f"     Found {len(iaps)} IAP(s):")
                    for iap in iaps:
                        iap_attrs = iap["attributes"]
                        print(f"       - {iap_attrs.get('name', 'N/A')} ({iap_attrs.get('productId', 'N/A')})")
                        print(f"         State: {iap_attrs.get('state', 'N/A')}")
                else:
                    print("     No IAPs found")
            print()
    else:
        print("❌ No apps found or error occurred")
        if apps_data:
            print(f"Response: {json.dumps(apps_data, indent=2)[:500]}")
