/**
 * Performance monitoring hook for tracking dashboard metrics
 */

import { useEffect, useRef, useState } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  connectionLatency: number;
  errorCount: number;
}

interface PerformanceMonitoringOptions {
  trackMemory?: boolean;
  trackLatency?: boolean;
  reportInterval?: number;
}

export const usePerformanceMonitoring = (
  componentName: string,
  options: PerformanceMonitoringOptions = {}
) => {
  const {
    trackMemory = true,
    trackLatency = true,
    reportInterval = 30000 // 30 seconds
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    connectionLatency: 0,
    errorCount: 0
  });

  const startTime = useRef<number>(Date.now());
  const renderStartTime = useRef<number>(Date.now());
  const errorCount = useRef<number>(0);
  const reportIntervalRef = useRef<NodeJS.Timeout>();

  // Track component load time
  useEffect(() => {
    const loadTime = Date.now() - startTime.current;
    setMetrics(prev => ({ ...prev, loadTime }));
  }, []);

  // Track render performance
  useEffect(() => {
    const renderTime = Date.now() - renderStartTime.current;
    setMetrics(prev => ({ ...prev, renderTime }));
    renderStartTime.current = Date.now();
  });

  // Track memory usage
  useEffect(() => {
    if (!trackMemory || !('memory' in performance)) return;

    const updateMemoryUsage = () => {
      const memory = (performance as any).memory;
      if (memory) {
        const memoryUsage = Math.round(memory.usedJSHeapSize / 1024 / 1024); // MB
        setMetrics(prev => ({ ...prev, memoryUsage }));
      }
    };

    updateMemoryUsage();
    const interval = setInterval(updateMemoryUsage, 5000);

    return () => clearInterval(interval);
  }, [trackMemory]);

  // Track connection latency
  useEffect(() => {
    if (!trackLatency) return;

    const measureLatency = async () => {
      try {
        const start = Date.now();
        await fetch('/api/v1/health', { method: 'HEAD' });
        const latency = Date.now() - start;
        setMetrics(prev => ({ ...prev, connectionLatency: latency }));
      } catch (error) {
        errorCount.current++;
        setMetrics(prev => ({ ...prev, errorCount: errorCount.current }));
      }
    };

    measureLatency();
    const interval = setInterval(measureLatency, 10000);

    return () => clearInterval(interval);
  }, [trackLatency]);

  // Error tracking
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      errorCount.current++;
      setMetrics(prev => ({ ...prev, errorCount: errorCount.current }));
      
      // Log error for debugging
      console.error(`Performance Monitor - ${componentName}:`, event.error);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      errorCount.current++;
      setMetrics(prev => ({ ...prev, errorCount: errorCount.current }));
      
      console.error(`Performance Monitor - ${componentName} (Promise):`, event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [componentName]);

  // Periodic reporting
  useEffect(() => {
    if (reportIntervalRef.current) {
      clearInterval(reportIntervalRef.current);
    }

    reportIntervalRef.current = setInterval(() => {
      // Send metrics to analytics service
      if (process.env['NODE_ENV'] === 'production') {
        fetch('/api/v1/analytics/client-metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            component: componentName,
            metrics,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
          })
        }).catch(error => {
          console.warn('Failed to send performance metrics:', error);
        });
      }
    }, reportInterval);

    return () => {
      if (reportIntervalRef.current) {
        clearInterval(reportIntervalRef.current);
      }
    };
  }, [componentName, metrics, reportInterval]);

  // Performance insights
  const getPerformanceInsights = () => {
    const insights: string[] = [];

    if (metrics.loadTime > 3000) {
      insights.push('Dashboard is loading slowly. Consider optimizing data fetching.');
    }

    if (metrics.renderTime > 100) {
      insights.push('Component rendering is slow. Check for expensive operations.');
    }

    if (metrics.memoryUsage > 100) {
      insights.push('High memory usage detected. Check for memory leaks.');
    }

    if (metrics.connectionLatency > 1000) {
      insights.push('High network latency detected. Check connection quality.');
    }

    if (metrics.errorCount > 5) {
      insights.push('Multiple errors detected. Check console for details.');
    }

    return insights;
  };

  // Performance score (0-100)
  const getPerformanceScore = () => {
    let score = 100;

    // Deduct points for poor performance
    if (metrics.loadTime > 2000) score -= 20;
    if (metrics.loadTime > 5000) score -= 30;
    
    if (metrics.renderTime > 50) score -= 10;
    if (metrics.renderTime > 100) score -= 20;
    
    if (metrics.memoryUsage > 50) score -= 10;
    if (metrics.memoryUsage > 100) score -= 20;
    
    if (metrics.connectionLatency > 500) score -= 10;
    if (metrics.connectionLatency > 1000) score -= 20;
    
    if (metrics.errorCount > 0) score -= metrics.errorCount * 5;

    return Math.max(0, score);
  };

  return {
    metrics,
    insights: getPerformanceInsights(),
    score: getPerformanceScore(),
    isHealthy: getPerformanceScore() > 70
  };
};

export default usePerformanceMonitoring;