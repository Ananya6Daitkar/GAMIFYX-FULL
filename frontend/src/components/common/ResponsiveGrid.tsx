import React from 'react';
import { Box } from '@mui/material';

interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  spacing?: 'compact' | 'normal' | 'spacious';
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
}

const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  className = '',
  spacing = 'normal',
  columns = { mobile: 1, tablet: 2, desktop: 12 }
}) => {
  const getClasses = () => {
    let classes = ['dashboard-grid', 'prevent-overflow'];
    
    if (spacing === 'compact') {
      classes.push('compact');
    } else if (spacing === 'spacious') {
      classes.push('spacious');
    }
    
    if (className) {
      classes.push(className);
    }
    
    return classes.join(' ');
  };

  const getGridStyle = () => {
    return {
      '--mobile-columns': columns.mobile || 1,
      '--tablet-columns': columns.tablet || 2,
      '--desktop-columns': columns.desktop || 12,
    } as React.CSSProperties;
  };

  return (
    <Box 
      className={getClasses()}
      style={getGridStyle()}
    >
      {children}
    </Box>
  );
};

interface GridItemProps {
  children: React.ReactNode;
  span?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  className?: string;
}

export const GridItem: React.FC<GridItemProps> = ({
  children,
  span = { mobile: 1, tablet: 1, desktop: 1 },
  className = ''
}) => {
  const getClasses = () => {
    let classes = [];
    
    // Default desktop span
    if (span.desktop) {
      classes.push(`grid-span-${span.desktop}`);
    }
    
    if (className) {
      classes.push(className);
    }
    
    return classes.join(' ');
  };

  const getGridStyle = () => {
    return {
      '--mobile-span': span.mobile || 1,
      '--tablet-span': span.tablet || 1,
      '--desktop-span': span.desktop || 1,
    } as React.CSSProperties;
  };

  return (
    <div 
      className={getClasses()}
      style={getGridStyle()}
    >
      {children}
    </div>
  );
};

export default ResponsiveGrid;