const nodemailer = require('nodemailer');

// Nodemailer configuration - supports Gmail, SMTP, or any email provider
const createTransporter = () => {
  // Check if using Gmail
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // Use App Password for Gmail
      }
    });
  }
  
  // Default to custom SMTP configuration
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const transporter = createTransporter();

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({
      from: `"GreenBull Trading" <${process.env.FROM_EMAIL || process.env.EMAIL_USER || 'noreply@greenbull.com'}>`,
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
                    font-weight: bold;
                    display: inline-block;">
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
                    font-weight: bold;
                    display: inline-block;">
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
  
  transactionNotification: (name, type, amount, status, reason = null) => ({
    subject: `${type.charAt(0).toUpperCase() + type.slice(1)} ${status.charAt(0).toUpperCase() + status.slice(1)} - GreenBull Trading`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #22c55e; margin: 0;">GreenBull Trading</h1>
          </div>
          
          <div style="text-align: center; margin-bottom: 20px;">
            ${status === 'approved' 
              ? '<div style="width: 60px; height: 60px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;"><span style="color: white; font-size: 30px;">✓</span></div>'
              : '<div style="width: 60px; height: 60px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;"><span style="color: white; font-size: 30px;">✕</span></div>'
            }
            <h2 style="color: ${status === 'approved' ? '#22c55e' : '#ef4444'}; margin: 0;">
              ${type.charAt(0).toUpperCase() + type.slice(1)} ${status.charAt(0).toUpperCase() + status.slice(1)}
            </h2>
          </div>
          
          <p style="color: #374151; font-size: 16px;">Hi ${name},</p>
          
          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%;">
              <tr>
                <td style="color: #6b7280; padding: 8px 0;">Transaction Type:</td>
                <td style="color: #111827; font-weight: 600; text-align: right;">${type.charAt(0).toUpperCase() + type.slice(1)}</td>
              </tr>
              <tr>
                <td style="color: #6b7280; padding: 8px 0;">Amount:</td>
                <td style="color: #111827; font-weight: 600; text-align: right;">$${amount.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="color: #6b7280; padding: 8px 0;">Status:</td>
                <td style="text-align: right;">
                  <span style="background-color: ${status === 'approved' ? '#dcfce7' : '#fef2f2'}; color: ${status === 'approved' ? '#166534' : '#dc2626'}; padding: 4px 12px; border-radius: 20px; font-weight: 600; font-size: 14px;">
                    ${status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                </td>
              </tr>
            </table>
          </div>
          
          ${status === 'approved' && type === 'deposit' 
            ? '<p style="color: #374151;">Your funds have been credited to your account. You can now use them to invest or trade.</p>'
            : ''
          }
          ${status === 'approved' && type === 'withdrawal' 
            ? '<p style="color: #374151;">Your withdrawal is being processed and will be sent to your provided wallet address shortly.</p>'
            : ''
          }
          ${status === 'rejected' && reason 
            ? `<div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <p style="color: #dc2626; font-weight: 600; margin: 0 0 5px 0;">Rejection Reason:</p>
                <p style="color: #7f1d1d; margin: 0;">${reason}</p>
              </div>`
            : ''
          }
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://greenb.lovable.app'}/transactions" 
               style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); 
                      color: white; 
                      padding: 14px 30px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      font-weight: bold;
                      display: inline-block;">
              View Transactions
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">If you have any questions, please contact our support team.</p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} GreenBull Trading. All rights reserved.</p>
        </div>
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
  }),
  
  welcomeEmail: (name) => ({
    subject: 'Welcome to GreenBull Trading!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #22c55e;">🎉 Welcome to GreenBull Trading!</h1>
        </div>
        <h2>Hi ${name},</h2>
        <p>Thank you for verifying your email! Your account is now fully activated.</p>
        <p>Here's what you can do next:</p>
        <ul>
          <li>Complete your KYC verification to unlock all features</li>
          <li>Make your first deposit and start investing</li>
          <li>Explore copy trading to follow successful traders</li>
          <li>Invite friends and earn referral bonuses</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" 
             style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); 
                    color: white; 
                    padding: 14px 30px; 
                    text-decoration: none; 
                    border-radius: 8px; 
                    font-weight: bold;
                    display: inline-block;">
            Go to Dashboard
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">© ${new Date().getFullYear()} GreenBull Trading. All rights reserved.</p>
      </div>
    `
  })
};

module.exports = { sendEmail, emailTemplates };
