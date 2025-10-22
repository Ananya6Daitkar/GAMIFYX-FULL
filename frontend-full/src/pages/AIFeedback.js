import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import './AIFeedback.css';

const AIFeedback = () => {
  const [feedbackData, setFeedbackData] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('feedback');

  useEffect(() => {
    const fetchAIData = async () => {
      try {
        const [feedbackRes, predictionsRes] = await Promise.all([
          axios.get('/api/ai-feedback/metrics'),
          axios.get('/api/ai-feedback/predictions/batch')
        ]);

        // Enhanced AI feedback data
        const mockFeedback = [
          {
            id: 1,
            studentName: 'Alex Chen',
            submission: 'Docker Security Lab',
            aiScore: 92,
            feedback: 'Excellent implementation of container security best practices. Consider adding network policies for enhanced security.',
            suggestions: [
              'Add resource limits to prevent container resource exhaustion',
              'Implement proper secret management using Kubernetes secrets',
              'Consider using distroless images for smaller attack surface'
            ],
            codeIssues: [
              { line: 15, severity: 'warning', message: 'Consider using specific version tags instead of latest' },
              { line: 23, severity: 'info', message: 'Good use of multi-stage builds for optimization' }
            ],
            timestamp: new Date('2024-01-21T10:30:00'),
            category: 'security'
          },
          {
            id: 2,
            studentName: 'Sarah Kim',
            submission: 'Kubernetes Deployment',
            aiScore: 78,
            feedback: 'Good understanding of Kubernetes concepts. Deployment configuration needs improvement in resource management.',
            suggestions: [
              'Add readiness and liveness probes for better health checking',
              'Configure proper resource requests and limits',
              'Implement horizontal pod autoscaling for better scalability'
            ],
            codeIssues: [
              { line: 8, severity: 'error', message: 'Missing required resource limits' },
              { line: 12, severity: 'warning', message: 'Consider adding health check endpoints' }
            ],
            timestamp: new Date('2024-01-21T09:15:00'),
            category: 'kubernetes'
          },
          {
            id: 3,
            studentName: 'Mike Johnson',
            submission: 'CI/CD Pipeline Setup',
            aiScore: 85,
            feedback: 'Well-structured pipeline with good separation of concerns. Security scanning integration is commendable.',
            suggestions: [
              'Add parallel job execution for faster builds',
              'Implement artifact caching for dependency management',
              'Consider adding deployment approval gates'
            ],
            codeIssues: [
              { line: 34, severity: 'info', message: 'Excellent use of security scanning tools' },
              { line: 45, severity: 'warning', message: 'Consider adding timeout configurations' }
            ],
            timestamp: new Date('2024-01-21T08:45:00'),
            category: 'cicd'
          }
        ];

        // Enhanced predictions data
        const mockPredictions = [
          {
            studentId: 1,
            studentName: 'Alex Chen',
            riskScore: 0.15,
            confidence: 0.92,
            recommendation: 'Excellent progress! Continue current learning pace.',
            predictedGrade: 'A',
            strengths: ['Security practices', 'Code quality', 'Documentation'],
            improvements: ['Advanced networking concepts'],
            nextChallenges: ['Service mesh implementation', 'Advanced monitoring']
          },
          {
            studentId: 2,
            studentName: 'Sarah Kim',
            riskScore: 0.35,
            confidence: 0.88,
            recommendation: 'Good progress with room for improvement in resource management.',
            predictedGrade: 'B+',
            strengths: ['Basic concepts', 'Problem solving'],
            improvements: ['Resource optimization', 'Error handling'],
            nextChallenges: ['Performance tuning', 'Scaling strategies']
          },
          {
            studentId: 3,
            studentName: 'Mike Johnson',
            riskScore: 0.72,
            confidence: 0.85,
            recommendation: 'Needs additional support. Consider scheduling 1-on-1 sessions.',
            predictedGrade: 'C+',
            strengths: ['Basic understanding'],
            improvements: ['Code structure', 'Best practices', 'Testing'],
            nextChallenges: ['Fundamental concepts review', 'Guided practice']
          }
        ];

        // AI-generated alerts
        const mockAlerts = [
          {
            id: 1,
            type: 'performance',
            severity: 'high',
            message: 'Student Mike Johnson has not submitted assignments for 3 days',
            recommendation: 'Schedule check-in meeting to identify blockers',
            timestamp: new Date('2024-01-21T11:00:00'),
            studentName: 'Mike Johnson'
          },
          {
            id: 2,
            type: 'code_quality',
            severity: 'medium',
            message: 'Recurring security vulnerabilities detected in submissions',
            recommendation: 'Provide additional security training resources',
            timestamp: new Date('2024-01-21T10:45:00'),
            studentName: 'Emma Davis'
          },
          {
            id: 3,
            type: 'engagement',
            severity: 'low',
            message: 'Decreased participation in collaborative exercises',
            recommendation: 'Encourage peer programming sessions',
            timestamp: new Date('2024-01-21T10:30:00'),
            studentName: 'David Wilson'
          }
        ];

        setFeedbackData(mockFeedback);
        setPredictions(mockPredictions);
        setAlerts(mockAlerts);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching AI data:', error);
        setLoading(false);
      }
    };

    fetchAIData();
    const interval = setInterval(fetchAIData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="ai-feedback-loading">
        <div className="loading-spinner"></div>
        <p>Loading AI insights...</p>
      </div>
    );
  }

  return (
    <motion.div 
      className="ai-feedback-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="ai-feedback-header">
        <h1 className="ai-feedback-title">
          <span className="title-icon">🤖</span>
          AI-Powered Learning Assistant
        </h1>
        <p className="ai-feedback-subtitle">
          Intelligent monitoring, smart feedback, and performance predictions for enhanced learning.
        </p>
      </div>

      {/* AI Stats Overview */}
      <div className="ai-stats">
        <div className="stat-card">
          <div className="stat-icon">🧠</div>
          <div className="stat-content">
            <div className="stat-value">{feedbackData.length}</div>
            <div className="stat-label">AI Reviews</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{predictions.length}</div>
            <div className="stat-label">Predictions</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-value">{alerts.length}</div>
            <div className="stat-label">Active Alerts</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <div className="stat-value">94%</div>
            <div className="stat-label">AI Accuracy</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="ai-tabs">
        <button 
          className={`tab-btn ${activeTab === 'feedback' ? 'active' : ''}`}
          onClick={() => setActiveTab('feedback')}
        >
          <span className="tab-icon">💬</span>
          Smart Feedback
        </button>
        <button 
          className={`tab-btn ${activeTab === 'predictions' ? 'active' : ''}`}
          onClick={() => setActiveTab('predictions')}
        >
          <span className="tab-icon">🔮</span>
          Performance Predictions
        </button>
        <button 
          className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          <span className="tab-icon">🚨</span>
          AI Alerts
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'feedback' && (
          <motion.div 
            className="feedback-section"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h2>🧠 AI Code Reviews & Feedback</h2>
            <div className="feedback-grid">
              {feedbackData.map((feedback, index) => (
                <motion.div
                  key={feedback.id}
                  className="feedback-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="feedback-header">
                    <div className="student-info">
                      <h3>{feedback.studentName}</h3>
                      <p>{feedback.submission}</p>
                    </div>
                    <div className="ai-score">
                      <div className="score-circle">
                        <span className="score-value">{feedback.aiScore}</span>
                        <span className="score-max">/100</span>
                      </div>
                    </div>
                  </div>

                  <div className="feedback-content">
                    <div className="ai-feedback">
                      <h4>🤖 AI Analysis</h4>
                      <p>{feedback.feedback}</p>
                    </div>

                    <div className="suggestions">
                      <h4>💡 Smart Suggestions</h4>
                      <ul>
                        {feedback.suggestions.map((suggestion, idx) => (
                          <li key={idx}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="code-issues">
                      <h4>🔍 Code Analysis</h4>
                      {feedback.codeIssues.map((issue, idx) => (
                        <div key={idx} className={`issue issue-${issue.severity}`}>
                          <span className="issue-line">Line {issue.line}:</span>
                          <span className="issue-message">{issue.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="feedback-footer">
                    <span className="category-tag">{feedback.category}</span>
                    <span className="timestamp">{feedback.timestamp.toLocaleString()}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'predictions' && (
          <motion.div 
            className="predictions-section"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h2>🔮 AI Performance Predictions</h2>
            <div className="predictions-grid">
              {predictions.map((prediction, index) => (
                <motion.div
                  key={prediction.studentId}
                  className={`prediction-card risk-${prediction.riskScore > 0.6 ? 'high' : prediction.riskScore > 0.3 ? 'medium' : 'low'}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="prediction-header">
                    <h3>{prediction.studentName}</h3>
                    <div className="predicted-grade">{prediction.predictedGrade}</div>
                  </div>

                  <div className="risk-assessment">
                    <div className="risk-score">
                      <span className="risk-label">Risk Score:</span>
                      <div className="risk-bar">
                        <div 
                          className="risk-fill"
                          style={{ width: `${prediction.riskScore * 100}%` }}
                        ></div>
                      </div>
                      <span className="risk-value">{Math.round(prediction.riskScore * 100)}%</span>
                    </div>
                    <div className="confidence">
                      <span className="confidence-label">AI Confidence:</span>
                      <span className="confidence-value">{Math.round(prediction.confidence * 100)}%</span>
                    </div>
                  </div>

                  <div className="recommendation">
                    <h4>🎯 AI Recommendation</h4>
                    <p>{prediction.recommendation}</p>
                  </div>

                  <div className="analysis">
                    <div className="strengths">
                      <h4>💪 Strengths</h4>
                      <ul>
                        {prediction.strengths.map((strength, idx) => (
                          <li key={idx}>{strength}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="improvements">
                      <h4>📈 Areas for Improvement</h4>
                      <ul>
                        {prediction.improvements.map((improvement, idx) => (
                          <li key={idx}>{improvement}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="next-challenges">
                    <h4>🚀 Recommended Next Challenges</h4>
                    <div className="challenge-tags">
                      {prediction.nextChallenges.map((challenge, idx) => (
                        <span key={idx} className="challenge-tag">{challenge}</span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'alerts' && (
          <motion.div 
            className="alerts-section"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h2>🚨 AI-Generated Alerts</h2>
            <div className="alerts-list">
              {alerts.map((alert, index) => (
                <motion.div
                  key={alert.id}
                  className={`alert-card severity-${alert.severity}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="alert-header">
                    <div className="alert-type">
                      <span className="alert-icon">
                        {alert.type === 'performance' ? '📉' : 
                         alert.type === 'code_quality' ? '🔍' : '👥'}
                      </span>
                      <span className="alert-type-text">{alert.type.replace('_', ' ')}</span>
                    </div>
                    <div className={`alert-severity severity-${alert.severity}`}>
                      {alert.severity}
                    </div>
                  </div>

                  <div className="alert-content">
                    <h4>{alert.studentName}</h4>
                    <p className="alert-message">{alert.message}</p>
                    <div className="alert-recommendation">
                      <span className="rec-icon">💡</span>
                      <span className="rec-text">{alert.recommendation}</span>
                    </div>
                  </div>

                  <div className="alert-footer">
                    <span className="alert-time">{alert.timestamp.toLocaleString()}</span>
                    <div className="alert-actions">
                      <button className="action-btn resolve-btn">Resolve</button>
                      <button className="action-btn contact-btn">Contact Student</button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default AIFeedback;