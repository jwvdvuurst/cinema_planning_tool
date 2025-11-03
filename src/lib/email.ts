import nodemailer from 'nodemailer';

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
});

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    console.log('Attempting to send email to:', options.to);
    console.log('SMTP Config:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER ? '***configured***' : 'NOT SET',
      pass: process.env.SMTP_PASS ? '***configured***' : 'NOT SET',
      from: process.env.SMTP_FROM,
    });

    const mailOptions = {
      from: process.env.SMTP_FROM || 'Filmtheater Planner <noreply@filmtheater.nl>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    console.error('Error details:', {
      code: (error as any).code,
      response: (error as any).response,
      responseCode: (error as any).responseCode,
    });
    return false;
  }
}

export function generateAssignmentEmail(
  userName: string,
  screening: {
    film: { title: string };
    startsAt: Date;
    endsAt: Date;
    location?: string;
  },
  role: string
): EmailOptions {
  const subject = `Assignment: ${screening.film.title} - ${role}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">New Assignment</h2>
      <p>Hello ${userName},</p>
      <p>You have been assigned to work at the following screening:</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0;">${screening.film.title}</h3>
        <p><strong>Date & Time:</strong> ${screening.startsAt.toLocaleDateString()} at ${screening.startsAt.toLocaleTimeString()}</p>
        <p><strong>Duration:</strong> Until ${screening.endsAt.toLocaleTimeString()}</p>
        <p><strong>Location:</strong> ${screening.location || 'TBD'}</p>
        <p><strong>Role:</strong> ${role}</p>
      </div>
      
      <p>Please confirm your availability or request a swap if needed.</p>
      <p>Thank you for your service!</p>
      
      <hr style="margin: 30px 0;">
      <p style="font-size: 12px; color: #666;">
        This is an automated message from the Film Theater Planner system.
      </p>
    </div>
  `;

  const text = `
New Assignment

Hello ${userName},

You have been assigned to work at the following screening:

Film: ${screening.film.title}
Date & Time: ${screening.startsAt.toLocaleDateString()} at ${screening.startsAt.toLocaleTimeString()}
Duration: Until ${screening.endsAt.toLocaleTimeString()}
Location: ${screening.location || 'TBD'}
Role: ${role}

Please confirm your availability or request a swap if needed.

Thank you for your service!

This is an automated message from the Film Theater Planner system.
  `;

  return {
    to: '', // Will be set when sending
    subject,
    html,
    text,
  };
}

// Build an ICS calendar file containing multiple events
export function buildAssignmentsICS(
  userEmail: string,
  items: Array<{
    uid: string;
    title: string;
    startsAt: Date;
    endsAt: Date;
    location?: string;
    description?: string;
    url?: string;
  }>
): string {
  const formatDate = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    // Use UTC for ICS
    return (
      d.getUTCFullYear().toString() +
      pad(d.getUTCMonth() + 1) +
      pad(d.getUTCDate()) +
      'T' +
      pad(d.getUTCHours()) +
      pad(d.getUTCMinutes()) +
      pad(d.getUTCSeconds()) +
      'Z'
    );
  };

  const events = items.map(i => {
    const lines = [
      'BEGIN:VEVENT',
      `UID:${i.uid}@filmtheater-planner`,
      `DTSTAMP:${formatDate(new Date())}`,
      `DTSTART:${formatDate(i.startsAt)}`,
      `DTEND:${formatDate(i.endsAt)}`,
      `SUMMARY:${escapeICSText(i.title)}`,
      i.location ? `LOCATION:${escapeICSText(i.location)}` : undefined,
      i.url ? `URL:${i.url}` : undefined,
      i.description ? `DESCRIPTION:${escapeICSText(i.description)}` : undefined,
      'END:VEVENT',
    ].filter(Boolean) as string[];
    return lines.join('\r\n');
  }).join('\r\n');

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Filmtheater Planner//Assignments//EN',
    'CALSCALE:GREGORIAN',
    `METHOD:PUBLISH`,
    events,
    'END:VCALENDAR',
  ].join('\r\n');

  return ics;
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

export function generateAssignmentsDigestEmail(
  userName: string,
  assignments: Array<{
    filmTitle: string;
    startsAt: Date;
    endsAt: Date;
    location?: string;
    role: string;
    assignmentId: string;
  }>,
  swapBaseUrl: string
): EmailOptions {
  const subject = `Your upcoming shifts (${assignments.length})`;
  const listHtml = assignments.map(a => `
    <li>
      <strong>${a.filmTitle}</strong> – ${a.role}<br/>
      ${a.startsAt.toLocaleDateString()} ${a.startsAt.toLocaleTimeString()}–${a.endsAt.toLocaleTimeString()} @ ${a.location || 'TBD'}
      <div>
        <a href="${swapBaseUrl}?assignmentId=${a.assignmentId}">Request a swap</a>
      </div>
    </li>
  `).join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
      <h2>Hello ${userName},</h2>
      <p>These are your confirmed upcoming shifts:</p>
      <ul>${listHtml}</ul>
      <p>You can add all shifts to your agenda using the attached ICS file.</p>
      <p>If a shift does not work for you, use the link above to request a swap.</p>
      <hr/>
      <p style="font-size:12px;color:#666">Film Theater Planner</p>
    </div>
  `;

  const text = assignments.map(a => (
    `${a.filmTitle} – ${a.role}\n${a.startsAt.toLocaleString()}–${a.endsAt.toLocaleTimeString()} @ ${a.location || 'TBD'}\nSwap: ${swapBaseUrl}?assignmentId=${a.assignmentId}\n`
  )).join('\n');

  // Build ICS attachment
  const ics = buildAssignmentsICS('', assignments.map(a => ({
    uid: a.assignmentId,
    title: `${a.filmTitle} – ${a.role}`,
    startsAt: a.startsAt,
    endsAt: a.endsAt,
    location: a.location,
    url: `${swapBaseUrl}?assignmentId=${a.assignmentId}`,
    description: 'Volunteer shift',
  })));

  return {
    to: '',
    subject,
    html,
    text,
    attachments: [
      {
        filename: 'shifts.ics',
        content: ics,
        contentType: 'text/calendar; charset=utf-8',
      },
    ],
  };
}

export function generateSwapRequestEmail(
  targetUserName: string,
  requesterName: string,
  screening: {
    film: { title: string };
    startsAt: Date;
    location?: string;
  },
  role: string
): EmailOptions {
  const subject = `Swap Request: ${screening.film.title} - ${role}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Swap Request</h2>
      <p>Hello ${targetUserName},</p>
      <p>${requesterName} is requesting to swap your assignment for the following screening:</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0;">${screening.film.title}</h3>
        <p><strong>Date & Time:</strong> ${screening.startsAt.toLocaleDateString()} at ${screening.startsAt.toLocaleTimeString()}</p>
        <p><strong>Location:</strong> ${screening.location || 'TBD'}</p>
        <p><strong>Role:</strong> ${role}</p>
      </div>
      
      <p>Please log in to the system to accept or reject this swap request.</p>
      
      <hr style="margin: 30px 0;">
      <p style="font-size: 12px; color: #666;">
        This is an automated message from the Film Theater Planner system.
      </p>
    </div>
  `;

  const text = `
Swap Request

Hello ${targetUserName},

${requesterName} is requesting to swap your assignment for the following screening:

Film: ${screening.film.title}
Date & Time: ${screening.startsAt.toLocaleDateString()} at ${screening.startsAt.toLocaleTimeString()}
Location: ${screening.location || 'TBD'}
Role: ${role}

Please log in to the system to accept or reject this swap request.

This is an automated message from the Film Theater Planner system.
  `;

  return {
    to: '', // Will be set when sending
    subject,
    html,
    text,
  };
}

export function generateDeficitAlertEmail(
  deficits: Array<{
    screeningId: string;
    role: string;
    needed: number;
    available: number;
  }>,
  screenings: Array<{
    id: string;
    film: { title: string };
    startsAt: Date;
    location?: string;
  }>
): EmailOptions {
  const subject = `Staffing Deficit Alert - ${deficits.length} screenings need coverage`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #d32f2f;">Staffing Deficit Alert</h2>
      <p>The automatic planner was unable to fully staff the following screenings:</p>
      
      ${deficits.map(deficit => {
        const screening = screenings.find(s => s.id === deficit.screeningId);
        return `
          <div style="background: #fff3e0; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ff9800;">
            <h3 style="margin-top: 0;">${screening?.film.title || 'Unknown Film'}</h3>
            <p><strong>Date:</strong> ${screening?.startsAt.toLocaleDateString()}</p>
            <p><strong>Location:</strong> ${screening?.location || 'TBD'}</p>
            <p><strong>Deficit:</strong> Need ${deficit.needed - deficit.available} more ${deficit.role} volunteer${deficit.needed - deficit.available > 1 ? 's' : ''}</p>
          </div>
        `;
      }).join('')}
      
      <p>Please review the volunteer availability and consider manual assignments or recruiting additional volunteers.</p>
      
      <hr style="margin: 30px 0;">
      <p style="font-size: 12px; color: #666;">
        This is an automated message from the Film Theater Planner system.
      </p>
    </div>
  `;

  const text = `
Staffing Deficit Alert

The automatic planner was unable to fully staff the following screenings:

${deficits.map(deficit => {
    const screening = screenings.find(s => s.id === deficit.screeningId);
    return `
${screening?.film.title || 'Unknown Film'}
Date: ${screening?.startsAt.toLocaleDateString()}
Location: ${screening?.location || 'TBD'}
Deficit: Need ${deficit.needed - deficit.available} more ${deficit.role} volunteer${deficit.needed - deficit.available > 1 ? 's' : ''}
    `;
  }).join('')}

Please review the volunteer availability and consider manual assignments or recruiting additional volunteers.

This is an automated message from the Film Theater Planner system.
  `;

  return {
    to: '', // Will be set when sending
    subject,
    html,
    text,
  };
}

export function generateWelcomeEmail(
  userName: string,
  userEmail: string,
  initialPassword: string,
  resetUrl: string
): EmailOptions {
  const subject = 'Welcome to Film Theater Planner - Set Your Password';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Welcome to Film Theater Planner!</h2>
      <p>Hello ${userName},</p>
      <p>Your volunteer account has been created. Below you'll find your login credentials:</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Email:</strong> ${userEmail}</p>
        <p><strong>Initial Password:</strong> <code style="background: #fff; padding: 2px 6px; border-radius: 3px;">${initialPassword}</code></p>
      </div>
      
      <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 0;"><strong>⚠️ Important:</strong> For security reasons, please change your password as soon as possible.</p>
      </div>
      
      <p style="margin: 30px 0;">
        <a href="${resetUrl}" style="background: #2196F3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Set Your Password
        </a>
      </p>
      
      <p>You can also copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666; font-size: 12px;">${resetUrl}</p>
      
      <p>This link will expire in 24 hours.</p>
      
      <hr style="margin: 30px 0;">
      <p style="font-size: 12px; color: #666;">
        This is an automated message from the Film Theater Planner system.<br>
        If you did not expect this email, please contact your administrator.
      </p>
    </div>
  `;

  const text = `
Welcome to Film Theater Planner!

Hello ${userName},

Your volunteer account has been created. Below you'll find your login credentials:

Email: ${userEmail}
Initial Password: ${initialPassword}

⚠️ IMPORTANT: For security reasons, please change your password as soon as possible.

Set Your Password:
${resetUrl}

This link will expire in 24 hours.

This is an automated message from the Film Theater Planner system.
If you did not expect this email, please contact your administrator.
  `;

  return {
    to: userEmail,
    subject,
    html,
    text,
  };
}

export function generatePasswordResetEmail(
  userName: string,
  userEmail: string,
  resetUrl: string
): EmailOptions {
  const subject = 'Password Reset Request - Film Theater Planner';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Password Reset Request</h2>
      <p>Hello ${userName},</p>
      <p>You requested to reset your password for the Film Theater Planner system.</p>
      
      <p style="margin: 30px 0;">
        <a href="${resetUrl}" style="background: #2196F3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Reset Your Password
        </a>
      </p>
      
      <p>You can also copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666; font-size: 12px;">${resetUrl}</p>
      
      <p>This link will expire in 1 hour.</p>
      
      <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 0;"><strong>⚠️ Security Notice:</strong> If you did not request this password reset, please ignore this email. Your password will remain unchanged.</p>
      </div>
      
      <hr style="margin: 30px 0;">
      <p style="font-size: 12px; color: #666;">
        This is an automated message from the Film Theater Planner system.
      </p>
    </div>
  `;

  const text = `
Password Reset Request

Hello ${userName},

You requested to reset your password for the Film Theater Planner system.

Reset Your Password:
${resetUrl}

This link will expire in 1 hour.

⚠️ SECURITY NOTICE: If you did not request this password reset, please ignore this email. Your password will remain unchanged.

This is an automated message from the Film Theater Planner system.
  `;

  return {
    to: userEmail,
    subject,
    html,
    text,
  };
}

