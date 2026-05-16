import random
import time
import requests
import json
from datetime import datetime

# Configuration
API_BASE_URL = "http://127.0.0.1:8000"
SENSOR_POST_INTERVAL = 5  # seconds

# Demo credentials (create these first in the API)
EMAIL = "simulator@example.com"
PASSWORD = "simulator123"

# Global state
access_token = None
asset_id = None


def login():
    """Authenticate and get JWT token"""
    global access_token
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/auth/login",
            json={"email": EMAIL, "password": PASSWORD}
        )
        if response.status_code == 200:
            access_token = response.json()["access_token"]
            print(f"✓ Login successful")
            return True
        else:
            print(f"✗ Login failed: {response.text}")
            return False
    except Exception as e:
        print(f"✗ Connection error: {e}")
        return False


def get_assets():
    """Get list of assets"""
    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        response = requests.get(
            f"{API_BASE_URL}/assets",
            headers=headers
        )
        if response.status_code == 200:
            assets = response.json()
            if assets:
                print(f"✓ Found {len(assets)} asset(s)")
                return assets[0]["id"]
            else:
                print("✗ No assets found. Create one first.")
                return None
        else:
            print(f"✗ Failed to get assets: {response.text}")
            return None
    except Exception as e:
        print(f"✗ Connection error: {e}")
        return None


def generate_normal_sensor_data():
    """Generate normal operating sensor values"""
    return {
        "vibration": random.uniform(1.0, 3.5),      # mm/s - normal range
        "temperature": random.uniform(40, 65),      # Celsius - normal
        "pressure": random.uniform(3.5, 4.2),       # bar - normal
        "runtime_hours": random.uniform(5000, 10000),
        "rpm": random.uniform(1400, 1600)
    }


def generate_failure_mode_data():
    """Generate values indicating potential failure"""
    return {
        "vibration": random.uniform(8.0, 15.0),     # mm/s - HIGH
        "temperature": random.uniform(75, 95),      # Celsius - VERY HOT
        "pressure": random.uniform(5.5, 7.0),       # bar - HIGH
        "runtime_hours": random.uniform(5000, 10000),
        "rpm": random.uniform(1400, 1600)
    }


def post_sensor_reading(asset_id, data):
    """Send sensor reading to API"""
    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        payload = {
            "asset_id": asset_id,
            **data
        }
        
        response = requests.post(
            f"{API_BASE_URL}/sensors/data",
            json=payload,
            headers=headers
        )
        
        if response.status_code == 201:
            return True
        else:
            print(f"  ✗ Failed to post: {response.text}")
            return False
    except Exception as e:
        print(f"  ✗ Connection error: {e}")
        return False


def run_simulator(failure_mode=False, duration=None):
    """Run sensor simulator"""
    global access_token, asset_id
    
    print("=" * 60)
    print("Predictive Maintenance - Sensor Simulator")
    print("=" * 60)
    
    # Login
    print("\n1. Authenticating...")
    if not login():
        return
    
    # Get first asset
    print("2. Fetching assets...")
    asset_id = get_assets()
    if not asset_id:
        return
    
    print(f"3. Starting sensor stream (Asset: {asset_id})")
    print(f"   Mode: {'FAILURE' if failure_mode else 'NORMAL'}")
    print(f"   Interval: {SENSOR_POST_INTERVAL}s")
    print("\nPress Ctrl+C to stop\n")
    
    try:
        iteration = 0
        while True:
            iteration += 1
            
            # Check duration if specified
            if duration and iteration * SENSOR_POST_INTERVAL > duration:
                print(f"\nSimulation completed ({duration}s)")
                break
            
            # Generate data
            if failure_mode and random.random() < 0.3:  # 30% chance of failure indicators
                data = generate_failure_mode_data()
                mode = "FAILURE"
            else:
                data = generate_normal_sensor_data()
                mode = "NORMAL"
            
            # Post to API
            timestamp = datetime.now().strftime("%H:%M:%S")
            if post_sensor_reading(asset_id, data):
                print(f"[{timestamp}] ✓ {mode:7s} - V:{data['vibration']:5.1f} T:{data['temperature']:5.1f}°C P:{data['pressure']:5.1f}bar")
            
            time.sleep(SENSOR_POST_INTERVAL)
            
    except KeyboardInterrupt:
        print("\n\nSimulation stopped.")


if __name__ == "__main__":
    import sys
    
    # Parse arguments
    failure_mode = "--failure" in sys.argv
    
    run_simulator(failure_mode=failure_mode)
