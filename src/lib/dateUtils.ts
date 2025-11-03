import { useSettings } from '@/contexts/SettingsContext';

// Hook for date/time formatting with current settings
export function useDateTimeFormat() {
  const { timeFormat, dateFormat } = useSettings();

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: timeFormat === '12h',
    };
    return d.toLocaleTimeString('en-US', options);
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    };
    
    if (dateFormat === 'european') {
      // European format: DD/MM/YYYY
      return d.toLocaleDateString('en-GB', options);
    } else {
      // American format: MM/DD/YYYY
      return d.toLocaleDateString('en-US', options);
    }
  };

  const formatDateTime = (date: Date | string) => {
    return `${formatDate(date)} ${formatTime(date)}`;
  };

  const formatDateShort = (date: Date | string) => {
    const d = new Date(date);
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
    };
    return d.toLocaleDateString('en-US', options);
  };

  const formatTimeShort = (date: Date | string) => {
    const d = new Date(date);
    const options: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: timeFormat === '12h',
    };
    return d.toLocaleTimeString('en-US', options);
  };

  return {
    formatTime,
    formatDate,
    formatDateTime,
    formatDateShort,
    formatTimeShort,
    timeFormat,
    dateFormat,
  };
}

// Utility functions that don't require the hook (for server-side use)
export function formatTimeStatic(date: Date | string, use24Hour: boolean = true) {
  const d = new Date(date);
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !use24Hour,
  };
  return d.toLocaleTimeString('en-US', options);
}

export function formatDateEuropean(date: Date | string) {
  const d = new Date(date);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  return d.toLocaleDateString('en-GB', options);
}

export function formatDateTimeEuropean(date: Date | string, use24Hour: boolean = true) {
  return `${formatDateEuropean(date)} ${formatTimeStatic(date, use24Hour)}`;
}
