import React from 'react';
import { Box } from '@mui/material';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  preventOverflow?: boolean;
  mobileStack?: boolean;
  tabletOptimized?: boolean;
}

const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className = '',
  preventOverflow = true,
  mobileStack = false,
  tabletOptimized = false
}) => {
  const getClasses = () => {
    let classes = ['container-responsive'];
    
    if (preventOverflow) {
      classes.push('prevent-overflow');
    }
    
    if (mobileStack) {
      classes.push('stack-mobile');
    }
    
    if (tabletOptimized) {
      classes.push('tablet-optimized');
    }
    
    if (className) {
      classes.push(className);
    }
    
    return classes.join(' ');
  };

  return (
    <Box className={getClasses()}>
      {children}
    </Box>
  );
};

export default ResponsiveContainer;