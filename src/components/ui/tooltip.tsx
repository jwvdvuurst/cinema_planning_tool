import * as React from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  className?: string;
}

export function Tooltip({ children, content, className }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={cn(
            'absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 text-sm text-white bg-gray-900 rounded-md shadow-lg whitespace-nowrap z-50',
            'before:absolute before:bottom-full before:left-1/2 before:transform before:-translate-x-1/2 before:border-4 before:border-transparent before:border-b-gray-900',
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
