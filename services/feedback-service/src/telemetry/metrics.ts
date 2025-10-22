import { meter } from './index';

// Feedback generation metrics
export const feedbackGenerationCounter = meter.createCounter('feedback_generation_total', {
  description: 'Total number of feedback generations',
});

export const feedbackGenerationDuration = meter.createHistogram('feedback_generation_duration_seconds', {
  description: 'Time taken to generate feedback in seconds',
  boundaries: [0.5, 1, 2, 5, 10, 20, 30, 60], // 0.5s to 1min
});

export const feedbackAccuracyScore = meter.createHistogram('feedback_accuracy_score', {
  description: 'Accuracy score of generated feedback',
  boundaries: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
});

export const feedbackImplementationRate = meter.createCounter('feedback_implementation_total', {
  description: 'Total number of feedback suggestions implemented',
});

export const aiModelInferenceCounter = meter.createCounter('ai_model_inference_total', {
  description: 'Total number of AI model inferences',
});

export const aiModelConfidenceScore = meter.createHistogram('ai_model_confidence_score', {
  description: 'Confidence score of AI model predictions',
  boundaries: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
});

// Helper functions to record metrics
export const recordFeedbackGeneration = (submissionId: string, feedbackType: string, success: boolean) => {
  feedbackGenerationCounter.add(1, { 
    submission_id: submissionId,
    feedback_type: feedbackType,
    success: success.toString()
  });
};

export const recordFeedbackDuration = (duration: number, feedbackType: string) => {
  feedbackGenerationDuration.record(duration, { 
    feedback_type: feedbackType 
  });
};

export const recordFeedbackAccuracy = (accuracy: number, feedbackType: string) => {
  feedbackAccuracyScore.record(accuracy, { 
    feedback_type: feedbackType 
  });
};

export const recordFeedbackImplementation = (submissionId: string, feedbackId: string, implemented: boolean) => {
  if (implemented) {
    feedbackImplementationRate.add(1, { 
      submission_id: submissionId,
      feedback_id: feedbackId 
    });
  }
};

export const recordAiModelInference = (modelType: string, success: boolean, errorType?: string) => {
  const attributes = { 
    model_type: modelType,
    success: success.toString()
  };
  
  if (!success && errorType) {
    Object.assign(attributes, { error_type: errorType });
  }
  
  aiModelInferenceCounter.add(1, attributes);
};

export const recordAiModelConfidence = (confidence: number, modelType: string) => {
  aiModelConfidenceScore.record(confidence, { 
    model_type: modelType 
  });
};