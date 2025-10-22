/**
 * Data transformation utilities for GamifyX frontend
 * Handles conversion between backend API responses and frontend data models
 */

import { 
  DashboardData, 
  TeamMember, 
  Incident, 
  Achievement, 
  DevOpsMetric, 
  AIInsight,
  LiveMetrics,
  StudentPrediction,
  AIMetrics 
} from './gamifyxApi';

// Transform raw API dashboard data to frontend format
export const transformDashboardData = (rawData: any): DashboardData => {
  return {
    systemHealth: {
      score: rawData.systemHealth?.score || 0,
      status: rawData.systemHealth?.status || 'unknown',
      uptime: rawData.systemHealth?.uptime || '0%',
      incidents: rawData.systemHealth?.incidents || 0,
      responseTime: rawData.systemHealth?.responseTime || '0ms'
    },
    teamMembers: (rawData.teamMembers || []).map(transformTeamMember),
    incidents: (rawData.incidents || []).map(transformIncident),
    achievements: (rawData.achievements || []).map(transformAchievement),
    metrics: (rawData.metrics || []).map(transformMetric),
    aiInsights: (rawData.aiInsights || []).map(transformAIInsight),
    performancePredictions: (rawData.performancePredictions || []).map(transformStudentPrediction),
    aiMetrics: transformAIMetrics(rawData.aiMetrics)
  };
};

// Transform team member data
export const transformTeamMember = (rawMember: any): TeamMember => {
  return {
    id: rawMember.id || '',
    name: rawMember.name || 'Unknown User',
    avatar: rawMember.avatar || '/avatars/placeholder.svg',
    xp: rawMember.xp || 0,
    level: rawMember.level || 1,
    rank: rawMember.rank || 0,
    badges: (rawMember.badges || []).map((badge: any) => ({
      id: badge.id || '',
      name: badge.name || '',
      icon: badge.icon || '🏆',
      color: badge.color || '#00FFFF'
    })),
    streak: rawMember.streak || 0,
    status: rawMember.status || 'offline'
  };
};

// Transform incident data
export const transformIncident = (rawIncident: any): Incident => {
  return {
    id: rawIncident.id || '',
    title: rawIncident.title || 'Unknown Incident',
    severity: rawIncident.severity || 'low',
    confidence: rawIncident.confidence || 0,
    predictedAt: rawIncident.predictedAt || new Date().toISOString(),
    affectedSystems: rawIncident.affectedSystems || [],
    aiPrediction: rawIncident.aiPrediction || false
  };
};

// Transform achievement data
export const transformAchievement = (rawAchievement: any): Achievement => {
  return {
    id: rawAchievement.id || '',
    title: rawAchievement.title || 'Unknown Achievement',
    description: rawAchievement.description || '',
    icon: rawAchievement.icon || '🏆',
    rarity: rawAchievement.rarity || 'common',
    progress: rawAchievement.progress || 0,
    maxProgress: rawAchievement.maxProgress || 100,
    unlocked: rawAchievement.unlocked || false
  };
};

// Transform metrics data
export const transformMetric = (rawMetric: any): DevOpsMetric => {
  return {
    id: rawMetric.id || '',
    name: rawMetric.name || 'Unknown Metric',
    value: rawMetric.value || 0,
    unit: rawMetric.unit || '',
    trend: rawMetric.trend || 'stable',
    status: rawMetric.status || 'good'
  };
};

// Transform AI insight data
export const transformAIInsight = (rawInsight: any): AIInsight => {
  return {
    id: rawInsight.id || '',
    type: rawInsight.type || 'anomaly',
    message: rawInsight.message || '',
    confidence: rawInsight.confidence || 0,
    timestamp: rawInsight.timestamp || new Date().toISOString()
  };
};

// Transform student prediction data
export const transformStudentPrediction = (rawPrediction: any): StudentPrediction => {
  return {
    userId: rawPrediction.userId || rawPrediction.user_id || '',
    name: rawPrediction.name || 'Unknown Student',
    avatar: rawPrediction.avatar || '/avatars/placeholder.svg',
    predictedPerformance: rawPrediction.predictedPerformance || rawPrediction.predicted_performance || 0,
    riskScore: rawPrediction.riskScore || rawPrediction.risk_score || 0,
    confidence: rawPrediction.confidence || 0,
    factors: {
      submissionFrequency: rawPrediction.factors?.submissionFrequency || rawPrediction.factors?.submission_frequency || 0,
      codeQualityAvg: rawPrediction.factors?.codeQualityAvg || rawPrediction.factors?.code_quality_avg || 0,
      testCoverageAvg: rawPrediction.factors?.testCoverageAvg || rawPrediction.factors?.test_coverage_avg || 0,
      feedbackImplementationRate: rawPrediction.factors?.feedbackImplementationRate || rawPrediction.factors?.feedback_implementation_rate || 0,
      engagementScore: rawPrediction.factors?.engagementScore || rawPrediction.factors?.engagement_score || 0,
    },
    recommendations: rawPrediction.recommendations || [],
    timestamp: rawPrediction.timestamp || new Date().toISOString(),
    trend: rawPrediction.trend || 'stable'
  };
};

// Transform AI metrics data
export const transformAIMetrics = (rawMetrics: any): AIMetrics => {
  if (!rawMetrics) {
    return {
      feedbackGeneration: {
        totalRequests: 0,
        successRate: 0,
        averageResponseTime: 0,
        accuracyScore: 0,
        implementationRate: 0,
      },
      modelPrediction: {
        totalPredictions: 0,
        averageConfidence: 0,
        accuracyTrend: [],
        driftScore: 0,
        lastTrainingDate: new Date().toISOString(),
      },
      serviceHealth: {
        status: 'healthy',
        uptime: 0,
        cpuUsage: 0,
        memoryUsage: 0,
        errorRate: 0,
        responseTime: 0,
      },
      optimizations: [],
    };
  }

  return {
    feedbackGeneration: {
      totalRequests: rawMetrics.feedbackGeneration?.totalRequests || rawMetrics.feedback_generation?.total_requests || 0,
      successRate: rawMetrics.feedbackGeneration?.successRate || rawMetrics.feedback_generation?.success_rate || 0,
      averageResponseTime: rawMetrics.feedbackGeneration?.averageResponseTime || rawMetrics.feedback_generation?.average_response_time || 0,
      accuracyScore: rawMetrics.feedbackGeneration?.accuracyScore || rawMetrics.feedback_generation?.accuracy_score || 0,
      implementationRate: rawMetrics.feedbackGeneration?.implementationRate || rawMetrics.feedback_generation?.implementation_rate || 0,
    },
    modelPrediction: {
      totalPredictions: rawMetrics.modelPrediction?.totalPredictions || rawMetrics.model_prediction?.total_predictions || 0,
      averageConfidence: rawMetrics.modelPrediction?.averageConfidence || rawMetrics.model_prediction?.average_confidence || 0,
      accuracyTrend: rawMetrics.modelPrediction?.accuracyTrend || rawMetrics.model_prediction?.accuracy_trend || [],
      driftScore: rawMetrics.modelPrediction?.driftScore || rawMetrics.model_prediction?.drift_score || 0,
      lastTrainingDate: rawMetrics.modelPrediction?.lastTrainingDate || rawMetrics.model_prediction?.last_training_date || new Date().toISOString(),
    },
    serviceHealth: {
      status: rawMetrics.serviceHealth?.status || rawMetrics.service_health?.status || 'healthy',
      uptime: rawMetrics.serviceHealth?.uptime || rawMetrics.service_health?.uptime || 0,
      cpuUsage: rawMetrics.serviceHealth?.cpuUsage || rawMetrics.service_health?.cpu_usage || 0,
      memoryUsage: rawMetrics.serviceHealth?.memoryUsage || rawMetrics.service_health?.memory_usage || 0,
      errorRate: rawMetrics.serviceHealth?.errorRate || rawMetrics.service_health?.error_rate || 0,
      responseTime: rawMetrics.serviceHealth?.responseTime || rawMetrics.service_health?.response_time || 0,
    },
    optimizations: (rawMetrics.optimizations || []).map((opt: any) => ({
      id: opt.id || '',
      type: opt.type || 'performance',
      recommendation: opt.recommendation || '',
      impact: opt.impact || 'low',
      priority: opt.priority || 1,
    })),
  };
};

// Transform live metrics data
export const transformLiveMetrics = (rawMetrics: any): LiveMetrics => {
  return {
    systemHealth: rawMetrics.systemHealth || 0,
    cpu: rawMetrics.cpu || 0,
    memory: rawMetrics.memory || 0,
    responseTime: rawMetrics.responseTime || 0,
    errorRate: rawMetrics.errorRate || 0,
    throughput: rawMetrics.throughput || 0,
    timestamp: rawMetrics.timestamp || new Date().toISOString()
  };
};

// Format numbers for display
export const formatNumber = (value: number, decimals: number = 1): string => {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(decimals) + 'M';
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(decimals) + 'K';
  }
  return value.toFixed(decimals);
};

// Format percentage values
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

// Format time durations
export const formatDuration = (milliseconds: number): string => {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  }
  if (milliseconds < 60000) {
    return `${(milliseconds / 1000).toFixed(1)}s`;
  }
  if (milliseconds < 3600000) {
    return `${(milliseconds / 60000).toFixed(1)}m`;
  }
  return `${(milliseconds / 3600000).toFixed(1)}h`;
};

// Format timestamps for display
export const formatTimestamp = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) {
      return 'Just now';
    }
    if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}m ago`;
    }
    if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}h ago`;
    }
    return date.toLocaleDateString();
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return 'Invalid date';
  }
};

// Get severity color for incidents
export const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'critical':
      return '#FF0040';
    case 'high':
      return '#FF6B00';
    case 'medium':
      return '#FFB800';
    case 'low':
      return '#00FF88';
    default:
      return '#00FFFF';
  }
};

// Get rarity color for achievements
export const getRarityColor = (rarity: string): string => {
  switch (rarity) {
    case 'legendary':
      return '#FF0080';
    case 'epic':
      return '#8B00FF';
    case 'rare':
      return '#0080FF';
    case 'common':
      return '#00FF88';
    default:
      return '#00FFFF';
  }
};

// Get status color for metrics
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'critical':
      return '#FF0040';
    case 'warning':
      return '#FFB800';
    case 'good':
      return '#00FF88';
    default:
      return '#00FFFF';
  }
};

// Get trend icon for metrics
export const getTrendIcon = (trend: string): string => {
  switch (trend) {
    case 'up':
      return '↗️';
    case 'down':
      return '↘️';
    case 'stable':
      return '→';
    default:
      return '→';
  }
};

// Calculate level from XP
export const calculateLevel = (xp: number): number => {
  // Simple level calculation: level = floor(sqrt(xp / 100))
  return Math.floor(Math.sqrt(xp / 100)) + 1;
};

// Calculate XP needed for next level
export const calculateXPForNextLevel = (currentLevel: number): number => {
  return Math.pow(currentLevel, 2) * 100;
};

// Calculate progress to next level
export const calculateLevelProgress = (xp: number, currentLevel: number): number => {
  const currentLevelXP = Math.pow(currentLevel - 1, 2) * 100;
  const nextLevelXP = Math.pow(currentLevel, 2) * 100;
  const progressXP = xp - currentLevelXP;
  const totalXPNeeded = nextLevelXP - currentLevelXP;
  
  return Math.min((progressXP / totalXPNeeded) * 100, 100);
};

// Validate and sanitize user input
export const sanitizeInput = (input: string): string => {
  return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
};

// Generate unique IDs for frontend components
export const generateId = (): string => {
  return `gamifyx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Debounce function for API calls
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle function for frequent updates
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Local storage helpers with error handling
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  },
  
  setItem: (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('Error writing to localStorage:', error);
      return false;
    }
  },
  
  removeItem: (key: string): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing from localStorage:', error);
      return false;
    }
  }
};

// Error handling utilities
export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

// Performance monitoring utilities
export const measurePerformance = (name: string, fn: () => void): void => {
  const start = performance.now();
  fn();
  const end = performance.now();
  console.log(`Performance: ${name} took ${end - start} milliseconds`);
};

export default {
  transformDashboardData,
  transformTeamMember,
  transformIncident,
  transformAchievement,
  transformMetric,
  transformAIInsight,
  transformLiveMetrics,
  formatNumber,
  formatPercentage,
  formatDuration,
  formatTimestamp,
  getSeverityColor,
  getRarityColor,
  getStatusColor,
  getTrendIcon,
  calculateLevel,
  calculateXPForNextLevel,
  calculateLevelProgress,
  sanitizeInput,
  generateId,
  debounce,
  throttle,
  safeLocalStorage,
  handleApiError,
  measurePerformance
};