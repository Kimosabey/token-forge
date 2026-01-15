import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { RedisService } from '../redis/redis.service';
import * as crypto from 'crypto';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    // Initialize email transporter (use mailtrap for dev, real SMTP for production)
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST', 'smtp.mailtrap.io'),
      port: this.configService.get('SMTP_PORT', 2525),
      auth: {
        user: this.configService.get('SMTP_USER', ''),
        pass: this.configService.get('SMTP_PASS', ''),
      },
    });
  }

  /**
   * Generate and send email verification token
   */
  async sendVerificationEmail(userId: string, email: string, username: string): Promise<void> {
    const token = crypto.randomBytes(32).toString('hex');
    const verificationUrl = `${this.configService.get('BASE_URL', 'http://localhost:3000')}/api/email/verify?token=${token}`;

    // Store token in Redis (valid for 24 hours)
    await this.redisService.set(`email:verify:${token}`, userId, 86400);

    try {
      await this.transporter.sendMail({
        from: '"TokenForge" <noreply@tokenforge.com>',
        to: email,
        subject: 'Verify Your Email - TokenForge',
        html: this.getVerificationEmailTemplate(username, verificationUrl),
      });

      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email: ${error.message}`);
      // In development, log the verification URL
      if (this.configService.get('NODE_ENV') === 'development') {
        this.logger.warn(`DEVELOPMENT: Verification URL: ${verificationUrl}`);
      }
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, username: string): Promise<void> {
    const token = crypto.randomBytes(32).toString('hex');
    const resetUrl = `${this.configService.get('BASE_URL', 'http://localhost:3000')}/api/email/reset-password?token=${token}`;

    // Store token in Redis (valid for 1 hour)
    await this.redisService.set(`password:reset:${token}`, email, 3600);

    try {
      await this.transporter.sendMail({
        from: '"TokenForge" <noreply@tokenforge.com>',
        to: email,
        subject: 'Password Reset Request - TokenForge',
        html: this.getPasswordResetTemplate(username, resetUrl),
      });

      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email: ${error.message}`);
      if (this.configService.get('NODE_ENV') === 'development') {
        this.logger.warn(`DEVELOPMENT: Reset URL: ${resetUrl}`);
      }
    }
  }

  /**
   * Verify email token
   */
  async verifyEmailToken(token: string): Promise<string | null> {
    const userId = await this.redisService.get<string>(`email:verify:${token}`);
    if (userId) {
      await this.redisService.del(`email:verify:${token}`);
    }
    return userId;
  }

  /**
   * Verify password reset token
   */
  async verifyResetToken(token: string): Promise<string | null> {
    return this.redisService.get<string>(`password:reset:${token}`);
  }

  /**
   * Delete password reset token
   */
  async deleteResetToken(token: string): Promise<void> {
    await this.redisService.del(`password:reset:${token}`);
  }

  private getVerificationEmailTemplate(username: string, verificationUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 5px; }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Welcome to TokenForge, ${username}!</h2>
            <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
            <p>
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p>${verificationUrl}</p>
            <p class="footer">
              This link will expire in 24 hours.<br>
              If you didn't create this account, you can safely ignore this email.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  private getPasswordResetTemplate(username: string, resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { display: inline-block; padding: 12px 24px; background: #DC2626; color: white; text-decoration: none; border-radius: 5px; }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Password Reset Request</h2>
            <p>Hello ${username},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <p>
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p>${resetUrl}</p>
            <p class="footer">
              This link will expire in 1 hour.<br>
              If you didn't request a password reset, please ignore this email or contact support if you have concerns.
            </p>
          </div>
        </body>
      </html>
    `;
  }
}
