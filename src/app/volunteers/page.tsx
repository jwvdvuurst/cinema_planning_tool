'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Navbar } from '@/components/layout/navbar';
import { Plus, Edit, Trash2, User, Mail, Shield, Users, UserCheck, UserX } from 'lucide-react';
import { Role } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
  active: boolean;
  createdAt: string;
}

export default function VolunteersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    roles: [] as string[],
  });
  const { t } = useLanguage();
  const { getToken, loading: authLoading } = useAuth();

  const availableRoles: { value: string; label: string }[] = [
    { value: 'PROGRAMMA', label: 'Programma' },
    { value: 'TECHNIEK', label: 'Techniek' },
    { value: 'ZAALWACHT', label: 'Zaalwacht' },
    { value: 'ADMIN', label: 'Admin' },
  ];

  useEffect(() => {
    if (!authLoading) {
      fetchUsers();
    }
  }, [authLoading]);

  const fetchUsers = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const result = await response.json();
      if (result.success) {
        setUsers(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = await getToken();
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      
      const result = await response.json();
      if (result.success) {
        await fetchUsers();
        setIsDialogOpen(false);
        resetForm();
        alert('User created successfully!');
      } else {
        alert(`Error creating user: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      alert('Failed to create user. Please try again.');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    try {
      const token = await getToken();
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      
      const result = await response.json();
      if (result.success) {
        await fetchUsers();
        setIsDialogOpen(false);
        setEditingUser(null);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to deactivate "${userName}"? They will be marked as inactive but can be reactivated later.`)) return;
    
    try {
      const token = await getToken();
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const result = await response.json();
      if (result.success) {
        await fetchUsers();
        alert('Volunteer deactivated successfully!');
      } else {
        alert(`Error: ${result.error || 'Failed to deactivate volunteer'}`);
      }
    } catch (error) {
      console.error('Failed to deactivate user:', error);
      alert('Failed to deactivate volunteer. Please try again.');
    }
  };

  const handleReactivateUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to reactivate "${userName}"?`)) return;
    
    try {
      const token = await getToken();
      const response = await fetch(`/api/users/${userId}/reactivate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const result = await response.json();
      if (result.success) {
        await fetchUsers();
        alert('Volunteer reactivated successfully!');
      } else {
        alert(`Error: ${result.error || 'Failed to reactivate volunteer'}`);
      }
    } catch (error) {
      console.error('Failed to reactivate user:', error);
      alert('Failed to reactivate volunteer. Please try again.');
    }
  };

  const handlePermanentDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`⚠️ WARNING: Are you sure you want to PERMANENTLY DELETE "${userName}"?\n\nThis action cannot be undone and will remove all their data including assignments and availability records.\n\nType "DELETE" to confirm:`)) return;
    
    const confirmation = prompt('Type "DELETE" to confirm permanent deletion:');
    if (confirmation !== 'DELETE') {
      alert('Permanent deletion cancelled.');
      return;
    }
    
    try {
      const token = await getToken();
      const response = await fetch(`/api/users/${userId}/permanent`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const result = await response.json();
      if (result.success) {
        await fetchUsers();
        alert('Volunteer permanently deleted!');
      } else {
        alert(`Error: ${result.error || 'Failed to permanently delete volunteer'}`);
      }
    } catch (error) {
      console.error('Failed to permanently delete user:', error);
      alert('Failed to permanently delete volunteer. Please try again.');
    }
  };

  const handleResetPassword = async (userId: string, userName: string, userEmail: string) => {
    if (!confirm(`Generate and send a new password to ${userName} (${userEmail})?`)) return;
    
    try {
      const token = await getToken();
      const response = await fetch(`/api/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const result = await response.json();
      if (result.success) {
        // If email failed but password was generated, show the password
        if (result.password) {
          alert(`Password reset successfully!\n\nEmail delivery failed. Please provide this temporary password to the user:\n\n${result.password}\n\nThe user should change this password after logging in.`);
        } else {
          alert(`Password reset successfully!\n\nA new password has been sent to ${userEmail}`);
        }
      } else {
        alert(`Error: ${result.error || 'Failed to reset password'}`);
      }
    } catch (error) {
      console.error('Failed to reset password:', error);
      alert('Failed to reset password. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', roles: [] });
    setEditingUser(null);
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      roles: user.roles,
    });
    setIsDialogOpen(true);
  };

  const toggleRole = (role: string) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role]
    }));
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 text-red-800';
      case 'PROGRAMMA': return 'bg-blue-100 text-blue-800';
      case 'TECHNIEK': return 'bg-green-100 text-green-800';
      case 'ZAALWACHT': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading volunteers...</div>
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
              <h1 className="text-3xl font-bold text-gray-900">Volunteers</h1>
              <p className="mt-2 text-gray-600">
                Manage volunteer accounts and their roles
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Volunteer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingUser ? 'Edit Volunteer' : 'Add New Volunteer'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingUser 
                      ? 'Update volunteer information and roles'
                      : 'Create a new volunteer account'
                    }
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                      placeholder="Volunteer name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      required
                      placeholder="volunteer@example.com"
                    />
                  </div>
                  
                  <div>
                    <Label>Roles</Label>
                    <div className="space-y-2 mt-2">
                      {availableRoles.map(role => (
                        <div key={role.value} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={role.value}
                            checked={formData.roles.includes(role.value)}
                            onChange={() => toggleRole(role.value)}
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor={role.value} className="text-sm">
                            {role.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {editingUser && (
                    <div className="border-t pt-4 mt-4">
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">Password Management</Label>
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => handleResetPassword(editingUser.id, editingUser.name, editingUser.email)}
                        className="w-full text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Generate & Send New Password
                      </Button>
                      <p className="text-xs text-gray-500 mt-2">
                        This will generate a new random password and email it to the volunteer.
                      </p>
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingUser ? 'Update Volunteer' : 'Create Volunteer'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Volunteer List
            </CardTitle>
            <CardDescription>
              Manage all volunteer accounts and their permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium flex items-center">
                      <User className="w-4 h-4 mr-2 text-gray-400" />
                      {user.name}
                    </TableCell>
                    <TableCell className="flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-gray-400" />
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role) => (
                          <Badge key={role} className={getRoleBadgeColor(role)}>
                            {availableRoles.find(r => r.value === role)?.label || role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.active ? 'default' : 'secondary'}>
                        {user.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(user)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        
                        {user.active ? (
                          // Active user - show deactivate button
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id, user.name)}
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            title="Deactivate (can be reactivated later)"
                          >
                            <UserX className="w-4 h-4" />
                          </Button>
                        ) : (
                          // Inactive user - show reactivate button
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReactivateUser(user.id, user.name)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="Reactivate volunteer"
                          >
                            <UserCheck className="w-4 h-4" />
                          </Button>
                        )}
                        
                        {/* Permanent delete button for all users */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePermanentDeleteUser(user.id, user.name)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Permanent delete (cannot be undone)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
