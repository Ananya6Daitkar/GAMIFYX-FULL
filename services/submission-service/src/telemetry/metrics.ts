import { meter } from './index';

// Submission metrics
export const submissionCounter = meter.createCounter('submission_total', {
  description: 'Total number of submissions processed',
});

export const submissionProcessingDuration = meter.createHistogram('submission_processing_duration_seconds', {
  description: 'Time taken to process submissions in seconds',
});

export const submissionSuccessRate = meter.createCounter('submission_success_total', {
  description: 'Total number of successful submissions',
});

export const submissionFailureRate = meter.createCounter('submission_failure_total', {
  description: 'Total number of failed submissions',
});

export const submissionQueueSize = meter.createUpDownCounter('submission_queue_size', {
  description: 'Number of submissions currently in processing queue',
});

export const submissionCodeQuality = meter.createHistogram('submission_code_quality_score', {
  description: 'Code quality score of submissions',
});

// Helper functions to record metrics
export const recordSubmission = (submissionType: string, userId: string) => {
  submissionCounter.add(1, { 
    submission_type: submissionType,
    user_id: userId 
  });
};

export const recordProcessingDuration = (duration: number, submissionType: string, success: boolean) => {
  submissionProcessingDuration.record(duration, { 
    submission_type: submissionType,
    success: success.toString()
  });
};

export const recordSubmissionResult = (success: boolean, submissionType: string, errorType?: string) => {
  const attributes = { submission_type: submissionType };
  
  if (success) {
    submissionSuccessRate.add(1, attributes);
  } else {
    submissionFailureRate.add(1, { 
      ...attributes, 
      error_type: errorType || 'unknown' 
    });
  }
};

export const updateQueueSize = (change: number) => {
  submissionQueueSize.add(change);
};

export const recordCodeQuality = (score: number, submissionId: string, submissionType: string) => {
  submissionCodeQuality.record(score, { 
    submission_id: submissionId,
    submission_type: submissionType 
  });
};