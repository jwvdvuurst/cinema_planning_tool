'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettings } from '@/contexts/SettingsContext';

interface DateTimeInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
}

export function DateTimeInput({ 
  id, 
  label, 
  value, 
  onChange, 
  required = false, 
  className 
}: DateTimeInputProps) {
  const { dateFormat, timeFormat } = useSettings();
  const [localValue, setLocalValue] = useState('');

  // Convert ISO string to local datetime-local format
  const isoToLocal = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Convert local datetime-local format to ISO string
  const localToIso = (localString: string) => {
    if (!localString) return '';
    return new Date(localString).toISOString();
  };

  useEffect(() => {
    setLocalValue(isoToLocal(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLocalValue = e.target.value;
    setLocalValue(newLocalValue);
    onChange(localToIso(newLocalValue));
  };

  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="datetime-local"
        value={localValue}
        onChange={handleChange}
        required={required}
        className="mt-1"
      />
      <p className="text-xs text-muted-foreground mt-1">
        Format: {dateFormat === 'european' ? 'DD/MM/YYYY' : 'MM/DD/YYYY'} {timeFormat === '24h' ? 'HH:MM' : 'HH:MM AM/PM'}
      </p>
    </div>
  );
}
