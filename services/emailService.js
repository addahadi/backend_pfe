// services/emailService.js
// خدمة البريد الإلكتروني

import nodemailer from 'nodemailer';

// إعدادات محرك البريد
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// ──────────────────────────────────────────────────────────────
// Send Confirmation Email for Plan Switch
// ──────────────────────────────────────────────────────────────
export const sendConfirmationEmail = async (recipientEmail, confirmationToken) => {
  // رابط التأكيد الذي سيرسل للمستخدم
  const confirmationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/confirm-switch?token=${confirmationToken}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: recipientEmail,
    subject: 'تأكيد تغيير الخطة | Plan Switch Confirmation',
    html: `
      <div style="font-family: Arial, sans-serif; direction: rtl; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">تأكيد تغيير الخطة</h2>
        <p>مرحباً،</p>
        <p>لقد طلبت تغيير خطتك. يرجى تأكيد هذا التغيير بالنقر على الزر أدناه.</p>
        
        <div style="margin: 30px 0;">
          <a href="${confirmationLink}" 
             style="display: inline-block; padding: 12px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
            تأكيد تغيير الخطة
          </a>
        </div>

        <p style="color: #666; font-size: 14px;">
          أو انسخ الرابط أدناه في متصفحك:
        </p>
        <p style="background-color: #f0f0f0; padding: 10px; border-radius: 5px; word-break: break-all;">
          ${confirmationLink}
        </p>

        <p style="color: #666; font-size: 12px;">
          <strong>ملاحظة:</strong> هذا الرابط صالح لمدة 15 دقيقة فقط.
        </p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">

        <h3 style="color: #333;">Plan Switch Confirmation</h3>
        <p>Hello,</p>
        <p>You have requested to change your plan. Please confirm this change by clicking the button below.</p>
        
        <div style="margin: 30px 0;">
          <a href="${confirmationLink}" 
             style="display: inline-block; padding: 12px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Confirm Plan Switch
          </a>
        </div>

        <p style="color: #666; font-size: 14px;">
          Or copy the link below in your browser:
        </p>
        <p style="background-color: #f0f0f0; padding: 10px; border-radius: 5px; word-break: break-all;">
          ${confirmationLink}
        </p>

        <p style="color: #666; font-size: 12px;">
          <strong>Note:</strong> This link is valid for 15 minutes only.
        </p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <footer style="color: #999; font-size: 12px; text-align: center;">
          <p>© 2026 - جميع الحقوق محفوظة</p>
        </footer>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[sendConfirmationEmail] Email sent to ${recipientEmail}`);
  } catch (err) {
    console.error('[sendConfirmationEmail] Error:', err.message);
    throw new Error(`Failed to send confirmation email: ${err.message}`);
  }
};

// ──────────────────────────────────────────────────────────────
// Send Generic Email
// ──────────────────────────────────────────────────────────────
export const sendEmail = async (recipientEmail, subject, htmlContent) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: recipientEmail,
    subject,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[sendEmail] Email sent to ${recipientEmail}`);
  } catch (err) {
    console.error('[sendEmail] Error:', err.message);
    throw new Error(`Failed to send email: ${err.message}`);
  }
};
