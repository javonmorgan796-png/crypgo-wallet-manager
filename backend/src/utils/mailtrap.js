const nodemailer = require('nodemailer');

// Mailtrap configuration
const transporter = nodemailer.createTransport({
  host: process.env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io',
  port: process.env.MAILTRAP_PORT || 2525,
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS
  }
});

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({
      from: `"GreenBull Trading" <${process.env.FROM_EMAIL || 'noreply@greenbull.com'}>`,
      to,
      subject,
      text,
      html
    });
    
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email error:', error);
    return { success: false, error: error.message };
  }
};

// Email templates
const emailTemplates = {
  verification: (name, verificationUrl) => ({
    subject: 'Verify Your Email - GreenBull Trading',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #22c55e;">GreenBull Trading</h1>
        </div>
        <h2>Welcome, ${name}!</h2>
        <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); 
                    color: white; 
                    padding: 14px 30px; 
                    text-decoration: none; 
                    border-radius: 8px; 
                    font-weight: bold;">
            Verify Email
          </a>
        </div>
        <p style="color: #666;">This link will expire in 24 hours.</p>
        <p style="color: #666;">If you didn't create an account, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">© ${new Date().getFullYear()} GreenBull Trading. All rights reserved.</p>
      </div>
    `
  }),
  
  passwordReset: (name, resetUrl) => ({
    subject: 'Password Reset - GreenBull Trading',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #22c55e;">GreenBull Trading</h1>
        </div>
        <h2>Password Reset Request</h2>
        <p>Hi ${name},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); 
                    color: white; 
                    padding: 14px 30px; 
                    text-decoration: none; 
                    border-radius: 8px; 
                    font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p style="color: #666;">This link will expire in 1 hour.</p>
        <p style="color: #666;">If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">© ${new Date().getFullYear()} GreenBull Trading. All rights reserved.</p>
      </div>
    `
  }),
  
  passwordChanged: (name) => ({
    subject: 'Password Changed - GreenBull Trading',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #22c55e;">GreenBull Trading</h1>
        </div>
        <h2>Password Changed Successfully</h2>
        <p>Hi ${name},</p>
        <p>Your password has been changed successfully.</p>
        <p>If you didn't make this change, please contact our support team immediately.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">© ${new Date().getFullYear()} GreenBull Trading. All rights reserved.</p>
      </div>
    `
  }),
  
  transactionNotification: (name, type, amount, status) => ({
    subject: `${type.charAt(0).toUpperCase() + type.slice(1)} ${status} - GreenBull Trading`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #22c55e;">GreenBull Trading</h1>
        </div>
        <h2>Transaction Update</h2>
        <p>Hi ${name},</p>
        <p>Your ${type} of <strong>$${amount.toLocaleString()}</strong> has been <strong>${status}</strong>.</p>
        <p>Log in to your account to view more details.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">© ${new Date().getFullYear()} GreenBull Trading. All rights reserved.</p>
      </div>
    `
  }),
  
  kycStatusUpdate: (name, status, reason) => ({
    subject: `KYC Verification ${status} - GreenBull Trading`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #22c55e;">GreenBull Trading</h1>
        </div>
        <h2>KYC Verification Update</h2>
        <p>Hi ${name},</p>
        <p>Your KYC verification has been <strong>${status}</strong>.</p>
        ${reason ? `<p>Reason: ${reason}</p>` : ''}
        <p>Log in to your account for more information.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">© ${new Date().getFullYear()} GreenBull Trading. All rights reserved.</p>
      </div>
    `
  })
};

module.exports = { sendEmail, emailTemplates };
