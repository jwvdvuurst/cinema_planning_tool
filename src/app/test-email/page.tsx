'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestEmailPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [config, setConfig] = useState<any>(null);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/test-email');
      const data = await response.json();
      setConfig(data.config);
    } catch (error) {
      console.error('Failed to fetch config:', error);
    }
  };

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage('✓ Test email sent successfully! Check your inbox and spam folder.');
      } else {
        setMessage(`✗ Failed to send: ${data.error}`);
      }
    } catch (error) {
      console.error('Test email error:', error);
      setMessage('✗ An error occurred. Check the browser console and server logs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Test Email Configuration</h1>
          <p className="mt-2 text-gray-600">
            Test your SMTP email settings by sending a test email
          </p>
        </div>

        {/* Current Configuration */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Current SMTP Configuration</CardTitle>
            <CardDescription>
              Environment variables for email sending
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchConfig} variant="outline" size="sm" className="mb-4">
              Refresh Configuration
            </Button>
            
            {config && (
              <div className="space-y-2 text-sm font-mono bg-gray-100 p-4 rounded">
                <div><strong>SMTP_HOST:</strong> {config.smtp_host}</div>
                <div><strong>SMTP_PORT:</strong> {config.smtp_port}</div>
                <div><strong>SMTP_USER:</strong> {config.smtp_user}</div>
                <div><strong>SMTP_PASS:</strong> {config.smtp_pass}</div>
                <div><strong>SMTP_FROM:</strong> {config.smtp_from}</div>
              </div>
            )}
            
            {config && (
              <div className="mt-4">
                {(config.smtp_host === 'NOT SET' || config.smtp_host === 'localhost') && (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded text-sm">
                    ⚠️ SMTP not configured. Add SMTP settings to your .env file.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Email Form */}
        <Card>
          <CardHeader>
            <CardTitle>Send Test Email</CardTitle>
            <CardDescription>
              Enter your email address to receive a test email
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTest} className="space-y-4">
              <div>
                <Label htmlFor="email">Your Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your.email@example.com"
                  disabled={loading}
                />
              </div>

              {message && (
                <div className={`px-4 py-3 rounded text-sm ${
                  message.includes('✓') 
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                  {message}
                </div>
              )}

              <Button type="submit" disabled={loading}>
                {loading ? 'Sending...' : 'Send Test Email'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Setup Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">1. Configure SMTP in .env file:</h3>
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto">
{`SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Film Theater <noreply@filmtheater.nl>"`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold mb-2">2. Common SMTP Providers:</h3>
              <div className="space-y-2 text-sm">
                <div className="bg-gray-50 p-3 rounded">
                  <strong>Gmail:</strong><br/>
                  Host: smtp.gmail.com, Port: 587<br/>
                  <span className="text-xs text-gray-600">Note: Use an App Password, not your regular password</span>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <strong>Outlook/Office 365:</strong><br/>
                  Host: smtp.office365.com, Port: 587
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <strong>SendGrid:</strong><br/>
                  Host: smtp.sendgrid.net, Port: 587<br/>
                  User: apikey, Pass: Your SendGrid API key
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <strong>Mailgun:</strong><br/>
                  Host: smtp.mailgun.org, Port: 587
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">3. Gmail Setup (if using Gmail):</h3>
              <ol className="list-decimal list-inside text-sm space-y-1">
                <li>Enable 2-factor authentication on your Google account</li>
                <li>Go to Google Account → Security → 2-Step Verification</li>
                <li>Scroll down to "App passwords"</li>
                <li>Generate an app password for "Mail"</li>
                <li>Use this app password in SMTP_PASS</li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold mb-2">4. After updating .env:</h3>
              <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded text-sm">
                ⚠️ Remember to restart your development server after changing .env file!
                <pre className="mt-2 bg-blue-100 p-2 rounded">npm run dev</pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}