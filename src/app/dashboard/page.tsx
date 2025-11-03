'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Navbar } from '@/components/layout/navbar';
import { Calendar, Users, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useDateTimeFormat } from '@/lib/dateUtils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface Screening {
  id: string;
  startsAt: string;
  endsAt: string;
  location?: string;
  film: {
    title: string;
  };
  assignments: Array<{
    role: string;
    user: {
      name: string;
    };
  }>;
}

export default function DashboardPage() {
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [loading, setLoading] = useState(true);
  const { formatDateTime } = useDateTimeFormat();
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetchScreenings();
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  const fetchScreenings = async () => {
    try {
      // Fetch screenings from current year onwards
      const currentYear = new Date().getFullYear();
      const futureYear = currentYear + 2;
      
      const response = await fetch(`/api/screenings?start=${currentYear}-01-01&end=${futureYear}-12-31`);
      const data = await response.json();
      
      if (data.success) {
        setScreenings(data.data.slice(0, 10)); // Show next 10 screenings
      }
    } catch (error) {
      console.error('Failed to fetch screenings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAssignmentStatus = (screening: Screening) => {
    const assignments = screening.assignments;
    const techAssignments = assignments.filter(a => a.role === 'TECHNIEK').length;
    const zaalAssignments = assignments.filter(a => a.role === 'ZAALWACHT').length;
    
    const techComplete = techAssignments >= 2;
    const zaalComplete = zaalAssignments >= 2;
    
    if (techComplete && zaalComplete) {
      return { status: 'complete', color: 'success' as const, text: 'Complete' };
    } else if (techAssignments > 0 || zaalAssignments > 0) {
      return { status: 'partial', color: 'warning' as const, text: 'Partial' };
    } else {
      return { status: 'missing', color: 'destructive' as const, text: 'Missing' };
    }
  };

  const runPlanner = async (range: 'week' | 'month') => {
    const now = new Date();
    const rangeStart = range === 'week' ? now : now;
    const rangeEnd = range === 'week' 
      ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    try {
      const response = await fetch('/api/planner/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rangeStart: rangeStart.toISOString(),
          rangeEnd: rangeEnd.toISOString(),
          dryRun: true,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        alert(`Planner preview: ${data.data.assignments.length} assignments, ${data.data.deficits.length} deficits`);
      }
    } catch (error) {
      console.error('Failed to run planner:', error);
    }
  };

  const exportICS = async (range: 'week' | 'month') => {
    const now = new Date();
    const rangeStart = range === 'week' ? now : now;
    const rangeEnd = range === 'week' 
      ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    try {
      const response = await fetch('/api/planner/export-ics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rangeStart: rangeStart.toISOString(),
          rangeEnd: rangeEnd.toISOString(),
        }),
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `assignments-${range}-${new Date().toISOString().split('T')[0]}.ics`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to export ICS file');
      }
    } catch (error) {
      console.error('Failed to export ICS:', error);
      alert('Failed to export ICS file');
    }
  };

  const exportPDF = async (range: 'week' | 'month') => {
    try {
      // Export PDF directly - it will get data from database
      const response = await fetch('/api/planner/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          range,
          generatedAt: new Date().toISOString(),
        }),
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `planning-${range}-${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json();
        console.error('PDF export error:', errorData);
        alert(`Failed to export PDF file: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('Failed to export PDF file');
    }
  };

  // Show loading while checking authentication or fetching data
  if (authLoading || loading) {
    return (
      <div>
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">{t('common.loading')}</div>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('dashboard.title')}</h1>
          <p className="mt-2 text-gray-600">
            {t('dashboard.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.upcomingScreenings')}</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{screenings.length}</div>
              <p className="text-xs text-muted-foreground">
                Next 10 screenings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.completeAssignments')}</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {screenings.filter(s => getAssignmentStatus(s).status === 'complete').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Fully staffed screenings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.missingAssignments')}</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {screenings.filter(s => getAssignmentStatus(s).status === 'missing').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Need staffing
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('dashboard.quickActions')}</CardTitle>
                    <CardDescription>
                      {t('calendar.runPlannerForScreenings')}
                    </CardDescription>
                  </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-4">
                <Button onClick={() => runPlanner('week')}>
                  Run Planner (Week)
                </Button>
                <Button variant="outline" onClick={() => runPlanner('month')}>
                  Run Planner (Month)
                </Button>
              </div>
              <div className="flex space-x-4">
                <Button variant="outline" size="sm" onClick={() => exportICS('week')}>
                  Export ICS (Week)
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportPDF('week')}>
                  Export PDF (Week)
                </Button>
              </div>
              <div className="flex space-x-4">
                <Button variant="outline" size="sm" onClick={() => exportICS('month')}>
                  Export ICS (Month)
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportPDF('month')}>
                  Export PDF (Month)
                </Button>
              </div>
            </CardContent>
          </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t('dashboard.upcomingScreenings')}</CardTitle>
                    <CardDescription>
                      {t('calendar.assignmentStatusForNextScreenings')}
                    </CardDescription>
                  </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Film</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {screenings.map((screening) => {
                    const status = getAssignmentStatus(screening);
                    return (
                      <TableRow key={screening.id}>
                        <TableCell className="font-medium">
                          {screening.film.title}
                        </TableCell>
                        <TableCell>
                          {formatDateTime(new Date(screening.startsAt))}
                        </TableCell>
                        <TableCell>
                          {screening.location || 'TBD'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.color}>
                            {status.text}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

