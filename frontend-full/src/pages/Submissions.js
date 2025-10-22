import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import './Submissions.css';

const Submissions = () => {
  const [submissions, setSubmissions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Helper function to safely format dates
  const formatDate = (timestamp) => {
    try {
      if (!timestamp) return 'N/A';
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      return date.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const response = await axios.get('/api/submissions');
        
        // Convert API timestamps to Date objects
        const apiSubmissions = response.data.map(submission => ({
          ...submission,
          timestamp: new Date(submission.timestamp)
        }));
        
        // Expanded submissions data
        const allSubmissions = [
          ...apiSubmissions,
          { 
            id: 3, 
            title: 'Kubernetes Monitoring Setup', 
            status: 'completed', 
            score: 88, 
            timestamp: new Date('2024-01-20'),
            difficulty: 'intermediate',
            category: 'monitoring',
            feedback: 'Great implementation of Prometheus and Grafana integration.',
            timeSpent: '2h 15m'
          },
          { 
            id: 4, 
            title: 'CI/CD Pipeline Configuration', 
            status: 'in-progress', 
            score: null, 
            timestamp: new Date('2024-01-21'),
            difficulty: 'advanced',
            category: 'cicd',
            feedback: null,
            timeSpent: '1h 30m'
          },
          { 
            id: 5, 
            title: 'Microservices Architecture', 
            status: 'failed', 
            score: 45, 
            timestamp: new Date('2024-01-19'),
            difficulty: 'advanced',
            category: 'architecture',
            feedback: 'Service discovery implementation needs improvement.',
            timeSpent: '3h 45m'
          },
          { 
            id: 6, 
            title: 'Container Security Hardening', 
            status: 'completed', 
            score: 92, 
            timestamp: new Date('2024-01-18'),
            difficulty: 'expert',
            category: 'security',
            feedback: 'Excellent security practices implemented.',
            timeSpent: '2h 30m'
          },
          { 
            id: 7, 
            title: 'Load Balancer Configuration', 
            status: 'pending', 
            score: null, 
            timestamp: new Date('2024-01-22'),
            difficulty: 'intermediate',
            category: 'networking',
            feedback: null,
            timeSpent: '45m'
          },
        ];
        
        setSubmissions(allSubmissions);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching submissions:', error);
        
        // Set fallback data if API fails
        const fallbackSubmissions = [
          { 
            id: 1, 
            title: 'Docker Security Lab', 
            status: 'completed', 
            score: 95, 
            timestamp: new Date('2024-01-20'),
            difficulty: 'intermediate',
            category: 'security',
            feedback: 'Excellent implementation of security best practices.',
            timeSpent: '2h 15m'
          },
          { 
            id: 2, 
            title: 'Kubernetes Deployment', 
            status: 'in-progress', 
            score: null, 
            timestamp: new Date('2024-01-21'),
            difficulty: 'advanced',
            category: 'deployment',
            feedback: null,
            timeSpent: '1h 30m'
          }
        ];
        
        setSubmissions(fallbackSubmissions);
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, []);

  const filteredSubmissions = submissions.filter(submission => {
    if (filter === 'all') return true;
    return submission.status === filter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#00FF80';
      case 'in-progress': return '#00FFFF';
      case 'failed': return '#FF6B6B';
      case 'pending': return '#FFA500';
      default: return '#808080';
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'beginner': return '#00FF80';
      case 'intermediate': return '#FFA500';
      case 'advanced': return '#FF6B6B';
      case 'expert': return '#8000FF';
      default: return '#808080';
    }
  };

  if (loading) {
    return (
      <div className="submissions-loading">
        <div className="loading-spinner"></div>
        <p>Loading submissions...</p>
      </div>
    );
  }

  return (
    <motion.div 
      className="submissions-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="submissions-header">
        <h1 className="submissions-title">
          <span className="title-icon">📝</span>
          Submissions
        </h1>
        <p className="submissions-subtitle">
          Manage your code submissions and track your learning progress.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="submissions-stats">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{submissions.length}</div>
            <div className="stat-label">Total Submissions</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{submissions.filter(s => s.status === 'completed').length}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <div className="stat-value">{submissions.filter(s => s.status === 'in-progress').length}</div>
            <div className="stat-label">In Progress</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <div className="stat-value">
              {Math.round(submissions.filter(s => s.score).reduce((sum, s) => sum + s.score, 0) / submissions.filter(s => s.score).length) || 0}
            </div>
            <div className="stat-label">Avg Score</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="submissions-filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({submissions.length})
        </button>
        <button 
          className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          Completed ({submissions.filter(s => s.status === 'completed').length})
        </button>
        <button 
          className={`filter-btn ${filter === 'in-progress' ? 'active' : ''}`}
          onClick={() => setFilter('in-progress')}
        >
          In Progress ({submissions.filter(s => s.status === 'in-progress').length})
        </button>
        <button 
          className={`filter-btn ${filter === 'failed' ? 'active' : ''}`}
          onClick={() => setFilter('failed')}
        >
          Failed ({submissions.filter(s => s.status === 'failed').length})
        </button>
        <button 
          className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          Pending ({submissions.filter(s => s.status === 'pending').length})
        </button>
      </div>

      {/* New Submission Button */}
      <div className="new-submission">
        <button className="new-submission-btn">
          <span className="btn-icon">➕</span>
          New Submission
        </button>
      </div>

      {/* Submissions List */}
      <div className="submissions-list">
        {filteredSubmissions.map((submission, index) => (
          <motion.div
            key={submission.id}
            className="submission-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02, y: -5 }}
          >
            <div className="submission-header">
              <div className="submission-title-section">
                <h3 className="submission-title">{submission.title}</h3>
                <div className="submission-meta">
                  <span className="submission-category">{submission.category}</span>
                  <span className="submission-time">{submission.timeSpent}</span>
                </div>
              </div>
              <div className="submission-status-section">
                <div 
                  className="submission-status"
                  style={{ backgroundColor: getStatusColor(submission.status) }}
                >
                  {submission.status.replace('-', ' ')}
                </div>
                <div 
                  className="submission-difficulty"
                  style={{ color: getDifficultyColor(submission.difficulty) }}
                >
                  {submission.difficulty}
                </div>
              </div>
            </div>

            <div className="submission-content">
              <div className="submission-info">
                <div className="info-item">
                  <span className="info-label">Submitted:</span>
                  <span className="info-value">{formatDate(submission.timestamp)}</span>
                </div>
                {submission.score && (
                  <div className="info-item">
                    <span className="info-label">Score:</span>
                    <span className="info-value score">{submission.score}/100</span>
                  </div>
                )}
              </div>

              {submission.feedback && (
                <div className="submission-feedback">
                  <div className="feedback-header">
                    <span className="feedback-icon">🤖</span>
                    <span className="feedback-title">AI Feedback</span>
                  </div>
                  <p className="feedback-text">{submission.feedback}</p>
                </div>
              )}

              <div className="submission-actions">
                <button className="action-btn view-btn">
                  <span className="btn-icon">👁️</span>
                  View Details
                </button>
                {submission.status === 'in-progress' && (
                  <button className="action-btn continue-btn">
                    <span className="btn-icon">▶️</span>
                    Continue
                  </button>
                )}
                {submission.status === 'failed' && (
                  <button className="action-btn retry-btn">
                    <span className="btn-icon">🔄</span>
                    Retry
                  </button>
                )}
                <button className="action-btn download-btn">
                  <span className="btn-icon">📥</span>
                  Download
                </button>
              </div>
            </div>

            {submission.score && (
              <div className="submission-progress">
                <div className="progress-bar">
                  <motion.div 
                    className="progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${submission.score}%` }}
                    transition={{ duration: 1, delay: index * 0.1 }}
                    style={{ 
                      backgroundColor: submission.score >= 80 ? '#00FF80' : 
                                     submission.score >= 60 ? '#FFA500' : '#FF6B6B'
                    }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {filteredSubmissions.length === 0 && (
        <div className="no-submissions">
          <div className="no-submissions-icon">📝</div>
          <h3>No submissions found</h3>
          <p>Start your learning journey by creating your first submission!</p>
          <button className="create-first-btn">Create First Submission</button>
        </div>
      )}
    </motion.div>
  );
};

export default Submissions;