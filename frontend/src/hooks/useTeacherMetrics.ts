/**
 * Hook for tracking teacher dashboard metrics and usage patterns
 */

import { useState, useEffect, useRef } from 'react';

interface TeacherMetricsData {
  sessionStart: number;
  pageViews: number;
  actionsPerformed: number;
  featuresUsed: Set<string>;
  timeSpentOnFeatures: Map<string, number>;
  lastActivity: number;
}

interface UseTeacherMetricsOptions {
  teacherId: string;
  trackingEnabled?: boolean;
  reportInterval?: number; // in milliseconds
}

export const useTeacherMetrics = (options: UseTeacherMetricsOptions) => {
  const {
    teacherId,
    trackingEnabled = true,
    reportInterval = 60000 // 1 minute
  } = options;

  const [metrics, setMetrics] = useState<TeacherMetricsData>({
    sessionStart: Date.now(),
    pageViews: 0,
    actionsPerformed: 0,
    featuresUsed: new Set(),
    timeSpentOnFeatures: new Map(),
    lastActivity: Date.now()
  });

  const currentFeature = useRef<string>('');
  const featureStartTime = useRef<number>(Date.now());
  const reportIntervalRef = useRef<NodeJS.Timeout>();
  const activityTimeout = useRef<NodeJS.Timeout>();

  // Track page views
  const trackPageView = (pageName: string) => {
    if (!trackingEnabled) return;

    // End tracking for previous feature
    if (currentFeature.current) {
      const timeSpent = Date.now() - featureStartTime.current;
      setMetrics(prev => {
        const newTimeSpent = new Map(prev.timeSpentOnFeatures);
        const existing = newTimeSpent.get(currentFeature.current) || 0;
        newTimeSpent.set(currentFeature.current, existing + timeSpent);
        
        return {
          ...prev,
          timeSpentOnFeatures: newTimeSpent
        };
      });
    }

    // Start tracking new feature
    currentFeature.current = pageName;
    featureStartTime.current = Date.now();

    setMetrics(prev => ({
      ...prev,
      pageViews: prev.pageViews + 1,
      featuresUsed: new Set([...Array.from(prev.featuresUsed), pageName]),
      lastActivity: Date.now()
    }));

    // Send page view event
    sendMetricsEvent('page_view', {
      page: pageName,
      timestamp: Date.now(),
      sessionDuration: Date.now() - metrics.sessionStart
    });
  };

  // Track user actions
  const trackAction = (actionType: string, actionData?: any) => {
    if (!trackingEnabled) return;

    setMetrics(prev => ({
      ...prev,
      actionsPerformed: prev.actionsPerformed + 1,
      lastActivity: Date.now()
    }));

    // Send action event
    sendMetricsEvent('user_action', {
      action: actionType,
      data: actionData,
      feature: currentFeature.current,
      timestamp: Date.now()
    });

    // Reset activity timeout
    if (activityTimeout.current) {
      clearTimeout(activityTimeout.current);
    }
    
    activityTimeout.current = setTimeout(() => {
      sendMetricsEvent('user_inactive', {
        lastActivity: Date.now(),
        sessionDuration: Date.now() - metrics.sessionStart
      });
    }, 300000); // 5 minutes of inactivity
  };

  // Track feature usage
  const trackFeatureUsage = (featureName: string, usageData?: any) => {
    if (!trackingEnabled) return;

    setMetrics(prev => ({
      ...prev,
      featuresUsed: new Set([...Array.from(prev.featuresUsed), featureName]),
      lastActivity: Date.now()
    }));

    sendMetricsEvent('feature_usage', {
      feature: featureName,
      data: usageData,
      timestamp: Date.now()
    });
  };

  // Track intervention actions
  const trackIntervention = (interventionType: string, studentId: string, outcome?: string) => {
    trackAction('intervention_created', {
      type: interventionType,
      studentId,
      outcome
    });
  };

  // Track alert management
  const trackAlertAction = (alertId: string, action: 'acknowledge' | 'resolve' | 'snooze', responseTime?: number) => {
    trackAction('alert_action', {
      alertId,
      action,
      responseTime
    });
  };

  // Track report generation
  const trackReportGeneration = (reportType: string, parameters: any) => {
    trackAction('report_generated', {
      type: reportType,
      parameters
    });
  };

  // Send metrics to backend
  const sendMetricsEvent = async (eventType: string, eventData: any) => {
    if (!trackingEnabled) return;

    try {
      await fetch('/api/v1/analytics/teacher-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          teacherId,
          eventType,
          eventData,
          sessionId: `session_${metrics.sessionStart}`,
          userAgent: navigator.userAgent,
          timestamp: Date.now()
        })
      });
    } catch (error) {
      console.warn('Failed to send teacher metrics:', error);
    }
  };

  // Send periodic reports
  const sendPeriodicReport = () => {
    if (!trackingEnabled) return;

    const sessionDuration = Date.now() - metrics.sessionStart;
    const featuresUsedArray = Array.from(metrics.featuresUsed);
    const timeSpentObject = Object.fromEntries(metrics.timeSpentOnFeatures);

    sendMetricsEvent('periodic_report', {
      sessionDuration,
      pageViews: metrics.pageViews,
      actionsPerformed: metrics.actionsPerformed,
      featuresUsed: featuresUsedArray,
      timeSpentOnFeatures: timeSpentObject,
      lastActivity: metrics.lastActivity
    });
  };

  // Track session end
  const endSession = () => {
    if (!trackingEnabled) return;

    // End tracking for current feature
    if (currentFeature.current) {
      const timeSpent = Date.now() - featureStartTime.current;
      setMetrics(prev => {
        const newTimeSpent = new Map(prev.timeSpentOnFeatures);
        const existing = newTimeSpent.get(currentFeature.current) || 0;
        newTimeSpent.set(currentFeature.current, existing + timeSpent);
        return {
          ...prev,
          timeSpentOnFeatures: newTimeSpent
        };
      });
    }

    const sessionDuration = Date.now() - metrics.sessionStart;
    
    sendMetricsEvent('session_end', {
      sessionDuration,
      pageViews: metrics.pageViews,
      actionsPerformed: metrics.actionsPerformed,
      featuresUsed: Array.from(metrics.featuresUsed),
      timeSpentOnFeatures: Object.fromEntries(metrics.timeSpentOnFeatures)
    });
  };

  // Setup periodic reporting
  useEffect(() => {
    if (!trackingEnabled) return;

    reportIntervalRef.current = setInterval(sendPeriodicReport, reportInterval);

    return () => {
      if (reportIntervalRef.current) {
        clearInterval(reportIntervalRef.current);
      }
    };
  }, [trackingEnabled, reportInterval]);

  // Handle page unload
  useEffect(() => {
    if (!trackingEnabled) return;

    const handleBeforeUnload = () => {
      endSession();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        sendMetricsEvent('tab_hidden', { timestamp: Date.now() });
      } else {
        sendMetricsEvent('tab_visible', { timestamp: Date.now() });
        setMetrics(prev => ({ ...prev, lastActivity: Date.now() }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      endSession();
    };
  }, [trackingEnabled]);

  // Calculate derived metrics
  const getDerivedMetrics = () => {
    const sessionDuration = Date.now() - metrics.sessionStart;
    const averageTimePerFeature = metrics.featuresUsed.size > 0 
      ? sessionDuration / metrics.featuresUsed.size 
      : 0;
    
    const mostUsedFeature = Array.from(metrics.timeSpentOnFeatures.entries())
      .sort(([,a], [,b]) => b - a)[0];

    return {
      sessionDuration,
      averageTimePerFeature,
      mostUsedFeature: mostUsedFeature ? mostUsedFeature[0] : null,
      actionsPerMinute: sessionDuration > 0 ? (metrics.actionsPerformed / (sessionDuration / 60000)) : 0,
      isActive: Date.now() - metrics.lastActivity < 60000 // Active if last activity within 1 minute
    };
  };

  return {
    metrics,
    derivedMetrics: getDerivedMetrics(),
    trackPageView,
    trackAction,
    trackFeatureUsage,
    trackIntervention,
    trackAlertAction,
    trackReportGeneration,
    endSession
  };
};

export default useTeacherMetrics;