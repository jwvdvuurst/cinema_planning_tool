'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Navbar } from '@/components/layout/navbar';
import { formatDateTime } from '@/lib/utils';
import { RotateCcw, User, Clock, CheckCircle, XCircle } from 'lucide-react';

interface Assignment {
  id: string;
  screening: {
    id: string;
    startsAt: string;
    film: {
      title: string;
    };
  };
  role: string;
}

interface SwapRequest {
  id: string;
  assignment: {
    id: string;
    screening: {
      startsAt: string;
      film: {
        title: string;
      };
    };
    role: string;
    user: {
      name: string;
    };
  };
  status: string;
  createdAt: string;
}

export default function SwapsPage() {
  const [myAssignments, setMyAssignments] = useState<Assignment[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<SwapRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Mock data for demo
      setMyAssignments([
        {
          id: '1',
          screening: {
            id: 's1',
            startsAt: '2024-01-15T19:00:00Z',
            film: { title: 'Cinema Paradiso' },
          },
          role: 'TECHNIEK',
        },
        {
          id: '2',
          screening: {
            id: 's2',
            startsAt: '2024-01-18T20:00:00Z',
            film: { title: 'The Godfather' },
          },
          role: 'ZAALWACHT',
        },
      ]);

      setIncomingRequests([
        {
          id: 'sr1',
          assignment: {
            id: 'a1',
            screening: {
              startsAt: '2024-01-16T19:00:00Z',
              film: { title: 'Pulp Fiction' },
            },
            role: 'TECHNIEK',
            user: { name: 'Alice' },
          },
          status: 'open',
          createdAt: '2024-01-10T10:00:00Z',
        },
      ]);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestSwap = async (assignmentId: string) => {
    try {
      const response = await fetch('/api/swaps/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId }),
      });
      
      const data = await response.json();
      if (data.success) {
        alert('Swap request sent successfully!');
      }
    } catch (error) {
      console.error('Failed to request swap:', error);
    }
  };

  const respondToSwap = async (swapRequestId: string, action: 'accept' | 'reject') => {
    try {
      const endpoint = action === 'accept' ? '/api/swaps/accept' : '/api/swaps/reject';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ swapRequestId }),
      });
      
      const data = await response.json();
      if (data.success) {
        // Update local state
        setIncomingRequests(prev => 
          prev.map(req => 
            req.id === swapRequestId 
              ? { ...req, status: action === 'accept' ? 'accepted' : 'rejected' }
              : req
          )
        );
        alert(`Swap request ${action}ed successfully!`);
      }
    } catch (error) {
      console.error(`Failed to ${action} swap:`, error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="warning">Open</Badge>;
      case 'accepted':
        return <Badge variant="success">Accepted</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">Loading swaps...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Swap Requests</h1>
          <p className="mt-2 text-gray-600">
            Manage assignment swaps and requests
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* My Assignments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                My Assignments
              </CardTitle>
              <CardDescription>
                Request swaps for your assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Film</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        {assignment.screening.film.title}
                      </TableCell>
                      <TableCell>
                        {formatDateTime(new Date(assignment.screening.startsAt))}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{assignment.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => requestSwap(assignment.id)}
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Request Swap
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Incoming Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Incoming Requests
              </CardTitle>
              <CardDescription>
                Respond to swap requests from other volunteers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Film</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomingRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {request.assignment.screening.film.title}
                      </TableCell>
                      <TableCell>
                        {formatDateTime(new Date(request.assignment.screening.startsAt))}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{request.assignment.role}</Badge>
                      </TableCell>
                      <TableCell>
                        {request.assignment.user.name}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(request.status)}
                      </TableCell>
                      <TableCell>
                        {request.status === 'open' && (
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => respondToSwap(request.id, 'accept')}
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => respondToSwap(request.id, 'reject')}
                              className="text-red-600 hover:text-red-700"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Swap Configuration */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Swap Configuration</CardTitle>
            <CardDescription>
              Configure swap approval requirements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Swap Approval</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Currently, swaps require approval from the assigned volunteer.
                </p>
                <Badge variant="secondary">Approval Required</Badge>
              </div>
              <div>
                <h4 className="font-medium mb-2">Auto-Approval</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Enable automatic approval for certain conditions.
                </p>
                <Button variant="outline" size="sm">
                  Configure Auto-Approval
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

