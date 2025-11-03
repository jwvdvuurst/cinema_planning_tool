# Password Management System

This document describes the password management system implemented for the Film Theater Planner.

## Overview

The system has been updated to support password-based authentication for users. This replaces the previous demo mode authentication system and provides proper security for production use.

## Features

### 1. Automatic Password Generation for New Users

When an administrator creates a new volunteer user, the system automatically:
- Generates a secure random 12-character password
- Hashes the password using bcrypt
- Stores the hashed password in the database
- Sends a welcome email to the user with:
  - Their login credentials (email and initial password)
  - A password reset link valid for 24 hours
  - Instructions to change their password

### 2. Password Reset Flow

Users can reset their password in two ways:

#### Initial Setup (for new users)
1. User receives welcome email with initial password and reset link
2. User clicks the link and is taken to the password reset page
3. User enters a new password (minimum 8 characters)
4. Password is updated and user can log in

#### Forgotten Password
1. User clicks "Forgot your password?" on the login page
2. User enters their email address
3. System sends a password reset email (if the email exists)
4. User clicks the link in the email (valid for 1 hour)
5. User enters a new password
6. Password is updated and user can log in

### 3. Password Change

Logged-in users can change their password:
1. Navigate to Settings → Change Password
2. Enter current password for verification
3. Enter and confirm new password
4. Password is updated immediately

## Technical Implementation

### Database Schema

Added the following fields to the `User` model:

```prisma
model User {
  password             String?   // Hashed password
  passwordResetToken   String?   // Token for password reset
  passwordResetExpires DateTime? // Expiration time for reset token
  // ... other fields
}
```

### Authentication Flow

1. **Login**: Users authenticate using email and password
2. **JWT Token**: On successful login, a JWT token is issued (valid for 7 days)
3. **Authorization**: API requests include the JWT token in the Authorization header
4. **Token Verification**: Server validates JWT token and retrieves user from database

### Security Features

- **Password Hashing**: Uses bcrypt with salt for secure password storage
- **JWT Authentication**: Stateless authentication with signed tokens
- **Token Expiration**: Reset tokens expire after 1 hour (24 hours for initial setup)
- **Email Verification**: Password resets require email verification
- **Minimum Password Length**: 8 characters required
- **Audit Trail**: All password changes are logged

## API Endpoints

### POST `/api/auth/login`
Authenticate user with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "userpassword"
}
```

**Response:**
```json
{
  "success": true,
  "user": { ... },
  "token": "jwt-token-here"
}
```

### POST `/api/auth/request-reset`
Request a password reset link.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If an account exists with that email, a password reset link has been sent."
}
```

### POST `/api/auth/reset-password`
Reset password using a token.

**Request:**
```json
{
  "token": "reset-token-here",
  "newPassword": "newpassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password has been reset successfully"
}
```

### POST `/api/auth/change-password`
Change password for authenticated user.

**Headers:**
```
Authorization: Bearer jwt-token-here
```

**Request:**
```json
{
  "currentPassword": "currentpassword",
  "newPassword": "newpassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

## Pages

### `/auth/login`
Login page with email/password form and "Forgot password?" link.

### `/auth/forgot-password`
Page to request a password reset link via email.

### `/auth/reset-password?token=...`
Page to set a new password using a reset token.

### `/settings/change-password`
Page for authenticated users to change their password.

## Email Templates

### Welcome Email
Sent when a new user is created. Contains:
- User's email address
- Initial generated password
- Password reset link (24-hour expiration)
- Security reminder to change password

### Password Reset Email
Sent when a user requests a password reset. Contains:
- User's name
- Password reset link (1-hour expiration)
- Security notice

## Environment Variables

Add the following to your `.env` file:

```env
# Authentication
JWT_SECRET=your-secure-jwt-secret-change-in-production
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Mail (required for password reset emails)
SMTP_HOST=smtp.example.org
SMTP_PORT=587
SMTP_USER=apikey_or_user
SMTP_PASS=secret
SMTP_FROM="Filmtheater Planner <noreply@filmtheater.nl>"
```

## Migration from Demo Mode

The system still supports creating users, but now with proper authentication:

1. **Existing Users**: Need to have passwords set via the password reset flow
2. **New Users**: Automatically get passwords when created by admins
3. **Database Migration**: Run `npm run db:push` to add password fields to the database

## Development Notes

### Password Utilities (`src/lib/password.ts`)

- `generatePassword()` - Generates secure random passwords
- `hashPassword()` - Hashes passwords using bcrypt
- `verifyPassword()` - Verifies passwords against hashes
- `generateResetToken()` - Generates secure reset tokens
- `getResetTokenExpiration()` - Calculates token expiration time

### Authentication Utilities (`src/lib/auth.ts`)

- `getUserFromRequest()` - Extracts user from JWT token
- `requireAuth()` - Middleware for authenticated routes
- `requireRole()` - Middleware for role-based access
- `requireAnyRole()` - Middleware for multiple role access

## Security Considerations

1. **JWT Secret**: Change the default JWT_SECRET in production
2. **HTTPS**: Always use HTTPS in production for secure token transmission
3. **Password Strength**: Consider adding password strength requirements
4. **Rate Limiting**: Consider adding rate limiting to login and reset endpoints
5. **Account Lockout**: Consider implementing account lockout after failed attempts
6. **Email Verification**: Consider adding email verification for new accounts

## Testing

To test the password system:

1. Create a new user through the admin interface
2. Check that a welcome email was sent (check SMTP logs)
3. Use the password reset link to set a password
4. Log in with the email and new password
5. Try changing the password through Settings
6. Test the "Forgot Password" flow

## Troubleshooting

### User can't log in
- Check if password is set in database (`password` field is not null)
- Verify SMTP is configured for password reset emails
- Check JWT_SECRET is set in environment

### Password reset email not received
- Verify SMTP configuration in `.env`
- Check SMTP server logs
- Look for errors in application logs

### JWT token errors
- Ensure JWT_SECRET is consistent across deployments
- Check token hasn't expired (7-day validity)
- Verify Authorization header format: `Bearer <token>`


