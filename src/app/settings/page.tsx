'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Navbar } from '@/components/layout/navbar';
import { Settings, Save, RotateCcw, Mail, Plus, Pencil, Trash2 } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useScreeningConfig } from '@/contexts/ScreeningConfigContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Constraint {
  key: string;
  value: string;
}

interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  variables: string[];
}

export default function SettingsPage() {
  const [constraints, setConstraints] = useState<Constraint[]>([
    { key: 'max_shifts_per_week', value: '2' },
    { key: 'max_same_film_per_month', value: '2' },
  ]);
  const [loading, setLoading] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    key: '',
    name: '',
    subject: '',
    bodyHtml: '',
    bodyText: '',
    variables: [] as string[],
  });
  const { timeFormat, setTimeFormat, dateFormat, setDateFormat, menuLayout, setMenuLayout, locations, addLocation, removeLocation } = useSettings();
  const { config: screeningConfig, updateConfig: updateScreeningConfig } = useScreeningConfig();
  const { t } = useLanguage();

  useEffect(() => {
    fetchConstraints();
    fetchEmailTemplates();
  }, []);

  const fetchConstraints = async () => {
    // Mock data for demo
    setConstraints([
      { key: 'max_shifts_per_week', value: '2' },
      { key: 'max_same_film_per_month', value: '2' },
    ]);
  };

  const fetchEmailTemplates = async () => {
    try {
      const response = await fetch('/api/email-templates');
      const data = await response.json();
      if (data.success) {
        setEmailTemplates(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch email templates:', error);
    }
  };

  const openTemplateDialog = (template?: EmailTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateForm({
        key: template.key,
        name: template.name,
        subject: template.subject,
        bodyHtml: template.bodyHtml,
        bodyText: template.bodyText || '',
        variables: template.variables,
      });
    } else {
      setEditingTemplate(null);
      setTemplateForm({
        key: '',
        name: '',
        subject: '',
        bodyHtml: '',
        bodyText: '',
        variables: [],
      });
    }
    setShowTemplateDialog(true);
  };

  const saveTemplate = async () => {
    setLoading(true);
    try {
      const url = editingTemplate
        ? `/api/email-templates/${editingTemplate.id}`
        : '/api/email-templates';
      const method = editingTemplate ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateForm),
      });

      const data = await response.json();
      if (data.success) {
        await fetchEmailTemplates();
        setShowTemplateDialog(false);
        alert(`Template ${editingTemplate ? 'updated' : 'created'} successfully!`);
      } else {
        alert(`Failed to save template: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/email-templates/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        await fetchEmailTemplates();
        alert('Template deleted successfully!');
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert('Failed to delete template');
    } finally {
      setLoading(false);
    }
  };

  const updateConstraint = async (key: string, value: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/constraints/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      
      const data = await response.json();
      if (data.success) {
        setConstraints(prev => 
          prev.map(c => c.key === key ? { ...c, value } : c)
        );
        alert('Constraint updated successfully!');
      }
    } catch (error) {
      console.error('Failed to update constraint:', error);
      alert('Failed to update constraint');
    } finally {
      setLoading(false);
    }
  };

  const getConstraintDescription = (key: string) => {
    switch (key) {
      case 'max_shifts_per_week':
        return 'Maximum number of shifts a volunteer can be assigned per week';
      case 'max_same_film_per_month':
        return 'Maximum number of times a volunteer can be assigned to the same film per month';
      default:
        return 'Constraint setting';
    }
  };

  const getConstraintLabel = (key: string) => {
    switch (key) {
      case 'max_shifts_per_week':
        return 'Max Shifts Per Week';
      case 'max_same_film_per_month':
        return 'Max Same Film Per Month';
      default:
        return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  return (
    <div>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">
            Configure system constraints and preferences
          </p>
        </div>

        <div className="space-y-8">
          {/* Display Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Display Preferences
              </CardTitle>
              <CardDescription>
                Customize how dates and times are displayed throughout the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="time-format">Time Format</Label>
                  <Select value={timeFormat} onValueChange={(value: '12h' | '24h') => setTimeFormat(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24h">24-hour format (14:30)</SelectItem>
                      <SelectItem value="12h">12-hour format (2:30 PM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="date-format">Date Format</Label>
                  <Select value={dateFormat} onValueChange={(value: 'european' | 'american') => setDateFormat(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select date format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="european">European (DD/MM/YYYY)</SelectItem>
                      <SelectItem value="american">American (MM/DD/YYYY)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="menu-layout">{t('settings.menuLayout')}</Label>
                  <Select value={menuLayout} onValueChange={(value: 'icon-text' | 'icon-text-below' | 'icon-only') => setMenuLayout(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select menu layout" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="icon-text">{t('settings.menuLayout.iconText')}</SelectItem>
                      <SelectItem value="icon-text-below">{t('settings.menuLayout.iconTextBelow')}</SelectItem>
                      <SelectItem value="icon-only">{t('settings.menuLayout.iconOnly')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Preview:</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>Date:</strong> {new Date().toLocaleDateString(dateFormat === 'european' ? 'en-GB' : 'en-US')}</p>
                  <p><strong>Time:</strong> {new Date().toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    hour12: timeFormat === '12h' 
                  })}</p>
                  <p><strong>Menu Layout:</strong> {
                    menuLayout === 'icon-text' ? 'Icon + Text' :
                    menuLayout === 'icon-text-below' ? 'Icon with Text Below' :
                    'Icon Only'
                  }</p>
                </div>
              </div>
            </CardContent>
          </Card>

              {/* Screening Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="w-5 h-5 mr-2" />
                    Screening Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure automatic end-time calculation for screenings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="trailer-length">Average Trailer Length (minutes)</Label>
                      <Input
                        id="trailer-length"
                        type="number"
                        min="0"
                        max="60"
                        value={screeningConfig.trailerLength}
                        onChange={(e) => updateScreeningConfig({ trailerLength: parseInt(e.target.value) || 0 })}
                      />
                      <p className="text-xs text-muted-foreground">Time added for trailers and previews</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="break-condition">Break Condition (minutes)</Label>
                      <Input
                        id="break-condition"
                        type="number"
                        min="0"
                        max="300"
                        value={screeningConfig.breakCondition}
                        onChange={(e) => updateScreeningConfig({ breakCondition: parseInt(e.target.value) || 0 })}
                      />
                      <p className="text-xs text-muted-foreground">Movies longer than this get a break</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="break-length">Break Length (minutes)</Label>
                      <Input
                        id="break-length"
                        type="number"
                        min="0"
                        max="60"
                        value={screeningConfig.breakLength}
                        onChange={(e) => updateScreeningConfig({ breakLength: parseInt(e.target.value) || 0 })}
                        disabled={!screeningConfig.useBreaks}
                      />
                      <p className="text-xs text-muted-foreground">Length of intermission break</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="use-breaks">Use Breaks</Label>
                      <Select 
                        value={screeningConfig.useBreaks ? 'true' : 'false'} 
                        onValueChange={(value) => updateScreeningConfig({ useBreaks: value === 'true' })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Calculation Preview</h4>
                    <p className="text-sm text-blue-700">
                      End time = Start time + Film runtime + Trailer time ({screeningConfig.trailerLength} min)
                      {screeningConfig.useBreaks && ` + Break time (${screeningConfig.breakLength} min for films > ${screeningConfig.breakCondition} min)`}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Cinema Locations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="w-5 h-5 mr-2" />
                    Cinema Locations
                  </CardTitle>
                  <CardDescription>
                    Manage available cinema locations for screenings
                  </CardDescription>
                </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Input
                    id="new-location"
                    placeholder="Add new location (e.g., Zaal 3)"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addLocation(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <Button
                    onClick={(e) => {
                      const input = (e.target as HTMLElement).parentElement?.querySelector('input') as HTMLInputElement;
                      if (input) {
                        addLocation(input.value);
                        input.value = '';
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label>Available Locations ({locations.length})</Label>
                  <div className="flex flex-wrap gap-2">
                    {locations.map((location) => (
                      <div
                        key={location}
                        className="flex items-center space-x-2 bg-muted px-3 py-1 rounded-md"
                      >
                        <span className="text-sm">{location}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLocation(location)}
                          className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {locations.length === 1 && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Auto-fill Enabled</h4>
                    <p className="text-sm text-blue-700">
                      Since you have only one location ({locations[0]}), it will be automatically selected 
                      when creating new screenings.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Planning Constraints */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Planning Constraints
              </CardTitle>
              <CardDescription>
                Configure the constraints used by the automatic planner
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {constraints.map((constraint) => (
                <div key={constraint.key} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="md:col-span-2">
                    <Label htmlFor={constraint.key}>
                      {getConstraintLabel(constraint.key)}
                    </Label>
                    <p className="text-sm text-gray-600 mt-1">
                      {getConstraintDescription(constraint.key)}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Input
                      id={constraint.key}
                      type="number"
                      min="0"
                      value={constraint.value}
                      onChange={(e) => {
                        setConstraints(prev => 
                          prev.map(c => c.key === constraint.key ? { ...c, value: e.target.value } : c)
                        );
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => updateConstraint(constraint.key, constraint.value)}
                      disabled={loading}
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* System Settings */}
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>
                General system configuration options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Account Security</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Update your password and manage your account security
                  </p>
                  <Link href="/settings/change-password">
                    <Button variant="outline" size="sm">
                      Change Password
                    </Button>
                  </Link>
                </div>
              
                <div>
                  <h4 className="font-medium mb-2">Email Notifications</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Configure email notifications for assignments and updates
                  </p>
                  <Button variant="outline" size="sm">
                    Configure Notifications
                  </Button>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Export Settings</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Configure export formats and schedules
                  </p>
                  <Button variant="outline" size="sm">
                    Configure Exports
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>
                Manage system data and perform maintenance tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset Planner Data
                </Button>
                <Button variant="outline">
                  Export All Data
                </Button>
                <Button variant="outline">
                  Backup Database
                </Button>
                <Button variant="destructive">
                  Clear All Assignments
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Email Templates (Admin Only) */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Mail className="w-5 h-5 mr-2" />
                    Email Templates
                  </CardTitle>
                  <CardDescription>
                    Manage email templates for notifications and requests
                  </CardDescription>
                </div>
                <Button onClick={() => openTemplateDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {emailTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium">{template.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Key: <code className="bg-gray-100 px-1 py-0.5 rounded">{template.key}</code>
                      </p>
                      <p className="text-sm text-gray-600">
                        Subject: {template.subject}
                      </p>
                      {template.variables.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          Variables: {template.variables.join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openTemplateDialog(template)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteTemplate(template.id)}
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {emailTemplates.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No email templates configured. Click "Add Template" to create one.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* User Management */}
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage user accounts and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Active Users</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    View and manage user accounts, roles, and permissions
                  </p>
                  <Link href="/volunteers">
                    <Button variant="outline" size="sm">
                      Manage Users
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Email Template Dialog */}
        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Edit Email Template' : 'Create Email Template'}
              </DialogTitle>
              <DialogDescription>
                Configure email templates with variables like {'{userName}'}, {'{filmTitle}'}, etc.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="template-key">Template Key</Label>
                <Input
                  id="template-key"
                  value={templateForm.key}
                  onChange={(e) => setTemplateForm({ ...templateForm, key: e.target.value })}
                  placeholder="e.g., availability_request"
                  disabled={!!editingTemplate}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Unique identifier for this template (cannot be changed after creation)
                </p>
              </div>
              <div>
                <Label htmlFor="template-name">Name</Label>
                <Input
                  id="template-name"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  placeholder="e.g., Availability Request Email"
                />
              </div>
              <div>
                <Label htmlFor="template-subject">Subject</Label>
                <Input
                  id="template-subject"
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                  placeholder="e.g., Availability Request for {filmTitle}"
                />
              </div>
              <div>
                <Label htmlFor="template-html">HTML Body</Label>
                <textarea
                  id="template-html"
                  value={templateForm.bodyHtml}
                  onChange={(e) => setTemplateForm({ ...templateForm, bodyHtml: e.target.value })}
                  className="w-full min-h-[200px] p-2 border rounded-md font-mono text-sm"
                  placeholder="<p>Hello {userName},</p>..."
                />
              </div>
              <div>
                <Label htmlFor="template-text">Plain Text Body (Optional)</Label>
                <textarea
                  id="template-text"
                  value={templateForm.bodyText}
                  onChange={(e) => setTemplateForm({ ...templateForm, bodyText: e.target.value })}
                  className="w-full min-h-[100px] p-2 border rounded-md font-mono text-sm"
                  placeholder="Hello {userName}..."
                />
              </div>
              <div>
                <Label htmlFor="template-variables">Available Variables (comma-separated)</Label>
                <Input
                  id="template-variables"
                  value={templateForm.variables.join(', ')}
                  onChange={(e) => setTemplateForm({ 
                    ...templateForm, 
                    variables: e.target.value.split(',').map(v => v.trim()).filter(Boolean) 
                  })}
                  placeholder="userName, filmTitle, startsAt, location"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Document which variables this template uses
                </p>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={saveTemplate} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Template'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

