'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Navbar } from '@/components/layout/navbar';
import { Calendar, Users, AlertTriangle, CheckCircle, Play, Eye, Download, Mail } from 'lucide-react';
import { useDateTimeFormat } from '@/lib/dateUtils';
import { useAuth } from '@/contexts/AuthContext';

interface PlannerResult {
  assignments: Array<{
    screeningId: string;
    userId: string;
    role: string;
    userName?: string;
    screening?: {
      filmTitle: string;
      startsAt: string;
      location: string;
    };
  }>;
  deficits: Array<{
    screeningId: string;
    role: string;
    needed: number;
    available: number;
  }>;
  screenings: Array<{
    id: string;
    filmTitle: string;
    startsAt: string;
    location: string;
    assignments: Array<{
      userId: string;
      userName: string;
      role: string;
    }>;
  }>;
}

export default function PlanPage() {
  const [plannerResult, setPlannerResult] = useState<PlannerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const { formatDateTime } = useDateTimeFormat();
  const [selectedRange, setSelectedRange] = useState<'week' | 'month'>('week');
  const { getToken } = useAuth();

  const exportToPDF = async () => {
    if (!plannerResult) return;
    
    try {
      const token = await getToken();
      const response = await fetch('/api/planner/export-pdf', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          plannerResult,
          range: selectedRange,
          generatedAt: new Date().toISOString(),
        }),
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `planning-${selectedRange}-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to export PDF');
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF');
    }
  };

  const runPlanner = async (dryRun: boolean = true) => {
    setLoading(true);
    
    const now = new Date();
    const rangeStart = now;
    const rangeEnd = selectedRange === 'week' 
      ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    try {
      const token = await getToken();
      const response = await fetch('/api/planner/run', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          rangeStart: rangeStart.toISOString(),
          rangeEnd: rangeEnd.toISOString(),
          dryRun,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setPlannerResult(data.data);
        if (dryRun) {
          setShowPreview(true);
        } else {
          alert('Planner completed successfully!');
        }
      }
    } catch (error) {
      console.error('Failed to run planner:', error);
      alert('Failed to run planner');
    } finally {
      setLoading(false);
    }
  };

  const commitAssignments = async () => {
    await runPlanner(false);
    setShowPreview(false);
  };

  const notifyVolunteers = async () => {
    if (!plannerResult) return;
    setNotifying(true);
    try {
      // Map screenings by id for fast lookup
      const screeningMap = new Map(
        plannerResult.screenings.map(s => [s.id, s])
      );

      // Group assignments by userId
      const assignmentsByUser = new Map<string, { role: string; screeningId: string }[]>();
      for (const a of plannerResult.assignments) {
        if (!assignmentsByUser.has(a.userId)) assignmentsByUser.set(a.userId, []);
        assignmentsByUser.get(a.userId)!.push({ role: a.role, screeningId: a.screeningId });
      }

      // Fetch user emails/names
      const token = await getToken();
      const usersRes = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const usersData = await usersRes.json();
      if (!usersData.success) throw new Error('Failed to load users');
      const userMap = new Map<string, { email: string; name: string }>(
        usersData.data.map((u: any) => [u.id, { email: u.email, name: u.name }])
      );

      // Prepare and send one email per user
      const origin = (typeof window !== 'undefined' && window.location.origin) || (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
      let sent = 0, total = 0;
      for (const [userId, items] of assignmentsByUser.entries()) {
        const user = userMap.get(userId);
        if (!user) continue;
        total++;
        const assignments = items.map(({ role, screeningId }) => {
          const s = screeningMap.get(screeningId)!;
          return {
            id: `${screeningId}:${role}:${userId}`,
            filmTitle: s.filmTitle,
            startsAt: s.startsAt,
            endsAt: new Date(new Date(s.startsAt).getTime() + 2 * 60 * 60 * 1000).toISOString(), // fallback 2h if end unknown
            location: s.location,
            role,
          };
        });

        const resp = await fetch('/api/emails/send', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            type: 'assignments_digest',
            recipients: [user.email],
            data: {
              userName: user.name,
              swapBaseUrl: `${origin}/swaps`,
              assignments,
            },
          }),
        });
        const result = await resp.json();
        if (result.success && result.data?.sent > 0) sent++;
      }
      alert(`Emails sent: ${sent}/${total}`);
    } catch (e) {
      console.error('Notify volunteers failed', e);
      alert('Failed to send notifications.');
    } finally {
      setNotifying(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Planner</h1>
          <p className="mt-2 text-gray-600">
            Run the automatic assignment planner for upcoming screenings
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Play className="w-5 h-5 mr-2" />
                Planner Controls
              </CardTitle>
              <CardDescription>
                Configure and run the automatic assignment planner
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Planning Range</label>
                <div className="flex space-x-4">
                  <Button
                    variant={selectedRange === 'week' ? 'default' : 'outline'}
                    onClick={() => setSelectedRange('week')}
                  >
                    Next Week
                  </Button>
                  <Button
                    variant={selectedRange === 'month' ? 'default' : 'outline'}
                    onClick={() => setSelectedRange('month')}
                  >
                    Next Month
                  </Button>
                </div>
              </div>

              <div className="flex space-x-4">
                <Button 
                  onClick={() => runPlanner(true)}
                  disabled={loading}
                  className="flex items-center"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {loading ? 'Running...' : 'Preview Plan'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => runPlanner(false)}
                  disabled={loading}
                >
                  Run Planner
                </Button>
              </div>

              <div className="text-sm text-gray-600">
                <p>The planner will:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Assign 2 TECHNIEK and 2 ZAALWACHT per screening</li>
                  <li>Respect weekly and monthly limits</li>
                  <li>Prioritize fair distribution</li>
                  <li>Consider skill levels</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Planning Status
              </CardTitle>
              <CardDescription>
                Current status and constraints
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">2</div>
                  <div className="text-sm text-gray-600">Max Shifts/Week</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">2</div>
                  <div className="text-sm text-gray-600">Max Same Film/Month</div>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Available Volunteers</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">TECHNIEK</span>
                    <Badge variant="secondary">8 available</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">ZAALWACHT</span>
                    <Badge variant="secondary">6 available</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle>Planner Preview</DialogTitle>
                  <DialogDescription>
                    Review the proposed assignments before committing
                  </DialogDescription>
                </div>
                <Button
                  onClick={exportToPDF}
                  variant="outline"
                  size="sm"
                  className="flex items-center"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </DialogHeader>
            
            {plannerResult && (
              <div className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {plannerResult.assignments.length}
                        </div>
                        <div className="text-sm text-gray-600">Assignments</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {plannerResult.deficits.length}
                        </div>
                        <div className="text-sm text-gray-600">Deficits</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {Math.round((plannerResult.assignments.length / (plannerResult.assignments.length + plannerResult.deficits.length * 2)) * 100)}%
                        </div>
                        <div className="text-sm text-gray-600">Coverage</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Deficits */}
                {plannerResult.deficits.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-red-600">
                        <AlertTriangle className="w-5 h-5 mr-2" />
                        Staffing Deficits
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Role</TableHead>
                            <TableHead>Needed</TableHead>
                            <TableHead>Available</TableHead>
                            <TableHead>Deficit</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {plannerResult.deficits.map((deficit, index) => (
                            <TableRow key={index}>
                              <TableCell>{deficit.role}</TableCell>
                              <TableCell>{deficit.needed}</TableCell>
                              <TableCell>{deficit.available}</TableCell>
                              <TableCell>
                                <Badge variant="destructive">
                                  {deficit.needed - deficit.available} missing
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {/* Assignment Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-green-600">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Assignment Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Movie & Date</TableHead>
                          <TableHead>Start Time</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>TECHNIEK Volunteers</TableHead>
                          <TableHead>ZAALWACHT Volunteers</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {plannerResult.screenings?.map((screening) => {
                          const techniekAssignments = screening.assignments.filter(a => a.role === 'TECHNIEK');
                          const zaalwachtAssignments = screening.assignments.filter(a => a.role === 'ZAALWACHT');
                          
                          return (
                            <TableRow key={screening.id}>
                              <TableCell className="font-medium">
                                {screening.filmTitle}
                              </TableCell>
                              <TableCell>
                                {formatDateTime(new Date(screening.startsAt))}
                              </TableCell>
                              <TableCell>
                                {screening.location}
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  {techniekAssignments.length > 0 ? (
                                    techniekAssignments.map((assignment, index) => (
                                      <Badge key={index} variant="secondary" className="block w-fit">
                                        {assignment.userName}
                                      </Badge>
                                    ))
                                  ) : (
                                    <Badge variant="destructive">Not assigned</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  {zaalwachtAssignments.length > 0 ? (
                                    zaalwachtAssignments.map((assignment, index) => (
                                      <Badge key={index} variant="secondary" className="block w-fit">
                                        {assignment.userName}
                                      </Badge>
                                    ))
                                  ) : (
                                    <Badge variant="destructive">Not assigned</Badge>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex justify-end space-x-4">
                  <Button variant="outline" onClick={() => setShowPreview(false)}>
                    Cancel
                  </Button>
                  <Button variant="outline" onClick={notifyVolunteers} disabled={!plannerResult || notifying} className="flex items-center">
                    <Mail className="w-4 h-4 mr-2" />
                    {notifying ? 'Sending...' : 'Notify Volunteers'}
                  </Button>
                  <Button onClick={commitAssignments}>
                    Commit Assignments
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

