import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface PasswordResetEmailData {
  email: string;
  name: string;
  resetToken: string;
  resetUrl: string;
}

export interface WelcomeEmailData {
  email: string;
  name: string;
  loginUrl: string;
}

export class EmailService {
  private transporter: Transporter;
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = this.checkConfiguration();
    this.transporter = this.createTransporter();
  }

  private checkConfiguration(): boolean {
    const requiredEnvVars = [
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_USER',
      'SMTP_PASSWORD',
      'SMTP_FROM'
    ];

    return requiredEnvVars.every(varName => process.env[varName]);
  }

  private createTransporter(): Transporter {
    if (!this.isConfigured) {
      // Return a mock transporter for development
      return nodemailer.createTransport({
        host: 'localhost',
        port: 1025,
        secure: false,
        ignoreTLS: true,
      });
    }

    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (!this.isConfigured && process.env.NODE_ENV === 'production') {
        throw new Error('Email service not configured for production');
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@mybudget.com',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.htmlToText(options.html),
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Email sent successfully:', {
          messageId: result.messageId,
          to: options.to,
          subject: options.subject,
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  async sendPasswordReset(data: PasswordResetEmailData): Promise<boolean> {
    const subject = 'Reset Your MyBudget Password';
    const html = this.generatePasswordResetEmail(data);
    
    return this.sendEmail({
      to: data.email,
      subject,
      html,
    });
  }

  async sendWelcome(data: WelcomeEmailData): Promise<boolean> {
    const subject = 'Welcome to MyBudget!';
    const html = this.generateWelcomeEmail(data);
    
    return this.sendEmail({
      to: data.email,
      subject,
      html,
    });
  }

  private generatePasswordResetEmail(data: PasswordResetEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
            <h1 style="color: #2c3e50; margin-bottom: 20px;">Reset Your Password</h1>
            <p>Hello ${data.name},</p>
            <p>We received a request to reset your MyBudget password. Click the button below to create a new password:</p>
            
            <div style="margin: 30px 0;">
              <a href="${data.resetUrl}" 
                 style="background: #3498db; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">
              If you didn't request this password reset, you can safely ignore this email. 
              Your password will remain unchanged.
            </p>
            
            <p style="font-size: 14px; color: #666;">
              This link will expire in 1 hour for security reasons.
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="font-size: 12px; color: #999;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${data.resetUrl}" style="color: #3498db;">${data.resetUrl}</a>
            </p>
          </div>
        </body>
      </html>
    `;
  }

  private generateWelcomeEmail(data: WelcomeEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to MyBudget!</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
            <h1 style="color: #2c3e50; margin-bottom: 20px;">Welcome to MyBudget! 🎉</h1>
            <p>Hello ${data.name},</p>
            <p>Thank you for joining MyBudget! We're excited to help you take control of your finances and build better saving habits.</p>
            
            <div style="margin: 30px 0;">
              <a href="${data.loginUrl}" 
                 style="background: #27ae60; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Get Started
              </a>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left;">
              <h3 style="color: #2c3e50; margin-top: 0;">What you can do with MyBudget:</h3>
              <ul style="padding-left: 20px;">
                <li>📊 Track your spending and income</li>
                <li>🎯 Set and achieve savings goals</li>
                <li>📈 Get personalized financial insights</li>
                <li>💡 Learn money-saving strategies</li>
                <li>🔒 Secure and private financial tracking</li>
              </ul>
            </div>
            
            <p>If you have any questions or need help getting started, don't hesitate to reach out to our support team.</p>
            
            <p>Happy budgeting!<br>
            The MyBudget Team</p>
          </div>
        </body>
      </html>
    `;
  }

  private htmlToText(html: string): string {
    // Simple HTML to text conversion
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  isEmailConfigured(): boolean {
    return this.isConfigured;
  }
}

// Export singleton instance
export const emailService = new EmailService();
