'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Navbar } from '@/components/layout/navbar';
import { Plus, Calendar, Film, Users, Trash2, Settings, UserPlus, UserMinus, Pencil, Eraser } from 'lucide-react';
import { useDateTimeFormat } from '@/lib/dateUtils';
import { DateTimeInput } from '@/components/ui/datetime-input';
import { useSettings } from '@/contexts/SettingsContext';
import { useScreeningConfig } from '@/contexts/ScreeningConfigContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

interface Film {
  id: string;
  title: string;
  runtime?: number;
}

interface Screening {
  id: string;
  startsAt: string;
  endsAt: string;
  location?: string;
  notes?: string;
  film: Film;
  assignments: Array<{
    id: string;
    role: string;
    userId: string;
    user: {
      id: string;
      name: string;
    };
  }>;
}

export default function ScreeningsPage() {
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [films, setFilms] = useState<Film[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newScreening, setNewScreening] = useState({
    filmId: '',
    startsAt: '',
    endsAt: '',
    location: '',
    notes: '',
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [selectedScreening, setSelectedScreening] = useState<Screening | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState<{ startsAt: string; endsAt: string; location: string }>({ startsAt: '', endsAt: '', location: '' });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<Array<{id: string, name: string, roles: string[]}>>([]);
  const [newAssignment, setNewAssignment] = useState({ userId: '', role: 'TECHNIEK' as const });
  const { formatDateTime } = useDateTimeFormat();
  const { locations } = useSettings();
  const { calculateEndTime } = useScreeningConfig();
  const { t } = useLanguage();
  const { getToken, loading: authLoading } = useAuth();
  const isAdmin = true; // TODO: replace with real auth once available

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading]);

  // Auto-fill location when there's only one available
  useEffect(() => {
    if (locations.length === 1 && !newScreening.location) {
      setNewScreening(prev => ({ ...prev, location: locations[0] }));
    }
  }, [locations, newScreening.location]);

  // Auto-calculate end time when start time or film changes
  useEffect(() => {
    if (newScreening.startsAt && newScreening.filmId) {
      const selectedFilm = films.find(f => f.id === newScreening.filmId);
      if (selectedFilm?.runtime) {
        const startTime = new Date(newScreening.startsAt);
        const endTime = calculateEndTime(startTime, selectedFilm.runtime);
        setNewScreening(prev => ({ ...prev, endsAt: endTime.toISOString() }));
      }
    }
  }, [newScreening.startsAt, newScreening.filmId, films, calculateEndTime]);

  // Clear validation errors when dialog closes
  useEffect(() => {
    if (!isDialogOpen) {
      setValidationErrors([]);
    }
  }, [isDialogOpen]);

  // Validation for edit (reuse create validation but allow past times)
  const validateEdit = (data: { startsAt: string; endsAt: string; location: string }): string[] => {
    const errors: string[] = [];
    if (!data.startsAt) errors.push('Start time is required');
    if (!data.endsAt) errors.push('End time is required');
    if (!data.location) errors.push('Location is required');

    if (data.startsAt && data.endsAt) {
      const startDate = new Date(data.startsAt);
      const endDate = new Date(data.endsAt);
      if (endDate <= startDate) errors.push('End time must be after start time');

      // Location conflict check excluding the selected screening itself
      const conflicting = screenings.find(s => {
        if (!selectedScreening) return false;
        if (s.id === selectedScreening.id) return false;
        const es = new Date(s.startsAt);
        const ee = new Date(s.endsAt);
        return s.location === data.location && (
          (startDate >= es && startDate < ee) ||
          (endDate > es && endDate <= ee) ||
          (startDate <= es && endDate >= ee)
        );
      });
      if (conflicting) {
        errors.push(`Location conflict with another screening at ${data.location}`);
      }
    }
    return errors;
  };

  const clearAssignmentsForScreening = async (screeningId: string, filmTitle: string, screeningTime: string) => {
    if (!confirm(`Remove ALL assignments for "${filmTitle}" on ${screeningTime}? This cannot be undone.`)) return;
    try {
      const token = await getToken();
      const res = await fetch('/api/assignments', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ screeningId }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchData();
        alert(`Removed ${data.deleted} assignment(s).`);
      } else {
        alert(`Error clearing assignments: ${data.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error('Failed to clear assignments', e);
      alert('Failed to clear assignments. Please try again.');
    }
  };

  const clearAssignmentsInRange = async () => {
    const start = prompt('Enter start date (YYYY-MM-DD)');
    if (!start) return;
    const end = prompt('Enter end date (YYYY-MM-DD)');
    if (!end) return;
    if (!confirm(`Remove ALL assignments between ${start} and ${end}? This cannot be undone.`)) return;
    try {
      const token = await getToken();
      const res = await fetch('/api/assignments', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ rangeStart: `${start}T00:00:00.000Z`, rangeEnd: `${end}T23:59:59.999Z` }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchData();
        alert(`Removed ${data.deleted} assignment(s) in range.`);
      } else {
        alert(`Error clearing assignments: ${data.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error('Failed to clear assignments range', e);
      alert('Failed to clear assignments in range. Please try again.');
    }
  };

  const openEditDialog = (screening: Screening) => {
    setSelectedScreening(screening);
    setEditData({ startsAt: screening.startsAt, endsAt: screening.endsAt, location: screening.location || '' });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedScreening) return;
    const errors = validateEdit(editData);
    setValidationErrors(errors);
    if (errors.length > 0) return;
    try {
      setIsSavingEdit(true);
      const token = await getToken();
      const res = await fetch(`/api/screenings/${selectedScreening.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(editData),
      });
      const data = await res.json();
      if (data.success) {
        await fetchData();
        setIsEditDialogOpen(false);
        setSelectedScreening(null);
        alert('Screening updated successfully!');
      } else {
        alert(`Error updating screening: ${data.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error('Failed to update screening', e);
      alert('Failed to update screening. Please try again.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Validation function
  const validateScreening = (): string[] => {
    const errors: string[] = [];
    const now = new Date();

    // Required fields validation
    if (!newScreening.filmId) {
      errors.push('Please select a film');
    }
    if (!newScreening.startsAt) {
      errors.push('Start time is required');
    }
    if (!newScreening.endsAt) {
      errors.push('End time is required');
    }
    if (!newScreening.location) {
      errors.push('Location is required');
    }

    // Date/time validation
    if (newScreening.startsAt && newScreening.endsAt) {
      const startDate = new Date(newScreening.startsAt);
      const endDate = new Date(newScreening.endsAt);

      // Check if start time is in the future
      if (startDate <= now) {
        errors.push('Start time must be in the future');
      }

      // Check if end time is after start time
      if (endDate <= startDate) {
        errors.push('End time must be after start time');
      }

      // Check duration (minimum 30 minutes, maximum 6 hours)
      const duration = endDate.getTime() - startDate.getTime();
      const durationMinutes = duration / (1000 * 60);
      
      if (durationMinutes < 30) {
        errors.push('Screening duration must be at least 30 minutes');
      }
      if (durationMinutes > 360) {
        errors.push('Screening duration cannot exceed 6 hours');
      }

      // Check for location conflicts (same location, overlapping times)
      const conflictingScreening = screenings.find(screening => {
        const existingStart = new Date(screening.startsAt);
        const existingEnd = new Date(screening.endsAt);
        
        return screening.location === newScreening.location &&
               ((startDate >= existingStart && startDate < existingEnd) ||
                (endDate > existingStart && endDate <= existingEnd) ||
                (startDate <= existingStart && endDate >= existingEnd));
      });

      if (conflictingScreening) {
        const conflictStart = new Date(conflictingScreening.startsAt);
        errors.push(`Location conflict: Another screening is scheduled at ${newScreening.location} from ${formatDateTime(conflictStart)} to ${formatDateTime(new Date(conflictingScreening.endsAt))}`);
      }
    }

    // Check if film exists and is available
    if (newScreening.filmId) {
      const selectedFilm = films.find(film => film.id === newScreening.filmId);
      if (!selectedFilm) {
        errors.push('Selected film not found');
      }
    }

    return errors;
  };

  const fetchData = async () => {
    try {
      // Fetch screenings from current year onwards
      const currentYear = new Date().getFullYear();
      const futureYear = currentYear + 2; // Include next 2 years
      
      const token = await getToken();
      const headers = {
        'Authorization': `Bearer ${token}`,
      };
      
      const [screeningsRes, filmsRes] = await Promise.all([
        fetch(`/api/screenings?start=${currentYear}-01-01&end=${futureYear}-12-31`, { headers }),
        fetch('/api/films', { headers }),
      ]);
      
      const screeningsData = await screeningsRes.json();
      const filmsData = await filmsRes.json();
      
      if (screeningsData.success) {
        setScreenings(screeningsData.data);
      }
      if (filmsData.success) {
        setFilms(filmsData.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateScreening = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate before submitting
    setIsValidating(true);
    const errors = validateScreening();
    setValidationErrors(errors);
    
    if (errors.length > 0) {
      setIsValidating(false);
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch('/api/screenings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newScreening),
      });
      
      const data = await response.json();
      if (data.success) {
        // Refresh data from server to ensure consistency
        await fetchData();
        setNewScreening({ filmId: '', startsAt: '', endsAt: '', location: '', notes: '' });
        setValidationErrors([]);
        setIsDialogOpen(false);
        alert('Screening created successfully!');
      } else {
        alert(`Error creating screening: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to create screening:', error);
      alert('Failed to create screening. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleDeleteScreening = async (screeningId: string, filmTitle: string, screeningTime: string) => {
    if (!confirm(`Are you sure you want to delete the screening of "${filmTitle}" on ${screeningTime}? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch(`/api/screenings/${screeningId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchData(); // Refresh the list
        alert('Screening deleted successfully!');
      } else {
        alert(`Error deleting screening: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to delete screening:', error);
      alert('Failed to delete screening. Please try again.');
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

  const openAssignmentDialog = async (screening: Screening) => {
    setSelectedScreening(screening);
    setShowAssignmentDialog(true);
    
    // Fetch available users for assignment
    try {
      const token = await getToken();
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        const activeUsers = data.data.filter((user: any) => user.active);
        
        // Filter out users already assigned to this screening
        const assignedUserIds = screening.assignments.map(a => a.userId);
        const availableUsers = activeUsers.filter((user: any) => 
          !assignedUserIds.includes(user.id)
        );
        
        setAvailableUsers(availableUsers);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleAddAssignment = async () => {
    if (!selectedScreening || !newAssignment.userId) return;

    try {
      const token = await getToken();
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          screeningId: selectedScreening.id,
          userId: newAssignment.userId,
          role: newAssignment.role,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchData(); // Refresh screenings
        
        // Update the selected screening with new data
        const token = await getToken();
        const updatedScreenings = await fetch('/api/screenings?start=2025-01-01&end=2027-12-31', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const screeningsData = await updatedScreenings.json();
        if (screeningsData.success) {
          const updatedScreening = screeningsData.data.find((s: any) => s.id === selectedScreening.id);
          if (updatedScreening) {
            setSelectedScreening(updatedScreening);
            // Refresh available users list
            await openAssignmentDialog(updatedScreening);
          }
        }
        
        setNewAssignment({ userId: '', role: 'TECHNIEK' });
        alert('Assignment added successfully!');
      } else {
        alert(`Error adding assignment: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to add assignment:', error);
      alert('Failed to add assignment. Please try again.');
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to remove this assignment?')) return;

    try {
      const token = await getToken();
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        await fetchData(); // Refresh screenings
        alert('Assignment removed successfully!');
      } else {
        alert(`Error removing assignment: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to remove assignment:', error);
      alert('Failed to remove assignment. Please try again.');
    }
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">Loading screenings...</div>
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
              <h1 className="text-3xl font-bold text-gray-900">Screenings</h1>
              <p className="mt-2 text-gray-600">
                Manage film screenings and assignments
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Screening
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Screening</DialogTitle>
                  <DialogDescription>
                    Schedule a new film screening
                  </DialogDescription>
                </DialogHeader>

                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="font-medium text-red-900 mb-2">Please fix the following issues:</h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index} className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{error}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Screening Preview */}
                {newScreening.filmId && newScreening.startsAt && newScreening.endsAt && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Screening Preview:</h4>
                    <div className="text-sm text-blue-700 space-y-1">
                      <p><strong>Film:</strong> {films.find(f => f.id === newScreening.filmId)?.title || 'Unknown'}</p>
                      <p><strong>Date:</strong> {new Date(newScreening.startsAt).toLocaleDateString()}</p>
                      <p><strong>Time:</strong> {new Date(newScreening.startsAt).toLocaleTimeString()} - {new Date(newScreening.endsAt).toLocaleTimeString()}</p>
                      <p><strong>Duration:</strong> {Math.round((new Date(newScreening.endsAt).getTime() - new Date(newScreening.startsAt).getTime()) / (1000 * 60))} minutes</p>
                      <p><strong>Location:</strong> {newScreening.location || 'Not selected'}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleCreateScreening} className="space-y-4">
                  <div>
                    <Label htmlFor="filmId">Film</Label>
                    <select
                      id="filmId"
                      value={newScreening.filmId}
                      onChange={(e) => setNewScreening({ ...newScreening, filmId: e.target.value })}
                      className="w-full p-2 border rounded-md"
                      required
                    >
                      <option value="">Select a film</option>
                      {films.map((film) => (
                        <option key={film.id} value={film.id}>
                          {film.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <DateTimeInput
                      id="startsAt"
                      label="Start Time"
                      value={newScreening.startsAt}
                      onChange={(value) => setNewScreening({ ...newScreening, startsAt: value })}
                      required
                    />
                    <DateTimeInput
                      id="endsAt"
                      label="End Time"
                      value={newScreening.endsAt}
                      onChange={(value) => setNewScreening({ ...newScreening, endsAt: value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    {locations.length === 1 ? (
                      <div className="space-y-2">
                        <Input
                          id="location"
                          value={locations[0]}
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">
                          Only one location available - automatically selected
                        </p>
                      </div>
                    ) : (
                      <select
                        id="location"
                        value={newScreening.location}
                        onChange={(e) => setNewScreening({ ...newScreening, location: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        required
                      >
                        <option value="">Select location...</option>
                        {locations.map((location) => (
                          <option key={location} value={location}>
                            {location}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Input
                      id="notes"
                      value={newScreening.notes}
                      onChange={(e) => setNewScreening({ ...newScreening, notes: e.target.value })}
                      placeholder="Additional notes"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isValidating}>
                      {isValidating ? 'Validating...' : 'Create Screening'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            {isAdmin && (
              <div className="ml-2">
                <Button variant="outline" onClick={clearAssignmentsInRange} title="Clear assignments in date range">
                  <Eraser className="w-4 h-4 mr-2" />
                  Clear Range
                </Button>
              </div>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Upcoming Screenings
            </CardTitle>
            <CardDescription>
              All scheduled film screenings with assignment status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Film</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Staffing Status</TableHead>
                  <TableHead>Assignments</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {screenings.map((screening) => {
                  const status = getAssignmentStatus(screening);
                  return (
                    <TableRow key={screening.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <Film className="w-4 h-4 mr-2" />
                          {screening.film.title}
                        </div>
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
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4" />
                          <span className="text-sm">
                            {screening.assignments.length} assigned
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {isAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => clearAssignmentsForScreening(
                                screening.id,
                                screening.film.title,
                                formatDateTime(new Date(screening.startsAt))
                              )}
                              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              title="Clear assignments for this screening"
                            >
                              <Eraser className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(screening)}
                            className="text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                            title="Edit screening"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAssignmentDialog(screening)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Manage assignments"
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteScreening(
                              screening.id, 
                              screening.film.title, 
                              formatDateTime(new Date(screening.startsAt))
                            )}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete screening"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {screenings.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No screenings scheduled</h3>
              <p className="text-gray-600 mb-4">
                Get started by scheduling your first film screening
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Screening
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Assignment Management Dialog */}
        <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Assignments</DialogTitle>
              <DialogDescription>
                {selectedScreening && (
                  <>
                    <strong>{selectedScreening.film.title}</strong> - {formatDateTime(new Date(selectedScreening.startsAt))}
                    <br />
                    Location: {selectedScreening.location}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            {selectedScreening && (
              <div className="space-y-6">
                {/* Current Assignments */}
                <div>
                  <h4 className="font-medium mb-4">Current Assignments</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* TECHNIEK Assignments */}
                    <div>
                      <h5 className="text-sm font-medium text-blue-600 mb-2">TECHNIEK ({selectedScreening.assignments.filter(a => a.role === 'TECHNIEK').length}/2)</h5>
                      <div className="space-y-2">
                        {selectedScreening.assignments
                          .filter(a => a.role === 'TECHNIEK')
                          .map((assignment) => (
                            <div key={assignment.id} className="flex items-center justify-between p-2 bg-blue-50 rounded-md">
                              <span className="text-sm">{assignment.user.name}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteAssignment(assignment.id)}
                                className="text-red-600 hover:text-red-700"
                                title="Remove assignment"
                              >
                                <UserMinus className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        {selectedScreening.assignments.filter(a => a.role === 'TECHNIEK').length === 0 && (
                          <p className="text-sm text-gray-500 italic">No TECHNIEK assignments</p>
                        )}
                      </div>
                    </div>

                    {/* ZAALWACHT Assignments */}
                    <div>
                      <h5 className="text-sm font-medium text-green-600 mb-2">ZAALWACHT ({selectedScreening.assignments.filter(a => a.role === 'ZAALWACHT').length}/2)</h5>
                      <div className="space-y-2">
                        {selectedScreening.assignments
                          .filter(a => a.role === 'ZAALWACHT')
                          .map((assignment) => (
                            <div key={assignment.id} className="flex items-center justify-between p-2 bg-green-50 rounded-md">
                              <span className="text-sm">{assignment.user.name}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteAssignment(assignment.id)}
                                className="text-red-600 hover:text-red-700"
                                title="Remove assignment"
                              >
                                <UserMinus className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        {selectedScreening.assignments.filter(a => a.role === 'ZAALWACHT').length === 0 && (
                          <p className="text-sm text-gray-500 italic">No ZAALWACHT assignments</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Add New Assignment */}
                <div className="border-t pt-6">
                  <h4 className="font-medium mb-4">Add New Assignment</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                      <Label htmlFor="assignment-role">Role</Label>
                      <select
                        id="assignment-role"
                        value={newAssignment.role}
                        onChange={(e) => setNewAssignment({ ...newAssignment, role: e.target.value as 'TECHNIEK' | 'ZAALWACHT' })}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="TECHNIEK">TECHNIEK</option>
                        <option value="ZAALWACHT">ZAALWACHT</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="assignment-user">Volunteer</Label>
                      <select
                        id="assignment-user"
                        value={newAssignment.userId}
                        onChange={(e) => setNewAssignment({ ...newAssignment, userId: e.target.value })}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="">Select volunteer...</option>
                        {availableUsers
                          .filter(user => user.roles.includes(newAssignment.role))
                          .map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <Button
                      onClick={handleAddAssignment}
                      disabled={!newAssignment.userId}
                      className="flex items-center"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Assignment
                    </Button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-4 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowAssignmentDialog(false)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Screening Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Screening</DialogTitle>
              <DialogDescription>Update time and location</DialogDescription>
            </DialogHeader>
            {validationErrors.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-900 mb-2">Please fix the following issues:</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <DateTimeInput
                  id="edit-startsAt"
                  label="Start Time"
                  value={editData.startsAt}
                  onChange={(value) => setEditData(prev => ({ ...prev, startsAt: value }))}
                  required
                />
                <DateTimeInput
                  id="edit-endsAt"
                  label="End Time"
                  value={editData.endsAt}
                  onChange={(value) => setEditData(prev => ({ ...prev, endsAt: value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-location">Location</Label>
                {locations.length === 1 ? (
                  <Input id="edit-location" value={locations[0]} disabled className="bg-muted" />
                ) : (
                  <select
                    id="edit-location"
                    value={editData.location}
                    onChange={(e) => setEditData(prev => ({ ...prev, location: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="">Select location...</option>
                    {locations.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveEdit} disabled={isSavingEdit}>{isSavingEdit ? 'Saving...' : 'Save Changes'}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}


