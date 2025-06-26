#!/bin/bash

echo "=== EconIndicatorDaily Upgrade Test ==="
echo

# Check backend health
echo "1. Testing backend health:"
curl -s http://localhost:3001/health | jq '.'
echo

# Get/create test user
echo "2. Creating/getting test user:"
USER_DATA=$(curl -s -X POST -H "Content-Type: application/json" -d '{"email":"test@example.com","name":"test"}' http://localhost:3001/api/users/findOrCreate)
echo $USER_DATA | jq '.'
USER_ID=$(echo $USER_DATA | jq -r '.data.id')
echo "User ID: $USER_ID"
echo

# Check current subscription status
echo "3. Current subscription status:"
curl -s http://localhost:3001/api/users/subscription/$USER_ID | jq '.data'
echo

# Downgrade to free (if needed)
echo "4. Downgrading to free for testing:"
curl -s -X POST http://localhost:3001/api/users/downgrade/$USER_ID | jq '.data.user | {subscriptionStatus, indicatorAccessCount}'
echo

# Test upgrade
echo "5. Testing upgrade to Pro:"
UPGRADE_RESULT=$(curl -s -X POST -H "Content-Type: application/json" -d '{"stripeData":{"paymentMethodId":"test"}}' http://localhost:3001/api/users/upgrade/$USER_ID)
echo $UPGRADE_RESULT | jq '.'
echo

# Check final subscription status
echo "6. Final subscription status:"
curl -s http://localhost:3001/api/users/subscription/$USER_ID | jq '.data'
echo

echo "=== Test Complete ==="
echo "If all steps succeeded, the backend upgrade functionality is working."
echo "Frontend issue is likely session-related. Try:"
echo "1. Sign out and sign back in at http://localhost:3002"
echo "2. Check browser console for errors"
echo "3. Verify session data at http://localhost:3002/debug"