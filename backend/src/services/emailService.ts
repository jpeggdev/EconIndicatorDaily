import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface WeeklyIndicatorData {
  indicator: {
    id: string;
    title: string;
    value: string;
    description: string;
    frequency: string;
    source: string;
    updatedAt: Date;
  };
  change?: {
    value: number;
    percentage: number;
    direction: 'up' | 'down' | 'stable';
  };
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private fromEmail: string;

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@econindicatordaily.com';
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const emailConfig = this.getEmailConfig();
    if (!emailConfig) {
      console.warn('Email service not configured. Email functionality will be disabled.');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport(emailConfig);
      console.log('Email service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize email service:', error);
    }
  }

  private getEmailConfig(): EmailConfig | null {
    const host = process.env.EMAIL_SERVER_HOST;
    const port = process.env.EMAIL_SERVER_PORT;
    const user = process.env.EMAIL_SERVER_USER;
    const pass = process.env.EMAIL_SERVER_PASSWORD;

    if (!host || !port || !user || !pass) {
      return null;
    }

    return {
      host,
      port: parseInt(port),
      secure: parseInt(port) === 465, // true for port 465, false for other ports
      auth: { user, pass }
    };
  }

  /**
   * Get all Pro users who should receive weekly emails
   */
  private async getProUsers() {
    try {
      return await prisma.user.findMany({
        where: {
          subscriptionTier: 'pro',
          emailNotificationsEnabled: true,
          weeklyEmailEnabled: true
        },
        select: {
          id: true,
          email: true,
          name: true
        }
      });
    } catch (error) {
      console.error('Error fetching Pro users:', error);
      return [];
    }
  }

  /**
   * Get weekly economic indicators for email
   */
  private async getWeeklyIndicatorData(): Promise<WeeklyIndicatorData[]> {
    try {
      // Get the most recent indicator data with their indicators
      const indicatorData = await prisma.indicatorData.findMany({
        orderBy: { date: 'desc' },
        take: 10, // Top 10 most recent
        include: {
          indicator: {
            select: {
              id: true,
              name: true,
              description: true,
              frequency: true,
              source: true,
              unit: true
            }
          }
        }
      });

      // Convert to email format
      return indicatorData.map(data => ({
        indicator: {
          id: data.indicator.id,
          title: data.indicator.name,
          value: `${data.value}${data.indicator.unit ? ' ' + data.indicator.unit : ''}`,
          description: data.indicator.description,
          frequency: data.indicator.frequency,
          source: data.indicator.source,
          updatedAt: data.date
        },
        change: this.calculateChange(data) // You could implement historical comparison
      }));
    } catch (error) {
      console.error('Error fetching weekly indicator data:', error);
      return [];
    }
  }

  /**
   * Calculate change from previous period (placeholder implementation)
   */
  private calculateChange(data: any) {
    // This would need historical data comparison
    // For now, return mock data
    const mockChange = Math.random() * 10 - 5; // -5 to +5
    return {
      value: parseFloat(mockChange.toFixed(2)),
      percentage: parseFloat((mockChange / 100).toFixed(2)),
      direction: mockChange > 0 ? 'up' as const : mockChange < 0 ? 'down' as const : 'stable' as const
    };
  }

  /**
   * Generate HTML email template for weekly summary
   */
  private generateWeeklyEmailHTML(userName: string, indicators: WeeklyIndicatorData[]): string {
    const date = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Weekly Economic Indicators Summary</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 28px; }
            .header p { margin: 10px 0 0 0; opacity: 0.9; }
            .indicator-card { background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin-bottom: 20px; border-radius: 5px; }
            .indicator-title { font-weight: bold; font-size: 18px; color: #2c3e50; margin-bottom: 10px; }
            .indicator-value { font-size: 24px; font-weight: bold; color: #667eea; margin-bottom: 10px; }
            .indicator-change { font-size: 14px; margin-bottom: 10px; }
            .change-up { color: #27ae60; }
            .change-down { color: #e74c3c; }
            .change-stable { color: #7f8c8d; }
            .indicator-description { color: #666; font-size: 14px; line-height: 1.5; }
            .indicator-meta { font-size: 12px; color: #999; margin-top: 10px; }
            .footer { text-align: center; margin-top: 40px; padding: 20px; border-top: 1px solid #eee; color: #666; }
            .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>📊 Weekly Economic Summary</h1>
            <p>Your Pro subscription insights for ${date}</p>
        </div>
        
        <p>Hi ${userName},</p>
        
        <p>Here's your weekly summary of the most important economic indicators and market movements:</p>
        
        ${indicators.map(({ indicator, change }) => `
            <div class="indicator-card">
                <div class="indicator-title">${indicator.title}</div>
                <div class="indicator-value">${indicator.value}</div>
                ${change ? `
                    <div class="indicator-change change-${change.direction}">
                        ${change.direction === 'up' ? '▲' : change.direction === 'down' ? '▼' : '◆'} 
                        ${change.value > 0 ? '+' : ''}${change.value} (${change.percentage > 0 ? '+' : ''}${change.percentage}%)
                    </div>
                ` : ''}
                <div class="indicator-description">${indicator.description}</div>
                <div class="indicator-meta">
                    Source: ${indicator.source} • Frequency: ${indicator.frequency} • 
                    Updated: ${indicator.updatedAt.toLocaleDateString()}
                </div>
            </div>
        `).join('')}
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="cta-button">
                View Full Dashboard
            </a>
        </div>
        
        <div class="footer">
            <p><strong>EconIndicatorDaily</strong> - Economic Data in Plain English</p>
            <p>You're receiving this because you're a Pro subscriber with email notifications enabled.</p>
            <p><a href="${process.env.FRONTEND_URL}/settings">Manage your preferences</a></p>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Send weekly summary email to a specific user
   */
  async sendWeeklyEmail(userEmail: string, userName: string, indicators: WeeklyIndicatorData[]) {
    if (!this.transporter) {
      throw new Error('Email service not configured');
    }

    const htmlContent = this.generateWeeklyEmailHTML(userName, indicators);

    const mailOptions = {
      from: this.fromEmail,
      to: userEmail,
      subject: `📊 Your Weekly Economic Summary - ${new Date().toLocaleDateString()}`,
      html: htmlContent,
      text: this.generatePlainTextEmail(userName, indicators) // Fallback plain text
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log(`Weekly email sent successfully to ${userEmail}:`, result.messageId);
      return result;
    } catch (error) {
      console.error(`Failed to send weekly email to ${userEmail}:`, error);
      throw error;
    }
  }

  /**
   * Generate plain text version of email
   */
  private generatePlainTextEmail(userName: string, indicators: WeeklyIndicatorData[]): string {
    const date = new Date().toLocaleDateString();
    
    return `
Weekly Economic Summary - ${date}

Hi ${userName},

Here's your weekly summary of the most important economic indicators:

${indicators.map(({ indicator, change }) => `
${indicator.title}: ${indicator.value}
${change ? `Change: ${change.direction === 'up' ? '+' : change.direction === 'down' ? '-' : ''}${Math.abs(change.value)} (${change.percentage}%)` : ''}
${indicator.description}
Source: ${indicator.source} | Updated: ${indicator.updatedAt.toLocaleDateString()}

`).join('')}

View your full dashboard: ${process.env.FRONTEND_URL || 'http://localhost:3000'}

---
EconIndicatorDaily - Economic Data in Plain English
Manage your preferences: ${process.env.FRONTEND_URL}/settings
    `;
  }

  /**
   * Send weekly emails to all Pro subscribers
   */
  async sendWeeklyEmailsToAllProUsers(): Promise<{ sent: number; failed: number; errors: string[] }> {
    const users = await this.getProUsers();
    const indicators = await this.getWeeklyIndicatorData();
    
    if (indicators.length === 0) {
      console.warn('No indicator data available for weekly email');
      return { sent: 0, failed: 0, errors: ['No indicator data available'] };
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    console.log(`Sending weekly emails to ${users.length} Pro users...`);

    for (const user of users) {
      try {
        await this.sendWeeklyEmail(user.email, user.name || 'Valued Subscriber', indicators);
        sent++;
        
        // Add small delay to avoid overwhelming email service
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        failed++;
        const errorMsg = `Failed to send to ${user.email}: ${error}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    console.log(`Weekly email batch completed: ${sent} sent, ${failed} failed`);
    return { sent, failed, errors };
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('Email configuration test passed');
      return true;
    } catch (error) {
      console.error('Email configuration test failed:', error);
      return false;
    }
  }

  /**
   * Send a test email
   */
  async sendTestEmail(toEmail: string): Promise<boolean> {
    if (!this.transporter) {
      throw new Error('Email service not configured');
    }

    const testHTML = `
      <h2>🧪 EconIndicatorDaily Email Test</h2>
      <p>This is a test email to verify your email configuration is working correctly.</p>
      <p><strong>Sent at:</strong> ${new Date().toISOString()}</p>
      <p>If you receive this email, your weekly economic summaries will be delivered successfully!</p>
    `;

    try {
      const result = await this.transporter.sendMail({
        from: this.fromEmail,
        to: toEmail,
        subject: '🧪 EconIndicatorDaily Email Test',
        html: testHTML,
        text: 'This is a test email from EconIndicatorDaily. If you receive this, your email configuration is working!'
      });

      console.log(`Test email sent successfully to ${toEmail}:`, result.messageId);
      return true;
    } catch (error) {
      console.error(`Failed to send test email to ${toEmail}:`, error);
      return false;
    }
  }
}

export default EmailService;