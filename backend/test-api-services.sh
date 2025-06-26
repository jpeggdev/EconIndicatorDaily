#!/bin/bash

echo "Running API Services Security Tests..."
echo "======================================"

echo ""
echo "1. Testing Alpha Vantage Service..."
npm test -- --testPathPatterns="alphaVantageService.test.ts" --silent

echo ""
echo "2. Testing FRED Service..."
npm test -- --testPathPatterns="fredService.working.test.ts" --silent

echo ""
echo "3. Testing BLS Service..."
npm test -- --testPathPatterns="blsService.working.test.ts" --silent

echo ""
echo "Running all working API service tests together..."
npm test -- src/services/__tests__/alphaVantageService.test.ts src/services/__tests__/fredService.working.test.ts src/services/__tests__/blsService.working.test.ts --verbose