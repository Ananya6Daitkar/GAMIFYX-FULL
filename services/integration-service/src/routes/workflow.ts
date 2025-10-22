import { Router, Request, Response } from 'express';
import { trace } from '@opentelemetry/api';
import { logger } from '../utils/logger';
import { WorkflowOrchestrator } from '../orchestrator/WorkflowOrchestrator';
import { WebSocketManager } from '../websocket/WebSocketManager';
import { SubmissionWorkflowData } from '../types/workflow';

const router = Router();
const tracer = trace.getTracer('integration-service');

// Execute submission workflow
router.post('/submission', async (req: Request, res: Response) => {
  const span = tracer.startSpan('workflow_submission_endpoint');
  const orchestrator: WorkflowOrchestrator = req.app.locals.orchestrator;
  const wsManager: WebSocketManager = req.app.locals.wsManager;

  try {
    const workflowData: SubmissionWorkflowData = req.body;
    
    // Validate required fields
    if (!workflowData.submissionId || !workflowData.userId || !workflowData.submissionType) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required fields: submissionId, userId, submissionType',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!workflowData.repositoryUrl && !workflowData.codeContent) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Either repositoryUrl or codeContent is required',
          timestamp: new Date().toISOString()
        }
      });
    }

    logger.info(`Starting submission workflow for ${workflowData.submissionId}`);

    // Notify user that workflow has started
    wsManager.broadcastToUser(workflowData.userId, {
      type: 'workflow_started',
      data: {
        submissionId: workflowData.submissionId,
        status: 'processing',
        timestamp: new Date().toISOString()
      }
    });

    // Execute workflow asynchronously
    const workflowPromise = orchestrator.executeSubmissionWorkflow(workflowData);
    
    // Don't wait for completion, return immediately
    res.status(202).json({
      message: 'Workflow started successfully',
      submissionId: workflowData.submissionId,
      status: 'processing',
      timestamp: new Date().toISOString()
    });

    // Handle workflow completion in background
    workflowPromise
      .then(result => {
        logger.info(`Workflow completed for ${workflowData.submissionId}:`, { success: result.success });
        
        // Notify user of completion
        wsManager.broadcastToUser(workflowData.userId, {
          type: 'workflow_completed',
          data: {
            submissionId: workflowData.submissionId,
            success: result.success,
            result: result.success ? result.steps : undefined,
            error: result.error,
            timestamp: new Date().toISOString()
          }
        });

        // Broadcast to relevant channels
        wsManager.broadcastToChannel('submissions', {
          type: 'submission_processed',
          data: {
            submissionId: workflowData.submissionId,
            userId: workflowData.userId,
            success: result.success,
            timestamp: new Date().toISOString()
          }
        });
      })
      .catch(error => {
        logger.error(`Workflow failed for ${workflowData.submissionId}:`, error);
        
        // Notify user of failure
        wsManager.broadcastToUser(workflowData.userId, {
          type: 'workflow_failed',
          data: {
            submissionId: workflowData.submissionId,
            error: error.message,
            timestamp: new Date().toISOString()
          }
        });
      });

  } catch (error) {
    logger.error('Workflow endpoint error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to start workflow',
        timestamp: new Date().toISOString()
      }
    });
  } finally {
    span.end();
  }
});

// Get workflow status
router.get('/submission/:submissionId/status', async (req: Request, res: Response) => {
  const span = tracer.startSpan('workflow_status_endpoint');
  
  try {
    const { submissionId } = req.params;
    
    // In a real implementation, you would query a database or cache for status
    // For now, return a placeholder response
    res.json({
      submissionId,
      status: 'processing', // This would be dynamic
      startedAt: new Date().toISOString(),
      steps: {
        validation: { completed: true, success: true },
        submission: { completed: true, success: true },
        feedback: { completed: false, success: null },
        gamification: { completed: false, success: null },
        analytics: { completed: false, success: null }
      }
    });
  } catch (error) {
    logger.error('Status endpoint error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get workflow status',
        timestamp: new Date().toISOString()
      }
    });
  } finally {
    span.end();
  }
});

// Retry failed workflow
router.post('/submission/:submissionId/retry', async (req: Request, res: Response) => {
  const span = tracer.startSpan('workflow_retry_endpoint');
  const orchestrator: WorkflowOrchestrator = req.app.locals.orchestrator;
  
  try {
    const { submissionId } = req.params;
    const workflowData: SubmissionWorkflowData = req.body;
    
    workflowData.submissionId = submissionId;
    
    logger.info(`Retrying workflow for submission ${submissionId}`);
    
    const result = await orchestrator.executeSubmissionWorkflow(workflowData);
    
    res.json({
      message: 'Workflow retry completed',
      submissionId,
      success: result.success,
      result: result.success ? result.steps : undefined,
      error: result.error,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Retry endpoint error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retry workflow',
        timestamp: new Date().toISOString()
      }
    });
  } finally {
    span.end();
  }
});

export { router as workflowRouter };