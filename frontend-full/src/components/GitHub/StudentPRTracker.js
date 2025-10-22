/**
 * Student PR Tracker Component
 * Displays individual student PR counts and activity
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import prTrackingService from '../../services/prTrackingService';
import './StudentPRTracker.css';

const StudentPRTracker = ({ studentId, studentName, compact = false }) => {
  const [prData, setPrData] = useState(null);
  const [progressAnalysis, setProgressAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchStudentData();

    // Subscribe to updates
    const handleUpdate = (updateData) => {
      if (updateData.type === 'student_updated' && updateData.studentId === studentId) {
        setPrData(updateData.data);
        setProgressAnalysis(prTrackingService.analyzeStudentProgress(updateData.data));
      }
    };

    prTrackingService.onUpdate(handleUpdate);

    return () => {
      prTrackingService.offUpdate(handleUpdate);
    };
  }, [studentId]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await prTrackingService.fetchStudentPRs(studentId);
      setPrData(data);
      
      const analysis = prTrackingService.analyzeStudentProgress(data);
      setProgressAnalysis(analysis);
    } catch (err) {
      console.error(`Error fetching PR data for student ${studentId}:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (score) => {
    if (score >= 80) return '#00ff88';
    if (score >= 60) return '#ffaa00';
    if (score >= 40) return '#ff6600';
    return '#ff4444';
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      case 'stable': return '➡️';
      case 'no_activity': return '😴';
      default: return '📊';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className={`student-pr-tracker ${compact ? 'compact' : ''} loading`}>
        <div className="loading-spinner"></div>
        <span>Loading PR data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`student-pr-tracker ${compact ? 'compact' : ''} error`}>
        <div className="error-content">
          <span className="error-icon">⚠️</span>
          <span className="error-message">Error: {error}</span>
          <button onClick={fetchStudentData} className="retry-btn">
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  if (!prData) {
    return (
      <div className={`student-pr-tracker ${compact ? 'compact' : ''} no-data`}>
        <span>No PR data available</span>
      </div>
    );
  }

  if (compact) {
    return (
      <motion.div 
        className="student-pr-tracker compact"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="compact-content">
          <div className="student-info">
            <span className="student-name">{studentName}</span>
            <span className="github-username">@{prData.githubUsername}</span>
          </div>
          
          <div className="pr-stats">
            <div className="stat-item">
              <span className="stat-value">{prData.totalPRs}</span>
              <span className="stat-label">PRs</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{prData.mergedPRs}</span>
              <span className="stat-label">Merged</span>
            </div>
          </div>

          {progressAnalysis && (
            <div className="progress-indicator">
              <div 
                className="progress-circle"
                style={{ 
                  background: `conic-gradient(${getProgressColor(progressAnalysis.progressScore)} ${progressAnalysis.progressScore * 3.6}deg, #333 0deg)`
                }}
              >
                <span className="progress-score">{progressAnalysis.progressScore}</span>
              </div>
              <span className="trend-icon">{getTrendIcon(progressAnalysis.trend)}</span>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="student-pr-tracker detailed"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="tracker-header">
        <div className="student-info">
          <h3 className="student-name">{studentName}</h3>
          <p className="github-username">@{prData.githubUsername}</p>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={() => setShowDetails(!showDetails)}
            className="details-toggle"
          >
            {showDetails ? '🔼' : '🔽'} Details
          </button>
          <button onClick={fetchStudentData} className="refresh-btn">
            🔄
          </button>
        </div>
      </div>

      <div className="pr-overview">
        <div className="pr-stats-grid">
          <div className="stat-card total">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">{prData.totalPRs}</div>
              <div className="stat-label">Total PRs</div>
            </div>
          </div>
          
          <div className="stat-card open">
            <div className="stat-icon">🔓</div>
            <div className="stat-content">
              <div className="stat-value">{prData.openPRs}</div>
              <div className="stat-label">Open</div>
            </div>
          </div>
          
          <div className="stat-card merged">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-value">{prData.mergedPRs}</div>
              <div className="stat-label">Merged</div>
            </div>
          </div>
          
          <div className="stat-card closed">
            <div className="stat-icon">❌</div>
            <div className="stat-content">
              <div className="stat-value">{prData.closedPRs}</div>
              <div className="stat-label">Closed</div>
            </div>
          </div>
        </div>

        <div className="activity-info">
          <div className="last-activity">
            <span className="activity-label">Last Activity:</span>
            <span className="activity-date">{formatDate(prData.lastActivity)}</span>
          </div>
        </div>
      </div>

      {progressAnalysis && (
        <div className="progress-analysis">
          <div className="progress-header">
            <h4>Progress Analysis</h4>
            <div className="progress-score-display">
              <div 
                className="score-circle"
                style={{ color: getProgressColor(progressAnalysis.progressScore) }}
              >
                {progressAnalysis.progressScore}/100
              </div>
              <span className="trend-indicator">
                {getTrendIcon(progressAnalysis.trend)} {progressAnalysis.trend}
              </span>
            </div>
          </div>

          <div className="insights">
            <div className="insights-section">
              <h5>📊 Key Insights</h5>
              <ul>
                {progressAnalysis.insights.map((insight, index) => (
                  <li key={index}>{insight}</li>
                ))}
              </ul>
            </div>

            <div className="recommendations-section">
              <h5>💡 Recommendations</h5>
              <ul>
                {progressAnalysis.recommendations.map((recommendation, index) => (
                  <li key={index}>{recommendation}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {showDetails && prData.prs.length > 0 && (
        <motion.div 
          className="pr-details"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h4>Recent Pull Requests</h4>
          <div className="pr-list">
            {prData.prs.slice(0, 5).map((pr, index) => (
              <motion.div 
                key={pr.id}
                className={`pr-item ${pr.state}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="pr-info">
                  <div className="pr-title">
                    <a href={pr.htmlUrl} target="_blank" rel="noopener noreferrer">
                      {pr.title}
                    </a>
                  </div>
                  <div className="pr-meta">
                    <span className="pr-repo">{pr.repository.fullName}</span>
                    <span className="pr-number">#{pr.number}</span>
                    <span className="pr-date">{formatDate(pr.createdAt)}</span>
                  </div>
                </div>
                <div className="pr-status">
                  <span className={`status-badge ${pr.state}`}>
                    {pr.state === 'open' ? '🔓' : pr.mergedAt ? '✅' : '❌'}
                    {pr.state}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
          
          {prData.prs.length > 5 && (
            <div className="pr-list-footer">
              <span>Showing 5 of {prData.prs.length} pull requests</span>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default StudentPRTracker;