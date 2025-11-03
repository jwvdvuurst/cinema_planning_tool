'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Navbar } from '@/components/layout/navbar';
import { Calendar, Users, CheckCircle, XCircle, Mail, Send, Edit, UserCheck } from 'lucide-react';
import { useDateTimeFormat } from '@/lib/dateUtils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

interface Screening {
  id: string;
  startsAt: string;
  endsAt: string;
  location?: string;
  film: {
    title: string;
  };
}

interface Availability {
  id: string;
  screeningId: string;
  role: string;
  status: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
  active: boolean;
}

interface AvailabilityStatus {
  userId: string;
  userName: string;
  userEmail: string;
  hasEnteredAvailability: boolean;
  lastAvailabilityEntry?: string;
  screeningsCount: number;
}

export default function AvailabilityPage() {
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [primaryRole, setPrimaryRole] = useState<string>('TECHNIEK'); // User's primary role for availability
  const { formatDateTime } = useDateTimeFormat();
  const { t } = useLanguage();
  
  // Admin functionality state
  const [users, setUsers] = useState<User[]>([]);
  const [availabilityStatuses, setAvailabilityStatuses] = useState<AvailabilityStatus[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState('');
  
  // Check if user has admin role
  const isAdmin = user?.roles.includes('ADMIN') || false;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch screenings from current year onwards
      const currentYear = new Date().getFullYear();
      const futureYear = currentYear + 2;
      
      const fetchPromises = [
        fetch(`/api/screenings?start=${currentYear}-01-01&end=${futureYear}-12-31`),
        fetch('/api/availability'), // TODO: Implement this endpoint
      ];

      // Add admin-specific data fetching
      if (isAdmin) {
        fetchPromises.push(
          fetch('/api/users'),
          fetch('/api/availability/status')
        );
      }
      
      const responses = await Promise.all(fetchPromises);
      const [screeningsRes, availabilitiesRes] = responses;
      
      const screeningsData = await screeningsRes.json();
      if (screeningsData.success) {
        setScreenings(screeningsData.data.slice(0, 20)); // Show next 20 screenings
      }
      
      // Load existing availabilities
      const availabilitiesData = await availabilitiesRes.json();
      if (availabilitiesData.success) {
        setAvailabilities(availabilitiesData.data);
      }

      // Handle admin data
      if (isAdmin && responses.length > 2) {
        const [usersRes, availabilityStatusRes] = responses.slice(2);
        
        const usersData = await usersRes.json();
        if (usersData.success) {
          setUsers(usersData.data.filter((user: User) => user.active));
        }

        const availabilityStatusData = await availabilityStatusRes.json();
        if (availabilityStatusData.success) {
          setAvailabilityStatuses(availabilityStatusData.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async (screeningId: string, isAvailable: boolean) => {
    const status = isAvailable ? 'available' : 'unavailable';
    
    try {
      const response = await fetch('/api/availability/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screeningId,
          role: primaryRole,
          status,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        // Update local state
        setAvailabilities(prev => {
          const existing = prev.find(a => a.screeningId === screeningId && a.role === primaryRole);
          if (existing) {
            return prev.map(a => 
              a.screeningId === screeningId && a.role === primaryRole 
                ? { ...a, status }
                : a
            );
          } else {
            return [...prev, { screeningId, role: primaryRole, status, id: data.data.id }];
          }
        });
      }
    } catch (error) {
      console.error('Failed to update availability:', error);
    }
  };

  const getAvailabilityStatus = (screeningId: string, role: string) => {
    const availability = availabilities.find(a => a.screeningId === screeningId && a.role === role);
    return availability ? availability.status : 'unavailable';
  };

  const getAvailabilityIcon = (status: string) => {
    return status === 'available' ? (
      <CheckCircle className="w-5 h-5 text-green-600" />
    ) : (
      <XCircle className="w-5 h-5 text-gray-400" />
    );
  };

  // Admin functions
  const handleSendAvailabilityRequest = async () => {
    try {
      const response = await fetch('/api/availability/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: emailTemplate,
          screeningIds: screenings.map(s => s.id),
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`Availability request sent to ${data.sentCount} volunteers!`);
        setIsEmailDialogOpen(false);
        setEmailTemplate('');
      } else {
        alert(`Error sending request: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to send availability request:', error);
      alert('Failed to send availability request. Please try again.');
    }
  };

  const handleEditUserAvailability = (user: User) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">Loading availability...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('availability.title')}</h1>
              <p className="mt-2 text-gray-600">
                {t('availability.subtitle')}
              </p>
            </div>
            {isAdmin && (
              <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Send className="w-4 h-4 mr-2" />
                    {t('availability.sendRequest')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Send Availability Request</DialogTitle>
                    <DialogDescription>
                      Send an email to all active volunteers requesting their availability
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Email Template</label>
                      <textarea
                        className="w-full mt-1 p-3 border border-gray-300 rounded-md"
                        rows={6}
                        value={emailTemplate}
                        onChange={(e) => setEmailTemplate(e.target.value)}
                        placeholder="Dear volunteer,

We need your availability for the upcoming screenings. Please click the link below to enter your availability:

[AVAILABILITY_LINK]

Thank you for your time!"
                      />
                    </div>
                    <div className="text-sm text-gray-600">
                      <p><strong>Available placeholders:</strong></p>
                      <p>• [AVAILABILITY_LINK] - Link to availability page</p>
                      <p>• [USER_NAME] - Volunteer's name</p>
                      <p>• [SCREENINGS_COUNT] - Number of upcoming screenings</p>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSendAvailabilityRequest}>
                      Send to {users.length} Volunteers
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  {t('availability.grid')}
                </CardTitle>
                <CardDescription>
                  {t('availability.toggleDescription')}
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="role-select" className="text-sm font-medium">{t('availability.myRole')}</Label>
                <select
                  id="role-select"
                  value={primaryRole}
                  onChange={(e) => setPrimaryRole(e.target.value)}
                  className="border rounded-md px-3 py-1 text-sm"
                  aria-label="Select your primary role for availability"
                >
                  {user?.roles.filter(r => r !== 'ADMIN' && r !== 'PROGRAMMA').map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('availability.film')}</TableHead>
                    <TableHead>{t('availability.dateTime')}</TableHead>
                    <TableHead>{t('availability.location')}</TableHead>
                    <TableHead className="text-center">{t('availability.available')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {screenings.map((screening) => {
                    const status = getAvailabilityStatus(screening.id, primaryRole);
                    const isAvailable = status === 'available';
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
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <Switch
                              id={`availability-${screening.id}`}
                              checked={isAvailable}
                              onCheckedChange={(checked) => toggleAvailability(screening.id, checked)}
                            />
                            <Label
                              htmlFor={`availability-${screening.id}`}
                              className={`text-sm cursor-pointer ${
                                isAvailable ? 'text-green-600 font-medium' : 'text-gray-500'
                              }`}
                            >
                              {isAvailable ? t('common.yes') : t('common.no')}
                            </Label>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Availability Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-sm">Available</span>
              </div>
              <div className="flex items-center">
                <XCircle className="w-5 h-5 text-gray-400 mr-2" />
                <span className="text-sm">Unavailable</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  // Mark all as available
                  screenings.forEach(screening => {
                    if (getAvailabilityStatus(screening.id, primaryRole) === 'unavailable') {
                      toggleAvailability(screening.id, true);
                    }
                  });
                }}
              >
                Mark All Available
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  // Mark all as unavailable
                  screenings.forEach(screening => {
                    if (getAvailabilityStatus(screening.id, primaryRole) === 'available') {
                      toggleAvailability(screening.id, false);
                    }
                  });
                }}
              >
                Mark All Unavailable
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Admin Management Section */}
        {isAdmin && (
          <div className="mt-8">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Volunteers</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{users.length}</div>
                  <p className="text-xs text-muted-foreground">Active volunteers</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Availability Entered</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {availabilityStatuses.filter(status => status.hasEnteredAvailability).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {users.length > 0 ? Math.round((availabilityStatuses.filter(status => status.hasEnteredAvailability).length / users.length) * 100) : 0}% of volunteers
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <XCircle className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {availabilityStatuses.filter(status => !status.hasEnteredAvailability).length}
                  </div>
                  <p className="text-xs text-muted-foreground">Need to enter availability</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Upcoming Screenings</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{screenings.length}</div>
                  <p className="text-xs text-muted-foreground">Next 20 screenings</p>
                </CardContent>
              </Card>
            </div>

            {/* Availability Status Table */}
            <Card>
              <CardHeader>
                <CardTitle>Volunteer Availability Status</CardTitle>
                <CardDescription>
                  Overview of who has entered their availability and who still needs to
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Volunteer</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Entry</TableHead>
                      <TableHead>Screenings</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availabilityStatuses.map((status) => (
                      <TableRow key={status.userId}>
                        <TableCell className="font-medium">{status.userName}</TableCell>
                        <TableCell>{status.userEmail}</TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            {users.find(u => u.id === status.userId)?.roles.map((role) => (
                              <Badge key={role} variant="secondary" className="text-xs">
                                {role}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {status.hasEnteredAvailability ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Completed
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="bg-orange-100 text-orange-800">
                              <XCircle className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {status.lastAvailabilityEntry ? (
                            <span className="text-sm">
                              {formatDateTime(status.lastAvailabilityEntry)}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">Never</span>
                          )}
                        </TableCell>
                        <TableCell>{status.screeningsCount}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const user = users.find(u => u.id === status.userId);
                              if (user) handleEditUserAvailability(user);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Edit User Availability Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Availability for {selectedUser?.name}</DialogTitle>
              <DialogDescription>
                Manually set availability for this volunteer
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  This feature will be implemented to allow admins to directly edit volunteer availability.
                </p>
                <div className="text-sm">
                  <p><strong>Volunteer:</strong> {selectedUser.name}</p>
                  <p><strong>Email:</strong> {selectedUser.email}</p>
                  <p><strong>Roles:</strong> {selectedUser.roles.join(', ')}</p>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Close
                  </Button>
                  <Button onClick={() => setIsEditDialogOpen(false)}>
                    Save Changes
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

