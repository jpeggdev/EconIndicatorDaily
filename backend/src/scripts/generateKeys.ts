#!/usr/bin/env ts-node

import crypto from 'crypto';

/**
 * Generate secure keys for the application
 */
function generateKeys() {
  // Generate 32-character (16 bytes) encryption key
  const encryptionKey = crypto.randomBytes(16).toString('hex');
  
  // Generate 64-character (32 bytes) JWT secret
  const jwtSecret = crypto.randomBytes(32).toString('hex');
  
  // Generate NextAuth secret (32 bytes)
  const nextAuthSecret = crypto.randomBytes(32).toString('hex');
  
  console.log('🔐 Generated Secure Keys for .env file:');
  console.log('=' .repeat(60));
  console.log();
  
  console.log('# Security Keys - Add these to your .env file');
  console.log(`ENCRYPTION_KEY="${encryptionKey}"`);
  console.log(`JWT_SECRET="${jwtSecret}"`);
  console.log(`NEXTAUTH_SECRET="${nextAuthSecret}"`);
  
  console.log();
  console.log('📝 Key Details:');
  console.log(`ENCRYPTION_KEY: ${encryptionKey.length} characters (${encryptionKey.length/2} bytes)`);
  console.log(`JWT_SECRET: ${jwtSecret.length} characters (${jwtSecret.length/2} bytes)`);
  console.log(`NEXTAUTH_SECRET: ${nextAuthSecret.length} characters (${nextAuthSecret.length/2} bytes)`);
  
  console.log();
  console.log('⚠️  Security Notes:');
  console.log('- These keys provide access to your application');
  console.log('- Store them securely and never commit to version control');
  console.log('- Use different keys for development and production');
  console.log('- Regenerate keys if compromised');
  
  console.log();
  console.log('✅ Keys generated successfully!');
}

// Run the generator
generateKeys();