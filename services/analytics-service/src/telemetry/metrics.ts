import { meter } from './index';

// Analytics and prediction metrics
export const riskScoreCalculationCounter = meter.createCounter('risk_score_calculation_total', {
  description: 'Total number of risk score calculations',
});

export const riskScoreDistribution = meter.createHistogram('risk_score_distribution', {
  description: 'Distribution of calculated risk scores',
  boundaries: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
});

export const performancePredictionAccuracy = meter.createHistogram('performance_prediction_accuracy', {
  description: 'Accuracy of performance predictions',
  boundaries: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
});

export const alertGenerationCounter = meter.createCounter('alert_generation_total', {
  description: 'Total number of alerts generated',
});

export const alertFalsePositiveRate = meter.createCounter('alert_false_positive_total', {
  description: 'Total number of false positive alerts',
});

export const analyticsProcessingDuration = meter.createHistogram('analytics_processing_duration_seconds', {
  description: 'Time taken to process analytics in seconds',
  boundaries: [1, 5, 10, 30, 60, 120, 300], // 1s to 5min
});

export const dataFreshnessGauge = meter.createUpDownCounter('data_freshness_minutes', {
  description: 'Age of the most recent data in minutes',
});

// Helper functions to record metrics
export const recordRiskScoreCalculation = (userId: string, riskScore: number, factors: string[]) => {
  riskScoreCalculationCounter.add(1, { 
    user_id: userId,
    risk_level: riskScore > 0.7 ? 'high' : riskScore > 0.4 ? 'medium' : 'low'
  });
  
  riskScoreDistribution.record(riskScore, { 
    user_id: userId,
    factors: factors.join(',')
  });
};

export const recordPredictionAccuracy = (accuracy: number, predictionType: string) => {
  performancePredictionAccuracy.record(accuracy, { 
    prediction_type: predictionType 
  });
};

export const recordAlertGeneration = (alertType: string, userId: string, severity: string) => {
  alertGenerationCounter.add(1, { 
    alert_type: alertType,
    user_id: userId,
    severity: severity 
  });
};

export const recordFalsePositiveAlert = (alertType: string, userId: string) => {
  alertFalsePositiveRate.add(1, { 
    alert_type: alertType,
    user_id: userId 
  });
};

export const recordAnalyticsProcessing = (duration: number, processType: string, success: boolean) => {
  analyticsProcessingDuration.record(duration, { 
    process_type: processType,
    success: success.toString()
  });
};

export const updateDataFreshness = (ageInMinutes: number, dataType: string) => {
  dataFreshnessGauge.add(ageInMinutes, { 
    data_type: dataType 
  });
};