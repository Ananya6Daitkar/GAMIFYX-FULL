const axios = require('axios');
const WebSocket = require('ws');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';
const WS_URL = process.env.WS_URL || 'ws://localhost:8080/ws';

describe('End-to-End Submission Workflow', () => {
  let authToken;
  let userId;
  let ws;
  let wsMessages = [];

  beforeAll(async () => {
    // Setup WebSocket connection
    ws = new WebSocket(WS_URL);
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      wsMessages.push(message);
      console.log('WebSocket message received:', message);
    });

    await new Promise((resolve) => {
      ws.on('open', resolve);
    });

    // Register and authenticate a test user
    const registerResponse = await axios.post(`${API_BASE_URL}/api/auth/register`, {
      email: 'test@example.com',
      password: 'testpassword123',
      firstName: 'Test',
      lastName: 'User',
      role: 'student'
    });

    const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: 'test@example.com',
      password: 'testpassword123'
    });

    authToken = loginResponse.data.token;
    userId = loginResponse.data.user.id;

    // Authenticate WebSocket connection
    ws.send(JSON.stringify({
      type: 'authenticate',
      data: { userId, token: authToken }
    }));

    // Subscribe to relevant channels
    ws.send(JSON.stringify({
      type: 'subscribe',
      data: { channels: ['submissions', 'feedback', 'gamification'] }
    }));

    // Wait for authentication confirmation
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    if (ws) {
      ws.close();
    }
  });

  test('Complete submission workflow with code content', async () => {
    const submissionId = `test-submission-${Date.now()}`;
    const codeContent = `
      function fibonacci(n) {
        if (n <= 1) return n;
        return fibonacci(n - 1) + fibonacci(n - 2);
      }
      
      module.exports = fibonacci;
    `;

    // Step 1: Submit code for processing
    const workflowResponse = await axios.post(
      `${API_BASE_URL}/api/workflow/submission`,
      {
        submissionId,
        userId,
        codeContent,
        submissionType: 'assignment',
        metadata: {
          language: 'javascript',
          difficulty: 'medium',
          tags: ['algorithms', 'recursion']
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    expect(workflowResponse.status).toBe(202);
    expect(workflowResponse.data.submissionId).toBe(submissionId);
    expect(workflowResponse.data.status).toBe('processing');

    // Step 2: Wait for workflow completion (with timeout)
    const workflowCompleted = await waitForWorkflowCompletion(submissionId, 60000);
    expect(workflowCompleted).toBe(true);

    // Step 3: Verify submission was created
    const submissionResponse = await axios.get(
      `${API_BASE_URL}/api/submissions/${submissionId}`,
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );

    expect(submissionResponse.status).toBe(200);
    expect(submissionResponse.data.id).toBe(submissionId);
    expect(submissionResponse.data.status).toBe('completed');

    // Step 4: Verify feedback was generated
    const feedbackResponse = await axios.get(
      `${API_BASE_URL}/api/feedback/${submissionId}`,
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );

    expect(feedbackResponse.status).toBe(200);
    expect(feedbackResponse.data.submissionId).toBe(submissionId);
    expect(feedbackResponse.data.overallScore).toBeGreaterThan(0);
    expect(Array.isArray(feedbackResponse.data.suggestions)).toBe(true);

    // Step 5: Verify gamification updates
    const gamificationResponse = await axios.get(
      `${API_BASE_URL}/api/gamification/profile/${userId}`,
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );

    expect(gamificationResponse.status).toBe(200);
    expect(gamificationResponse.data.totalPoints).toBeGreaterThan(0);

    // Step 6: Verify analytics data
    const analyticsResponse = await axios.get(
      `${API_BASE_URL}/api/analytics/performance/${userId}`,
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );

    expect(analyticsResponse.status).toBe(200);
    expect(Array.isArray(analyticsResponse.data.submissions)).toBe(true);
    expect(analyticsResponse.data.submissions.some(s => s.submissionId === submissionId)).toBe(true);

    // Step 7: Verify WebSocket notifications were received
    const workflowStartedMessage = wsMessages.find(m => 
      m.type === 'workflow_started' && m.data.submissionId === submissionId
    );
    expect(workflowStartedMessage).toBeDefined();

    const workflowCompletedMessage = wsMessages.find(m => 
      m.type === 'workflow_completed' && m.data.submissionId === submissionId
    );
    expect(workflowCompletedMessage).toBeDefined();
    expect(workflowCompletedMessage.data.success).toBe(true);
  }, 90000); // 90 second timeout

  test('Workflow handles service failures gracefully', async () => {
    const submissionId = `test-failure-${Date.now()}`;
    
    // Submit with invalid data to trigger failures
    const workflowResponse = await axios.post(
      `${API_BASE_URL}/api/workflow/submission`,
      {
        submissionId,
        userId,
        codeContent: '', // Empty code should trigger validation failure
        submissionType: 'assignment'
      },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    expect(workflowResponse.status).toBe(202);

    // Wait for workflow to complete (should fail)
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Check that failure was handled gracefully
    const failureMessage = wsMessages.find(m => 
      m.type === 'workflow_failed' && m.data.submissionId === submissionId
    );
    
    // Should either fail gracefully or complete with partial success
    expect(failureMessage || wsMessages.find(m => 
      m.type === 'workflow_completed' && m.data.submissionId === submissionId
    )).toBeDefined();
  }, 30000);

  test('WebSocket real-time updates work correctly', async () => {
    const initialMessageCount = wsMessages.length;

    // Send a ping message
    ws.send(JSON.stringify({ type: 'ping' }));

    // Wait for pong response
    await new Promise(resolve => setTimeout(resolve, 1000));

    const pongMessage = wsMessages.find(m => m.type === 'pong');
    expect(pongMessage).toBeDefined();
    expect(wsMessages.length).toBeGreaterThan(initialMessageCount);
  });

  // Helper function to wait for workflow completion
  async function waitForWorkflowCompletion(submissionId, timeout = 60000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const completedMessage = wsMessages.find(m => 
        (m.type === 'workflow_completed' || m.type === 'workflow_failed') && 
        m.data.submissionId === submissionId
      );
      
      if (completedMessage) {
        return completedMessage.type === 'workflow_completed';
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return false; // Timeout
  }
});

describe('Service Health Checks', () => {
  test('All services are healthy', async () => {
    const services = [
      'user',
      'submission', 
      'gamification',
      'feedback',
      'analytics',
      'integration'
    ];

    for (const service of services) {
      const response = await axios.get(`${API_BASE_URL}/api/health/${service}`);
      expect(response.status).toBe(200);
      expect(response.data.status).toBe('healthy');
    }
  });

  test('API Gateway is properly routing requests', async () => {
    const response = await axios.get(`${API_BASE_URL}/health`);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('healthy');
  });
});

describe('Load Balancing and Circuit Breaker', () => {
  test('System handles high load gracefully', async () => {
    const promises = [];
    const concurrentRequests = 10;

    // Create multiple concurrent workflow requests
    for (let i = 0; i < concurrentRequests; i++) {
      const submissionId = `load-test-${Date.now()}-${i}`;
      const promise = axios.post(
        `${API_BASE_URL}/api/workflow/submission`,
        {
          submissionId,
          userId,
          codeContent: `console.log('Load test ${i}');`,
          submissionType: 'assignment'
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      promises.push(promise);
    }

    const responses = await Promise.allSettled(promises);
    
    // Most requests should succeed (some might be rate limited)
    const successfulResponses = responses.filter(r => 
      r.status === 'fulfilled' && r.value.status === 202
    );
    
    expect(successfulResponses.length).toBeGreaterThan(concurrentRequests * 0.7); // At least 70% success
  }, 30000);
});