# companies/email.py

from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings


class CompanyEmailService:
    """Service to handle all email communications for companies"""

    @staticmethod
    def send_admin_credentials(personal_email, company_name, admin_email, temp_password, token):
        """
        Send admin login credentials to personal email
        
        Args:
            personal_email: Admin's personal email (Gmail, etc.)
            company_name: Company name
            admin_email: Admin company email (admin@COMPANY_CODE.com)
            temp_password: Temporary password
            token: Registration token for verification
        
        Returns:
            bool: True if email sent, False if failed
        """
        
        try:
            subject = f'WorkOS Admin Account Created - {company_name}'
            
            # Email body
            html_message = f"""
            <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 8px;">
                        
                        <!-- Header -->
                        <div style="background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0;">Welcome to WorkOS</h1>
                        </div>
                        
                        <!-- Content -->
                        <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px;">
                            <p>Hello,</p>
                            
                            <p>Your admin account for <strong>{company_name}</strong> has been created!</p>
                            
                            <h3 style="color: #2196F3; margin-top: 30px;">Login Credentials</h3>
                            
                            <div style="background-color: #f0f0f0; padding: 15px; border-left: 4px solid #2196F3; margin: 20px 0;">
                                <p><strong>Email:</strong> <code style="background: #e0e0e0; padding: 5px 10px; border-radius: 4px;">{admin_email}</code></p>
                                <p><strong>Temporary Password:</strong> <code style="background: #e0e0e0; padding: 5px 10px; border-radius: 4px;">{temp_password}</code></p>
                            </div>
                            
                            <p style="color: #ff6b6b; font-weight: bold;">⚠️ Important:</p>
                            <ul>
                                <li>This temporary password is valid for <strong>72 hours</strong></li>
                                <li>You must change it on first login</li>
                                <li>Keep this email safe and secure</li>
                                <li>Never share your password</li>
                            </ul>
                            
                            <h3 style="color: #2196F3; margin-top: 30px;">Next Steps</h3>
                            <ol>
                                <li>Go to: <strong>https://workos.app/login</strong></li>
                                <li>Enter email: <strong>{admin_email}</strong></li>
                                <li>Enter password: <strong>{temp_password}</strong></li>
                                <li>Click "Login"</li>
                                <li>Create your new permanent password</li>
                            </ol>
                            
                            <div style="background-color: #f0f0f0; padding: 15px; border-radius: 4px; margin: 20px 0; text-align: center;">
                                <a href="https://workos.app/login" style="background-color: #2196F3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block;">Login to WorkOS</a>
                            </div>
                            
                            <p style="color: #666; font-size: 13px; margin-top: 30px;">
                                If you didn't request this account or have any questions, please contact our support team.
                            </p>
                        </div>
                        
                        <!-- Footer -->
                        <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; margin-top: 20px; border-radius: 0 0 8px 8px;">
                            <p>© 2024 WorkOS. All rights reserved.</p>
                            <p>This is an automated email. Please do not reply.</p>
                        </div>
                    </div>
                </body>
            </html>
            """
            
            # Plain text version for email clients that don't support HTML
            plain_message = f"""
Welcome to WorkOS!

Your admin account for {company_name} has been created.

LOGIN CREDENTIALS:
Email: {admin_email}
Temporary Password: {temp_password}

IMPORTANT:
- This temporary password is valid for 72 hours
- You must change it on first login
- Keep this email safe and secure

NEXT STEPS:
1. Go to: https://workos.app/login
2. Enter email: {admin_email}
3. Enter password: {temp_password}
4. Click "Login"
5. Create your new permanent password

If you didn't request this account, please contact support.

© 2024 WorkOS
            """
            
            # Send email
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[personal_email],
                html_message=html_message,
                fail_silently=False,
            )
            
            print(f"✅ Email sent successfully to {personal_email}")
            return True
            
        except Exception as e:
            print(f"❌ Error sending email: {str(e)}")
            return False

    @staticmethod
    def send_password_reset_email(personal_email, company_name, reset_link):
        """
        Send password reset email
        (You can use this later)
        """
        try:
            subject = f'Reset Your WorkOS Password - {company_name}'
            
            html_message = f"""
            <html>
                <body>
                    <h2>Reset Your Password</h2>
                    <p>Click the link below to reset your WorkOS password:</p>
                    <a href="{reset_link}">Reset Password</a>
                    <p>This link expires in 1 hour.</p>
                </body>
            </html>
            """
            
            send_mail(
                subject=subject,
                message='Click the link to reset password',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[personal_email],
                html_message=html_message,
                fail_silently=False,
            )
            
            return True
            
        except Exception as e:
            print(f"❌ Error sending password reset email: {str(e)}")
            return False

    @staticmethod
    def send_employee_invitation(personal_email, company_name, invite_link):
        """
        Send employee invitation email
        (You can use this later)
        """
        try:
            subject = f'You are invited to {company_name} on WorkOS'
            
            html_message = f"""
            <html>
                <body>
                    <h2>Welcome to {company_name}!</h2>
                    <p>You have been invited to join {company_name} on WorkOS.</p>
                    <a href="{invite_link}">Accept Invitation</a>
                    <p>This invitation expires in 7 days.</p>
                </body>
            </html>
            """
            
            send_mail(
                subject=subject,
                message='You are invited to join the company',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[personal_email],
                html_message=html_message,
                fail_silently=False,
            )
            
            return True
            
        except Exception as e:
            print(f"❌ Error sending invitation email: {str(e)}")
            return False
