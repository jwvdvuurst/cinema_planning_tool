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
import { formatDate } from '@/lib/utils';
import { Plus, Film, Calendar, Trash2, Archive, RotateCcw, Edit } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

interface Film {
  id: string;
  title: string;
  notes?: string;
  runtime?: number;
  archived?: boolean;
  createdAt: string;
  screenings: Array<{
    id: string;
    startsAt: string;
    location?: string;
  }>;
}

export default function FilmsPage() {
  const [films, setFilms] = useState<Film[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newFilm, setNewFilm] = useState({ title: '', notes: '', runtime: '' });
  const [showArchived, setShowArchived] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingFilm, setEditingFilm] = useState<Film | null>(null);
  const [editFilm, setEditFilm] = useState({ title: '', notes: '', runtime: '' });
  const { t } = useLanguage();
  const { getToken, loading: authLoading } = useAuth();

  useEffect(() => {
    // Wait for auth to be ready before fetching
    if (!authLoading) {
      fetchFilms();
    }
  }, [showArchived, authLoading]);

  const fetchFilms = async () => {
    try {
      const url = showArchived ? '/api/films?includeArchived=true' : '/api/films';
      const token = await getToken();
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setFilms(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch films:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFilm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const filmData = {
        ...newFilm,
        runtime: newFilm.runtime ? parseInt(newFilm.runtime) : undefined,
      };
      
      const token = await getToken();
      const response = await fetch('/api/films', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(filmData),
      });
      
      const data = await response.json();
      if (data.success) {
        setFilms(prevFilms => [data.data, ...prevFilms]);
        setNewFilm({ title: '', notes: '', runtime: '' });
        setIsDialogOpen(false);
        alert('Film created successfully!');
      } else {
        alert(`Error creating film: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to create film:', error);
      alert('Failed to create film. Please try again.');
    }
  };

  const handleArchiveFilm = async (filmId: string, filmTitle: string) => {
    if (!confirm(`Are you sure you want to archive "${filmTitle}"? It will be hidden from the main list but can be restored later.`)) {
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch(`/api/films/${filmId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchFilms(); // Refresh the list
        alert('Film archived successfully!');
      } else {
        alert(`Error archiving film: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to archive film:', error);
      alert('Failed to archive film. Please try again.');
    }
  };

  const handleRestoreFilm = async (filmId: string, filmTitle: string) => {
    if (!confirm(`Are you sure you want to restore "${filmTitle}"?`)) {
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch(`/api/films/${filmId}/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchFilms(); // Refresh the list
        alert('Film restored successfully!');
      } else {
        alert(`Error restoring film: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to restore film:', error);
      alert('Failed to restore film. Please try again.');
    }
  };

  const handleEditFilm = (film: Film) => {
    setEditingFilm(film);
    setEditFilm({
      title: film.title,
      notes: film.notes || '',
      runtime: film.runtime?.toString() || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateFilm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFilm) return;

    try {
      const filmData = {
        ...editFilm,
        runtime: editFilm.runtime ? parseInt(editFilm.runtime) : undefined,
      };

      const token = await getToken();
      const response = await fetch(`/api/films/${editingFilm.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(filmData),
      });

      const data = await response.json();
      if (data.success) {
        await fetchFilms(); // Refresh the list
        setIsEditDialogOpen(false);
        setEditingFilm(null);
        setEditFilm({ title: '', notes: '', runtime: '' });
        alert('Film updated successfully!');
      } else {
        alert(`Error updating film: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to update film:', error);
      alert('Failed to update film. Please try again.');
    }
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">Loading films...</div>
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
              <h1 className="text-3xl font-bold text-gray-900">Films</h1>
              <p className="mt-2 text-gray-600">
                Manage the film library
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => setShowArchived(!showArchived)}
                className={showArchived ? 'bg-orange-50 border-orange-200' : ''}
              >
                <Archive className="w-4 h-4 mr-2" />
                {showArchived ? 'Hide Archived' : 'Show Archived'}
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Film
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Film</DialogTitle>
                  <DialogDescription>
                    Add a new film to the library
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateFilm} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={newFilm.title}
                      onChange={(e) => setNewFilm({ ...newFilm, title: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="runtime">Runtime (minutes, optional)</Label>
                    <Input
                      id="runtime"
                      type="number"
                      min="1"
                      value={newFilm.runtime}
                      onChange={(e) => setNewFilm({ ...newFilm, runtime: e.target.value })}
                      placeholder="e.g., 120"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Input
                      id="notes"
                      value={newFilm.notes}
                      onChange={(e) => setNewFilm({ ...newFilm, notes: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Create Film</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {films.map((film) => (
            <Card key={film.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Film className="w-5 h-5 mr-2" />
                      {film.title}
                      {film.archived && (
                        <Badge variant="outline" className="ml-2 text-orange-600 border-orange-200">
                          Archived
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      Added {formatDate(new Date(film.createdAt))}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    {!film.archived && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditFilm(film)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="Edit film"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    {film.archived ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestoreFilm(film.id, film.title)}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        title="Restore film"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleArchiveFilm(film.id, film.title)}
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        title="Archive film"
                      >
                        <Archive className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {film.runtime && (
                  <p className="text-sm text-blue-600 mb-2">Runtime: {film.runtime} minutes</p>
                )}
                {film.notes && (
                  <p className="text-sm text-gray-600 mb-4">{film.notes}</p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span className="text-sm">
                      {film.screenings?.length || 0} screening{(film.screenings?.length || 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <Badge variant="secondary">
                    {(film.screenings?.length || 0) > 0 ? 'Scheduled' : 'Available'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {films.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Film className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No films yet</h3>
              <p className="text-gray-600 mb-4">
                Get started by adding your first film to the library
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Film
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Film Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Film</DialogTitle>
            <DialogDescription>
              Update the film details
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateFilm}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editFilm.title}
                  onChange={(e) => setEditFilm({ ...editFilm, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-notes">Notes</Label>
                <Input
                  id="edit-notes"
                  value={editFilm.notes}
                  onChange={(e) => setEditFilm({ ...editFilm, notes: e.target.value })}
                  placeholder="Optional notes about the film"
                />
              </div>
              <div>
                <Label htmlFor="edit-runtime">Runtime (minutes, optional)</Label>
                <Input
                  id="edit-runtime"
                  type="number"
                  min="1"
                  value={editFilm.runtime}
                  onChange={(e) => setEditFilm({ ...editFilm, runtime: e.target.value })}
                  placeholder="e.g., 120"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Film</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

