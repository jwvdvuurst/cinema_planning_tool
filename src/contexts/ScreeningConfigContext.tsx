'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ScreeningConfig {
  trailerLength: number; // Average trailer length in minutes
  useBreaks: boolean;
  breakCondition: number; // Movies longer than this get a break (in minutes)
  breakLength: number; // Break length in minutes
}

interface ScreeningConfigContextType {
  config: ScreeningConfig;
  updateConfig: (newConfig: Partial<ScreeningConfig>) => void;
  calculateEndTime: (startTime: Date, runtime?: number) => Date;
}

const defaultConfig: ScreeningConfig = {
  trailerLength: 15, // 15 minutes of trailers
  useBreaks: true,
  breakCondition: 100, // Movies longer than 100 minutes get a break
  breakLength: 10, // 10 minute break
};

const ScreeningConfigContext = createContext<ScreeningConfigContextType | undefined>(undefined);

export function ScreeningConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ScreeningConfig>(defaultConfig);

  // Load config from localStorage on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('screeningConfig');
    if (savedConfig) {
      try {
        setConfig({ ...defaultConfig, ...JSON.parse(savedConfig) });
      } catch (error) {
        console.error('Failed to parse screening config:', error);
      }
    }
  }, []);

  const updateConfig = (newConfig: Partial<ScreeningConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    localStorage.setItem('screeningConfig', JSON.stringify(updatedConfig));
  };

  const calculateEndTime = (startTime: Date, runtime?: number): Date => {
    if (!runtime) return startTime; // Can't calculate without runtime

    let totalMinutes = runtime; // Film runtime
    
    // Add trailer time
    totalMinutes += config.trailerLength;
    
    // Add break if needed
    if (config.useBreaks && runtime > config.breakCondition) {
      totalMinutes += config.breakLength;
    }

    // Create end time
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + totalMinutes);
    
    return endTime;
  };

  return (
    <ScreeningConfigContext.Provider value={{
      config,
      updateConfig,
      calculateEndTime,
    }}>
      {children}
    </ScreeningConfigContext.Provider>
  );
}

export function useScreeningConfig() {
  const context = useContext(ScreeningConfigContext);
  if (context === undefined) {
    throw new Error('useScreeningConfig must be used within a ScreeningConfigProvider');
  }
  return context;
}











