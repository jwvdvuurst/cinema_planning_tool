'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface SettingsContextType {
  timeFormat: '12h' | '24h';
  setTimeFormat: (format: '12h' | '24h') => void;
  dateFormat: 'european' | 'american';
  setDateFormat: (format: 'european' | 'american') => void;
  menuLayout: 'icon-text' | 'icon-text-below' | 'icon-only';
  setMenuLayout: (layout: 'icon-text' | 'icon-text-below' | 'icon-only') => void;
  locations: string[];
  setLocations: (locations: string[]) => void;
  addLocation: (location: string) => void;
  removeLocation: (location: string) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [timeFormat, setTimeFormatState] = useState<'12h' | '24h'>('24h');
  const [dateFormat, setDateFormatState] = useState<'european' | 'american'>('european');
  const [menuLayout, setMenuLayoutState] = useState<'icon-text' | 'icon-text-below' | 'icon-only'>('icon-text');
  const [locations, setLocationsState] = useState<string[]>(['Zaal 1', 'Zaal 2']);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedTimeFormat = localStorage.getItem('timeFormat') as '12h' | '24h' | null;
    const savedDateFormat = localStorage.getItem('dateFormat') as 'european' | 'american' | null;
    const savedMenuLayout = localStorage.getItem('menuLayout') as 'icon-text' | 'icon-text-below' | 'icon-only' | null;
    const savedLocations = localStorage.getItem('cinemaLocations');
    
    if (savedTimeFormat) {
      setTimeFormatState(savedTimeFormat);
    }
    if (savedDateFormat) {
      setDateFormatState(savedDateFormat);
    }
    if (savedMenuLayout) {
      setMenuLayoutState(savedMenuLayout);
    }
    if (savedLocations) {
      setLocationsState(JSON.parse(savedLocations));
    }
  }, []);

  const setTimeFormat = (format: '12h' | '24h') => {
    setTimeFormatState(format);
    localStorage.setItem('timeFormat', format);
  };

  const setDateFormat = (format: 'european' | 'american') => {
    setDateFormatState(format);
    localStorage.setItem('dateFormat', format);
  };

  const setMenuLayout = (layout: 'icon-text' | 'icon-text-below' | 'icon-only') => {
    setMenuLayoutState(layout);
    localStorage.setItem('menuLayout', layout);
  };

  const setLocations = (locations: string[]) => {
    setLocationsState(locations);
    localStorage.setItem('cinemaLocations', JSON.stringify(locations));
  };

  const addLocation = (location: string) => {
    if (location.trim() && !locations.includes(location.trim())) {
      const newLocations = [...locations, location.trim()];
      setLocations(newLocations);
    }
  };

  const removeLocation = (location: string) => {
    const newLocations = locations.filter(l => l !== location);
    setLocations(newLocations);
  };

  return (
    <SettingsContext.Provider value={{
      timeFormat,
      setTimeFormat,
      dateFormat,
      setDateFormat,
      menuLayout,
      setMenuLayout,
      locations,
      setLocations,
      addLocation,
      removeLocation,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
