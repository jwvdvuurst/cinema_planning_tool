'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Navbar } from '@/components/layout/navbar';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, Users, X } from 'lucide-react';
import { useDateTimeFormat } from '@/lib/dateUtils';
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
  assignments: Array<{
    role: string;
    user: {
      id: string;
      name: string;
    };
  }>;
}

interface CalendarDay {
  date: Date;
  screenings: Screening[];
  isCurrentMonth: boolean;
  isToday: boolean;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'month' | 'week'>('month');
  const [selectedScreening, setSelectedScreening] = useState<Screening | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { formatDateTime, formatDate } = useDateTimeFormat();
  const { t } = useLanguage();
  const { user } = useAuth();

  useEffect(() => {
    fetchScreenings();
  }, [currentDate]);

  const fetchScreenings = async () => {
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const response = await fetch(`/api/screenings?start=${startOfMonth.toISOString()}&end=${endOfMonth.toISOString()}`);
      const data = await response.json();
      if (data.success) {
        setScreenings(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch screenings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCalendarDays = (): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days: CalendarDay[] = [];
    const current = new Date(startDate);
    
    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      const dayScreenings = screenings.filter(screening => {
        const screeningDate = new Date(screening.startsAt);
        return screeningDate.toDateString() === current.toDateString();
      });
      
      days.push({
        date: new Date(current),
        screenings: dayScreenings,
        isCurrentMonth: current.getMonth() === month,
        isToday: current.toDateString() === new Date().toDateString(),
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getAssignmentStatus = (screening: Screening) => {
    const assignments = screening.assignments;
    const techAssignments = assignments.filter(a => a.role === 'TECHNIEK').length;
    const zaalAssignments = assignments.filter(a => a.role === 'ZAALWACHT').length;
    
    const techComplete = techAssignments >= 2;
    const zaalComplete = zaalAssignments >= 2;
    
    if (techComplete && zaalComplete) {
      return { status: 'complete', color: 'success' as const };
    } else if (techAssignments > 0 || zaalAssignments > 0) {
      return { status: 'partial', color: 'warning' as const };
    } else {
      return { status: 'missing', color: 'destructive' as const };
    }
  };

  const isUserAssigned = (screening: Screening) => {
    if (!user) return false;
    return screening.assignments.some(assignment => assignment.user.id === user.id);
  };

  const handleScreeningClick = (screening: Screening) => {
    setSelectedScreening(screening);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedScreening(null);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">{t('common.loading')}</div>
        </div>
      </div>
    );
  }

  const calendarDays = getCalendarDays();

  return (
    <div>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('calendar.title')}</h1>
              <p className="mt-2 text-gray-600">
                {t('calendar.subtitle')}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <Button
                  variant={view === 'month' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('month')}
                >
                  {t('common.month')}
                </Button>
                <Button
                  variant={view === 'week' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('week')}
                >
                  {t('common.week')}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <h2 className="text-xl font-semibold">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentDate(new Date())}
              >
                {t('common.today')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {view === 'month' ? (
              <div className="grid grid-cols-7 gap-px bg-gray-200">
                {/* Day headers */}
                {dayNames.map(day => (
                  <div key={day} className="bg-gray-50 p-2 text-center text-sm font-medium text-gray-700">
                    {day}
                  </div>
                ))}
                
                {/* Calendar days */}
                {calendarDays.map((day, index) => (
                  <div
                    key={index}
                    className={`bg-white p-2 min-h-[120px] ${
                      !day.isCurrentMonth ? 'text-gray-400' : ''
                    } ${day.isToday ? 'bg-blue-50 border-2 border-blue-200' : ''}`}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      day.isToday ? 'text-blue-600' : ''
                    }`}>
                      {day.date.getDate()}
                    </div>
                    
                    <div className="space-y-1">
                      {day.screenings.slice(0, 3).map(screening => {
                        const status = getAssignmentStatus(screening);
                        const userAssigned = isUserAssigned(screening);
                        return (
                          <div
                            key={screening.id}
                            className={`text-xs p-1 rounded cursor-pointer hover:bg-gray-100 transition-colors ${
                              status.color === 'success' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                              status.color === 'warning' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' :
                              'bg-red-100 text-red-800 hover:bg-red-200'
                            } ${userAssigned ? 'border-2 border-blue-500 shadow-sm' : ''}`}
                            title={`${screening.film.title} - ${formatDateTime(new Date(screening.startsAt))}${userAssigned ? ' (You are assigned)' : ''}`}
                            onClick={() => handleScreeningClick(screening)}
                          >
                            <div className="font-medium truncate">{screening.film.title}</div>
                            <div className="text-xs opacity-75">
                              {new Date(screening.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        );
                      })}
                      {day.screenings.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{day.screenings.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {screenings.map(screening => {
                  const status = getAssignmentStatus(screening);
                  const userAssigned = isUserAssigned(screening);
                  return (
                    <div key={screening.id} className={`border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors ${userAssigned ? 'border-2 border-blue-500 shadow-sm' : ''}`} onClick={() => handleScreeningClick(screening)}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{screening.film.title}</h3>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                            <div className="flex items-center">
                              <CalendarIcon className="w-4 h-4 mr-1" />
                              {formatDate(new Date(screening.startsAt))}
                            </div>
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {new Date(screening.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(screening.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-1" />
                              {screening.location || 'TBD'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {userAssigned && (
                            <Badge variant="outline" className="border-blue-500 text-blue-600">
                              You're assigned
                            </Badge>
                          )}
                          <Badge variant={status.color}>
                            {status.status === 'complete' ? 'Complete' :
                             status.status === 'partial' ? 'Partial' : 'Missing'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium text-sm text-gray-700 mb-2">TECHNIEK</h4>
                          <div className="space-y-1">
                            {screening.assignments
                              .filter(a => a.role === 'TECHNIEK')
                              .map((assignment, idx) => (
                                <div key={idx} className={`flex items-center text-sm ${assignment.user.id === user?.id ? 'font-semibold text-blue-600' : ''}`}>
                                  <Users className="w-4 h-4 mr-2 text-gray-400" />
                                  {assignment.user.name}
                                  {assignment.user.id === user?.id && <span className="ml-1 text-xs">(You)</span>}
                                </div>
                              ))}
                            {screening.assignments.filter(a => a.role === 'TECHNIEK').length === 0 && (
                              <div className="text-sm text-gray-500">Not assigned</div>
                            )}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm text-gray-700 mb-2">ZAALWACHT</h4>
                          <div className="space-y-1">
                            {screening.assignments
                              .filter(a => a.role === 'ZAALWACHT')
                              .map((assignment, idx) => (
                                <div key={idx} className={`flex items-center text-sm ${assignment.user.id === user?.id ? 'font-semibold text-blue-600' : ''}`}>
                                  <Users className="w-4 h-4 mr-2 text-gray-400" />
                                  {assignment.user.name}
                                  {assignment.user.id === user?.id && <span className="ml-1 text-xs">(You)</span>}
                                </div>
                              ))}
                            {screening.assignments.filter(a => a.role === 'ZAALWACHT').length === 0 && (
                              <div className="text-sm text-gray-500">Not assigned</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Screening Details Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{t('calendar.screeningDetails')}</span>
                <Button variant="ghost" size="sm" onClick={closeModal}>
                  <X className="w-4 h-4" />
                </Button>
              </DialogTitle>
              <DialogDescription>
                {t('calendar.detailedInformation')}
              </DialogDescription>
            </DialogHeader>
            
            {selectedScreening && (
              <div className="space-y-6">
                {/* Film Title and Status */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedScreening.film.title}</h2>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                      <div className="flex items-center">
                        <CalendarIcon className="w-4 h-4 mr-1" />
                        {formatDate(new Date(selectedScreening.startsAt))}
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {new Date(selectedScreening.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedScreening.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {selectedScreening.location || 'TBD'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isUserAssigned(selectedScreening) && (
                      <Badge variant="outline" className="border-blue-500 text-blue-600">
                        You're assigned
                      </Badge>
                    )}
                    <Badge variant={getAssignmentStatus(selectedScreening).color}>
                      {getAssignmentStatus(selectedScreening).status === 'complete' ? t('calendar.complete') :
                       getAssignmentStatus(selectedScreening).status === 'partial' ? t('calendar.partial') : t('calendar.missing')}
                    </Badge>
                  </div>
                </div>

                {/* Duration */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">{t('calendar.duration')}</h3>
                  <p className="text-gray-600">
                    {Math.round((new Date(selectedScreening.endsAt).getTime() - new Date(selectedScreening.startsAt).getTime()) / (1000 * 60))} {t('calendar.minutes')}
                  </p>
                </div>

                {/* Assignments */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      {t('role.techniek')} {t('calendar.volunteers')}
                    </h3>
                    <div className="space-y-2">
                      {selectedScreening.assignments
                        .filter(a => a.role === 'TECHNIEK')
                        .map((assignment, idx) => (
                          <div key={idx} className={`flex items-center text-sm bg-white p-2 rounded ${assignment.user.id === user?.id ? 'border border-blue-300 bg-blue-50' : ''}`}>
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                            {assignment.user.name}
                            {assignment.user.id === user?.id && <span className="ml-2 text-xs font-medium text-blue-600">(You)</span>}
                          </div>
                        ))}
                      {selectedScreening.assignments.filter(a => a.role === 'TECHNIEK').length === 0 && (
                        <div className="text-sm text-gray-500 bg-white p-2 rounded">{t('calendar.noVolunteersAssigned')}</div>
                      )}
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-green-900 mb-3 flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      {t('role.zaalwacht')} {t('calendar.volunteers')}
                    </h3>
                    <div className="space-y-2">
                      {selectedScreening.assignments
                        .filter(a => a.role === 'ZAALWACHT')
                        .map((assignment, idx) => (
                          <div key={idx} className={`flex items-center text-sm bg-white p-2 rounded ${assignment.user.id === user?.id ? 'border border-blue-300 bg-blue-50' : ''}`}>
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                            {assignment.user.name}
                            {assignment.user.id === user?.id && <span className="ml-2 text-xs font-medium text-blue-600">(You)</span>}
                          </div>
                        ))}
                      {selectedScreening.assignments.filter(a => a.role === 'ZAALWACHT').length === 0 && (
                        <div className="text-sm text-gray-500 bg-white p-2 rounded">{t('calendar.noVolunteersAssigned')}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">{t('calendar.assignmentSummary')}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">{t('role.techniek')}:</span>
                      <span className="ml-2 font-medium">
                        {selectedScreening.assignments.filter(a => a.role === 'TECHNIEK').length}/2
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">{t('role.zaalwacht')}:</span>
                      <span className="ml-2 font-medium">
                        {selectedScreening.assignments.filter(a => a.role === 'ZAALWACHT').length}/2
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
