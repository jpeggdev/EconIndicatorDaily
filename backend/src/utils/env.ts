import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface EnvironmentConfig {
  // Database
  DATABASE_URL: string;
  
  // Core API Keys (Required)
  FRED_API_KEY: string;
  ALPHA_VANTAGE_API_KEY: string;
  BLS_API_KEY: string;
  
  // Optional API Keys
  FINNHUB_API_KEY?: string;
  FMP_API_KEY?: string;
  RAPIDAPI_API_KEY?: string;
  CENSUS_API_KEY?: string;
  TWELVEDATA_API_KEY?: string;
  POLYGON_API_KEY?: string;
  
  // Server Configuration
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';
  
  // CORS
  FRONTEND_URL: string;
  
  // Authentication
  NEXTAUTH_SECRET: string;
  NEXTAUTH_URL: string;
  
  // OAuth
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  
  // Security
  JWT_SECRET: string;
  ENCRYPTION_KEY: string;
  
  // Background Jobs
  ENABLE_BACKGROUND_SYNC: boolean;
  SYNC_INTERVAL_HOURS: number;
  
  // Admin
  ADMIN_EMAILS: string[];
  
  // Logging
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
  
  // Third-party Services
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  REDIS_URL?: string;
  
  // Analytics
  GOOGLE_ANALYTICS_ID?: string;
  MIXPANEL_TOKEN?: string;
  
  // Email
  EMAIL_SERVER_HOST?: string;
  EMAIL_SERVER_PORT?: number;
  EMAIL_SERVER_USER?: string;
  EMAIL_SERVER_PASSWORD?: string;
  EMAIL_FROM?: string;
}

class EnvironmentValidator {
  private errors: string[] = [];
  
  private getRequired(key: string): string {
    const value = process.env[key];
    if (!value) {
      this.errors.push(`Missing required environment variable: ${key}`);
      return '';
    }
    return value;
  }
  
  private getOptional(key: string, defaultValue: string = ''): string {
    return process.env[key] || defaultValue;
  }
  
  private getNumber(key: string, defaultValue: number, required: boolean = false): number {
    const value = process.env[key];
    if (!value) {
      if (required) {
        this.errors.push(`Missing required environment variable: ${key}`);
        return defaultValue;
      }
      return defaultValue;
    }
    
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      this.errors.push(`Invalid number for environment variable ${key}: ${value}`);
      return defaultValue;
    }
    return num;
  }
  
  private getBoolean(key: string, defaultValue: boolean = false): boolean {
    const value = process.env[key];
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true';
  }
  
  private getArray(key: string, delimiter: string = ','): string[] {
    const value = process.env[key];
    if (!value) return [];
    return value.split(delimiter).map(item => item.trim()).filter(Boolean);
  }
  
  validate(): EnvironmentConfig {
    this.errors = [];
    
    const config: EnvironmentConfig = {
      // Database
      DATABASE_URL: this.getRequired('DATABASE_URL'),
      
      // Core API Keys (Required)
      FRED_API_KEY: this.getRequired('FRED_API_KEY'),
      ALPHA_VANTAGE_API_KEY: this.getRequired('ALPHA_VANTAGE_API_KEY'),
      BLS_API_KEY: this.getRequired('BLS_API_KEY'),
      
      // Optional API Keys
      FINNHUB_API_KEY: this.getOptional('FINNHUB_API_KEY') || undefined,
      FMP_API_KEY: this.getOptional('FMP_API_KEY') || undefined,
      RAPIDAPI_API_KEY: this.getOptional('RAPIDAPI_API_KEY') || undefined,
      CENSUS_API_KEY: this.getOptional('CENSUS_API_KEY') || undefined,
      TWELVEDATA_API_KEY: this.getOptional('TWELVEDATA_API_KEY') || undefined,
      POLYGON_API_KEY: this.getOptional('POLYGON_API_KEY') || undefined,
      
      // Server Configuration
      PORT: this.getNumber('PORT', 3001),
      NODE_ENV: (process.env.NODE_ENV as any) || 'development',
      
      // CORS
      FRONTEND_URL: this.getOptional('FRONTEND_URL', 'http://localhost:3000'),
      
      // Authentication
      NEXTAUTH_SECRET: this.getRequired('NEXTAUTH_SECRET'),
      NEXTAUTH_URL: this.getOptional('NEXTAUTH_URL', 'http://localhost:3000'),
      
      // OAuth
      GOOGLE_CLIENT_ID: this.getOptional('GOOGLE_CLIENT_ID') || undefined,
      GOOGLE_CLIENT_SECRET: this.getOptional('GOOGLE_CLIENT_SECRET') || undefined,
      
      // Security
      JWT_SECRET: this.getRequired('JWT_SECRET'),
      ENCRYPTION_KEY: this.getRequired('ENCRYPTION_KEY'),
      
      // Background Jobs
      ENABLE_BACKGROUND_SYNC: this.getBoolean('ENABLE_BACKGROUND_SYNC', true),
      SYNC_INTERVAL_HOURS: this.getNumber('SYNC_INTERVAL_HOURS', 24),
      
      // Admin
      ADMIN_EMAILS: this.getArray('ADMIN_EMAILS'),
      
      // Logging
      LOG_LEVEL: (process.env.LOG_LEVEL as any) || 'info',
      
      // Third-party Services
      STRIPE_SECRET_KEY: this.getOptional('STRIPE_SECRET_KEY') || undefined,
      STRIPE_WEBHOOK_SECRET: this.getOptional('STRIPE_WEBHOOK_SECRET') || undefined,
      REDIS_URL: this.getOptional('REDIS_URL') || undefined,
      
      // Analytics
      GOOGLE_ANALYTICS_ID: this.getOptional('GOOGLE_ANALYTICS_ID') || undefined,
      MIXPANEL_TOKEN: this.getOptional('MIXPANEL_TOKEN') || undefined,
      
      // Email
      EMAIL_SERVER_HOST: this.getOptional('EMAIL_SERVER_HOST') || undefined,
      EMAIL_SERVER_PORT: this.getNumber('EMAIL_SERVER_PORT', 587) || undefined,
      EMAIL_SERVER_USER: this.getOptional('EMAIL_SERVER_USER') || undefined,
      EMAIL_SERVER_PASSWORD: this.getOptional('EMAIL_SERVER_PASSWORD') || undefined,
      EMAIL_FROM: this.getOptional('EMAIL_FROM') || undefined,
    };
    
    // Additional validation
    this.validateConfig(config);
    
    if (this.errors.length > 0) {
      console.error('Environment validation errors:');
      this.errors.forEach(error => console.error(`  - ${error}`));
      
      if (config.NODE_ENV === 'production') {
        throw new Error('Environment validation failed in production');
      } else {
        console.warn('Environment validation failed in development - some features may not work');
      }
    }
    
    return config;
  }
  
  private validateConfig(config: EnvironmentConfig): void {
    // Validate encryption key length
    if (config.ENCRYPTION_KEY && config.ENCRYPTION_KEY.length !== 32) {
      this.errors.push('ENCRYPTION_KEY must be exactly 32 characters long');
    }
    
    // Validate OAuth configuration
    if ((config.GOOGLE_CLIENT_ID && !config.GOOGLE_CLIENT_SECRET) ||
        (!config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET)) {
      this.errors.push('Both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be provided together');
    }
    
    // Validate email configuration
    const emailFields = [
      config.EMAIL_SERVER_HOST,
      config.EMAIL_SERVER_USER,
      config.EMAIL_SERVER_PASSWORD,
      config.EMAIL_FROM
    ];
    const emailFieldsProvided = emailFields.filter(Boolean).length;
    if (emailFieldsProvided > 0 && emailFieldsProvided < 4) {
      this.errors.push('All email configuration fields must be provided together: EMAIL_SERVER_HOST, EMAIL_SERVER_USER, EMAIL_SERVER_PASSWORD, EMAIL_FROM');
    }
    
    // Validate Stripe configuration
    if ((config.STRIPE_SECRET_KEY && !config.STRIPE_WEBHOOK_SECRET) ||
        (!config.STRIPE_SECRET_KEY && config.STRIPE_WEBHOOK_SECRET)) {
      this.errors.push('Both STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET must be provided together');
    }
    
    // Validate admin emails
    if (config.ADMIN_EMAILS.length === 0) {
      console.warn('No admin emails configured - admin features will be disabled');
    }
    
    // Validate URLs
    try {
      new URL(config.FRONTEND_URL);
    } catch {
      this.errors.push(`Invalid FRONTEND_URL: ${config.FRONTEND_URL}`);
    }
    
    try {
      new URL(config.NEXTAUTH_URL);
    } catch {
      this.errors.push(`Invalid NEXTAUTH_URL: ${config.NEXTAUTH_URL}`);
    }
  }
  
  // Helper method to check if specific features are enabled
  static checkFeatureAvailability(config: EnvironmentConfig) {
    return {
      oauth: !!(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET),
      email: !!(config.EMAIL_SERVER_HOST && config.EMAIL_SERVER_USER),
      stripe: !!(config.STRIPE_SECRET_KEY && config.STRIPE_WEBHOOK_SECRET),
      redis: !!config.REDIS_URL,
      analytics: !!(config.GOOGLE_ANALYTICS_ID || config.MIXPANEL_TOKEN),
      finnhub: !!config.FINNHUB_API_KEY,
      fmp: !!config.FMP_API_KEY,
      rapidapi: !!config.RAPIDAPI_API_KEY,
      census: !!config.CENSUS_API_KEY,
      twelvedata: !!config.TWELVEDATA_API_KEY,
      polygon: !!config.POLYGON_API_KEY,
    };
  }
}

// Create singleton instance
const validator = new EnvironmentValidator();
export const env = validator.validate();
export const features = EnvironmentValidator.checkFeatureAvailability(env);

// Export for use in other files
export { EnvironmentValidator };