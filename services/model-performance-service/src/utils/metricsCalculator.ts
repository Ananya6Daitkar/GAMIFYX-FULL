import { ConfusionMatrix, MetricsCalculationResult } from '@/types';
import { evaluate } from 'mathjs';

export class MetricsCalculator {
  
  /**
   * Calculate classification metrics from confusion matrix
   */
  static calculateClassificationMetrics(confusionMatrix: ConfusionMatrix): MetricsCalculationResult {
    const { truePositives, falsePositives, trueNegatives, falseNegatives } = confusionMatrix;
    
    // Basic validation
    if (truePositives < 0 || falsePositives < 0 || trueNegatives < 0 || falseNegatives < 0) {
      throw new Error('Confusion matrix values must be non-negative');
    }

    const total = truePositives + falsePositives + trueNegatives + falseNegatives;
    if (total === 0) {
      throw new Error('Confusion matrix cannot be empty');
    }

    // Calculate metrics
    const accuracy = (truePositives + trueNegatives) / total;
    
    const precision = (truePositives + falsePositives) === 0 ? 0 : 
      truePositives / (truePositives + falsePositives);
    
    const recall = (truePositives + falseNegatives) === 0 ? 0 : 
      truePositives / (truePositives + falseNegatives);
    
    const specificity = (trueNegatives + falsePositives) === 0 ? 0 : 
      trueNegatives / (trueNegatives + falsePositives);
    
    const f1Score = (precision + recall) === 0 ? 0 : 
      2 * (precision * recall) / (precision + recall);

    return {
      accuracy: this.roundToFourDecimals(accuracy),
      precision: this.roundToFourDecimals(precision),
      recall: this.roundToFourDecimals(recall),
      f1Score: this.roundToFourDecimals(f1Score),
      specificity: this.roundToFourDecimals(specificity)
    };
  }

  /**
   * Calculate regression metrics
   */
  static calculateRegressionMetrics(actualValues: number[], predictedValues: number[]): MetricsCalculationResult {
    if (actualValues.length !== predictedValues.length) {
      throw new Error('Actual and predicted values arrays must have the same length');
    }

    if (actualValues.length === 0) {
      throw new Error('Arrays cannot be empty');
    }

    const n = actualValues.length;
    
    // Mean Squared Error (MSE)
    const mse = actualValues.reduce((sum, actual, i) => {
      const error = actual - predictedValues[i];
      return sum + (error * error);
    }, 0) / n;

    // Root Mean Squared Error (RMSE)
    const rmse = Math.sqrt(mse);

    // Mean Absolute Error (MAE)
    const mae = actualValues.reduce((sum, actual, i) => {
      return sum + Math.abs(actual - predictedValues[i]);
    }, 0) / n;

    // R-squared (coefficient of determination)
    const actualMean = actualValues.reduce((sum, val) => sum + val, 0) / n;
    const totalSumSquares = actualValues.reduce((sum, actual) => {
      const diff = actual - actualMean;
      return sum + (diff * diff);
    }, 0);

    const residualSumSquares = actualValues.reduce((sum, actual, i) => {
      const error = actual - predictedValues[i];
      return sum + (error * error);
    }, 0);

    const r2Score = totalSumSquares === 0 ? 0 : 1 - (residualSumSquares / totalSumSquares);

    return {
      mse: this.roundToFourDecimals(mse),
      rmse: this.roundToFourDecimals(rmse),
      mae: this.roundToFourDecimals(mae),
      r2Score: this.roundToFourDecimals(r2Score)
    };
  }

  /**
   * Calculate multi-class classification metrics (macro average)
   */
  static calculateMultiClassMetrics(confusionMatrices: ConfusionMatrix[]): MetricsCalculationResult {
    if (confusionMatrices.length === 0) {
      throw new Error('At least one confusion matrix is required');
    }

    const classMetrics = confusionMatrices.map(matrix => 
      this.calculateClassificationMetrics(matrix)
    );

    // Calculate macro averages
    const accuracy = classMetrics.reduce((sum, metrics) => sum + (metrics.accuracy || 0), 0) / classMetrics.length;
    const precision = classMetrics.reduce((sum, metrics) => sum + (metrics.precision || 0), 0) / classMetrics.length;
    const recall = classMetrics.reduce((sum, metrics) => sum + (metrics.recall || 0), 0) / classMetrics.length;
    const f1Score = classMetrics.reduce((sum, metrics) => sum + (metrics.f1Score || 0), 0) / classMetrics.length;
    const specificity = classMetrics.reduce((sum, metrics) => sum + (metrics.specificity || 0), 0) / classMetrics.length;

    return {
      accuracy: this.roundToFourDecimals(accuracy),
      precision: this.roundToFourDecimals(precision),
      recall: this.roundToFourDecimals(recall),
      f1Score: this.roundToFourDecimals(f1Score),
      specificity: this.roundToFourDecimals(specificity)
    };
  }

  /**
   * Validate metrics against benchmarks
   */
  static validateAgainstBenchmarks(
    metrics: MetricsCalculationResult,
    benchmarks: {
      minAccuracy?: number;
      targetAccuracy?: number;
      minPrecision?: number;
      targetPrecision?: number;
      minRecall?: number;
      targetRecall?: number;
      minF1Score?: number;
      targetF1Score?: number;
    }
  ): { isValid: boolean; violations: string[]; warnings: string[] } {
    const violations: string[] = [];
    const warnings: string[] = [];

    // Check minimum requirements
    if (benchmarks.minAccuracy !== undefined && (metrics.accuracy || 0) < benchmarks.minAccuracy) {
      violations.push(`Accuracy ${metrics.accuracy} is below minimum requirement ${benchmarks.minAccuracy}`);
    }

    if (benchmarks.minPrecision !== undefined && (metrics.precision || 0) < benchmarks.minPrecision) {
      violations.push(`Precision ${metrics.precision} is below minimum requirement ${benchmarks.minPrecision}`);
    }

    if (benchmarks.minRecall !== undefined && (metrics.recall || 0) < benchmarks.minRecall) {
      violations.push(`Recall ${metrics.recall} is below minimum requirement ${benchmarks.minRecall}`);
    }

    if (benchmarks.minF1Score !== undefined && (metrics.f1Score || 0) < benchmarks.minF1Score) {
      violations.push(`F1 Score ${metrics.f1Score} is below minimum requirement ${benchmarks.minF1Score}`);
    }

    // Check target requirements (warnings)
    if (benchmarks.targetAccuracy !== undefined && (metrics.accuracy || 0) < benchmarks.targetAccuracy) {
      warnings.push(`Accuracy ${metrics.accuracy} is below target ${benchmarks.targetAccuracy}`);
    }

    if (benchmarks.targetPrecision !== undefined && (metrics.precision || 0) < benchmarks.targetPrecision) {
      warnings.push(`Precision ${metrics.precision} is below target ${benchmarks.targetPrecision}`);
    }

    if (benchmarks.targetRecall !== undefined && (metrics.recall || 0) < benchmarks.targetRecall) {
      warnings.push(`Recall ${metrics.recall} is below target ${benchmarks.targetRecall}`);
    }

    if (benchmarks.targetF1Score !== undefined && (metrics.f1Score || 0) < benchmarks.targetF1Score) {
      warnings.push(`F1 Score ${metrics.f1Score} is below target ${benchmarks.targetF1Score}`);
    }

    return {
      isValid: violations.length === 0,
      violations,
      warnings
    };
  }

  /**
   * Calculate performance trend direction
   */
  static calculateTrendDirection(values: number[]): 'Improving' | 'Stable' | 'Degrading' {
    if (values.length < 2) {
      return 'Stable';
    }

    // Simple linear regression to determine trend
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    // Determine trend based on slope
    const threshold = 0.001; // Small threshold to account for noise
    
    if (slope > threshold) {
      return 'Improving';
    } else if (slope < -threshold) {
      return 'Degrading';
    } else {
      return 'Stable';
    }
  }

  /**
   * Round number to 4 decimal places
   */
  private static roundToFourDecimals(value: number): number {
    return Math.round(value * 10000) / 10000;
  }

  /**
   * Calculate statistical summary for a set of values
   */
  static calculateStatisticalSummary(values: number[]): {
    mean: number;
    median: number;
    standardDeviation: number;
    min: number;
    max: number;
    count: number;
  } {
    if (values.length === 0) {
      throw new Error('Values array cannot be empty');
    }

    const sortedValues = [...values].sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((acc, val) => acc + val, 0);
    const mean = sum / count;

    // Median
    const median = count % 2 === 0
      ? (sortedValues[count / 2 - 1] + sortedValues[count / 2]) / 2
      : sortedValues[Math.floor(count / 2)];

    // Standard deviation
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / count;
    const standardDeviation = Math.sqrt(variance);

    return {
      mean: this.roundToFourDecimals(mean),
      median: this.roundToFourDecimals(median),
      standardDeviation: this.roundToFourDecimals(standardDeviation),
      min: Math.min(...values),
      max: Math.max(...values),
      count
    };
  }
}