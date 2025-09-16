import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
	private transporter;

	constructor() {
		this.transporter = nodemailer.createTransport({
			host: process.env.EMAIL_HOST,
			port: parseInt(process.env.EMAIL_PORT, 10),
			secure: true, // true for port 465
			auth: {
				user: process.env.EMAIL_USER,
				pass: process.env.EMAIL_PASS,
			},
		});
	}

	async sendOtp(email: string, otp: string) {
		const htmlTemplate = `
   <!DOCTYPE html>
<html>
<head>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        
        .email-container {
            max-width: 500px;
            width: 100%;
            background: white;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
            margin: 0 auto;
        }
        
        .email-header {
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        
        .email-header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
            letter-spacing: -0.5px;
        }
        
        .email-header p {
            font-size: 16px;
            opacity: 0.9;
            font-weight: 300;
        }
        
        .email-body {
            padding: 40px 30px;
        }
        
        .otp-container {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border: 2px dashed #e2e8f0;
            border-radius: 15px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
        }
        
        .otp-code {
            font-size: 42px;
            font-weight: 700;
            color: #4f46e5;
            letter-spacing: 8px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
            margin: 10px 0;
            font-family: 'Courier New', monospace;
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .otp-label {
            font-size: 14px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 600;
            margin-bottom: 10px;
        }
        
        .info-text {
            text-align: center;
            color: #64748b;
            line-height: 1.6;
            margin-bottom: 25px;
        }
        
        .expiry-warning {
            background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
            border: 1px solid #fcd34d;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            margin: 25px 0;
        }
        
        .expiry-warning h3 {
            color: #d97706;
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        .expiry-warning p {
            color: #92400e;
            font-size: 14px;
            margin: 0;
        }
        
        .security-note {
            background: #f1f5f9;
            border-radius: 12px;
            padding: 20px;
            margin-top: 30px;
        }
        
        .security-note h4 {
            color: #475569;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .security-note ul {
            color: #64748b;
            font-size: 13px;
            line-height: 1.5;
            padding-left: 20px;
        }
        
        .security-note li {
            margin-bottom: 5px;
        }
        
        .email-footer {
            background: #f8fafc;
            padding: 25px 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        
        .email-footer p {
            color: #94a3b8;
            font-size: 12px;
            line-height: 1.4;
        }
        
        .company-name {
            color: #4f46e5;
            font-weight: 600;
        }
        
        @media (max-width: 600px) {
            .email-container {
                margin: 20px;
                border-radius: 15px;
            }
            
            .email-header {
                padding: 30px 20px;
            }
            
            .email-body {
                padding: 30px 20px;
            }
            
            .otp-code {
                font-size: 32px;
                letter-spacing: 6px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <h1>🔒 Security Verification</h1>
            <p>Your One-Time Password for account access</p>
        </div>
        
        <div class="email-body">
            <div class="info-text">
                <p>To complete your verification process, please use the following OTP code:</p>
            </div>
            
            <div class="otp-container">
                <div class="otp-label">Your Verification Code</div>
                <div class="otp-code">${otp}</div>
                <div class="otp-label">Valid for 10 minutes</div>
            </div>
            
            <div class="expiry-warning">
                <h3>⏰ Important Notice</h3>
                <p>This code will expire in 10 minutes for security reasons.</p>
            </div>
            
            <div class="security-note">
                <h4>🛡️ Security Tips</h4>
                <ul>
                    <li>Never share this code with anyone</li>
                    <li>Our team will never ask for your OTP</li>
                    <li>Delete this email after use</li>
                    <li>If you didn't request this, please ignore this email</li>
                </ul>
            </div>
        </div>
        
        <div class="email-footer">
            <p>© 2024 <span class="company-name">El Cady</span>. All rights reserved.<br>
            This is an automated message, please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
  `;

		await this.transporter.sendMail({
			from: process.env.EMAIL_FROM,
			to: email,
			subject: 'Your OTP Code - Security Verification',
			text: `Your OTP is ${otp}. It will expire in 10 minutes.`,
			html: htmlTemplate,
		});
	}
}
