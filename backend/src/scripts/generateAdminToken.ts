#!/usr/bin/env ts-node

import { JWTUtils } from '../utils/jwt';
import { env } from '../utils/env';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface GenerateTokenOptions {
  email: string;
  userId?: string;
  expiresIn?: string;
}

function generateAdminToken(options: GenerateTokenOptions): string {
  const { email, userId = 'manual-admin', expiresIn = '24h' } = options;

  // Validate admin email
  if (!JWTUtils.isAdminEmail(email)) {
    throw new Error(`Email ${email} is not in the admin list. Check ADMIN_EMAILS in your .env file.`);
  }

  // Generate admin token
  const token = JWTUtils.generateAdminToken({
    userId,
    email,
    role: 'admin',
    adminLevel: JWTUtils.getAdminLevel(email)
  }, expiresIn);

  return token;
}

// CLI Usage
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🔐 Admin Token Generator

Usage:
  npx ts-node src/scripts/generateAdminToken.ts <admin-email> [userId] [expiresIn]

Examples:
  npx ts-node src/scripts/generateAdminToken.ts admin@econindicatordaily.com
  npx ts-node src/scripts/generateAdminToken.ts admin@econindicatordaily.com user123 2h
  
Environment:
  Make sure JWT_SECRET and ADMIN_EMAILS are set in your .env file
  Current admin emails: ${env.ADMIN_EMAILS.join(', ')}
    `);
    process.exit(1);
  }

  try {
    const email = args[0];
    const userId = args[1];
    const expiresIn = args[2];

    const token = generateAdminToken({ email, userId, expiresIn });
    
    console.log('✅ Admin token generated successfully!');
    console.log('\n📋 Token Details:');
    console.log(`Email: ${email}`);
    console.log(`Admin Level: ${JWTUtils.getAdminLevel(email)}`);
    console.log(`Expires In: ${expiresIn || '24h'}`);
    
    console.log('\n🔑 JWT Token:');
    console.log(token);
    
    console.log('\n📝 Usage Example:');
    console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3001/api/admin/stats`);
    
    console.log('\n⚠️  Security Note:');
    console.log('This token provides full admin access. Keep it secure and do not share it.');

  } catch (error) {
    console.error('❌ Error generating token:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Export for programmatic usage
export { generateAdminToken };

// Run CLI if called directly
if (require.main === module) {
  main();
}