/**
 * Class PR Overview Component
 * Displays class-wide GitHub PR statistics and insights
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import prTrackingService from '../../services/prTrackingService';
import './ClassPROverview.css';

const ClassPROverview = ({ refreshTrigger }) => {
  const [classStats, setClassStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchClassStatistics();

    // Subscribe to updates
    const handleUpdate = (updateData) => {
      if (updateData.type === 'all_students_updated') {
        fetchClassStatistics();
      }
    };

    prTrackingService.onUpdate(handleUpdate);

    return () => {
      prTrackingService.offUpdate(handleUpdate);
    };
  }, [refreshTrigger]);

  const fetchClassStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const stats = await prTrackingService.getClassStatistics();
      setClassStats(stats);
    } catch (err) {
      console.error('Error fetching class statistics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (state) => {
    switch (state) {
      case 'open': return '🔓';
      case 'closed': return '❌';
      case 'merged': return '✅';
      default: return '📝';
    }
  };

  if (loading) {
    return (
      <div className="class-pr-overview loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <span>Loading class statistics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="class-pr-overview error">
        <div className="error-content">
          <span className="error-icon">⚠️</span>
          <span className="error-message">Error: {error}</span>
          <button onClick={fetchClassStatistics} className="retry-btn">
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  if (!classStats) {
    return (
      <div className="class-pr-overview no-data">
        <span>No class data available</span>
      </div>
    );
  }

  return (
    <motion.div 
      className="class-pr-overview"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="overview-header">
        <h2>📊 Class GitHub Activity Overview</h2>
        <button onClick={fetchClassStatistics} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card total-students">
          <div className="metric-icon">👥</div>
          <div className="metric-content">
            <div className="metric-value">{classStats.totalStudents}</div>
            <div className="metric-label">Total Students</div>
          </div>
        </div>

        <div className="metric-card active-students">
          <div className="metric-icon">🚀</div>
          <div className="metric-content">
            <div className="metric-value">{classStats.activeStudents}</div>
            <div className="metric-label">Active Students</div>
            <div className="metric-subtitle">{classStats.activityRate}% activity rate</div>
          </div>
        </div>

        <div className="metric-card total-prs">
          <div className="metric-icon">📝</div>
          <div className="metric-content">
            <div className="metric-value">{classStats.totalPRs}</div>
            <div className="metric-label">Total Pull Requests</div>
          </div>
        </div>

        <div className="metric-card average-prs">
          <div className="metric-icon">📊</div>
          <div className="metric-content">
            <div className="metric-value">{classStats.averagePRsPerStudent}</div>
            <div className="metric-label">Avg PRs per Student</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="overview-tabs">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          🏆 Top Contributors
        </button>
        <button 
          className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          🕒 Recent Activity
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <motion.div 
            className="overview-content"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="overview-grid">
              <div className="overview-card engagement-card">
                <h3>📈 Class Engagement</h3>
                <div className="engagement-stats">
                  <div className="engagement-item">
                    <span className="engagement-label">Active Students:</span>
                    <div className="engagement-bar">
                      <div 
                        className="engagement-fill"
                        style={{ width: `${classStats.activityRate}%` }}
                      ></div>
                    </div>
                    <span className="engagement-value">{classStats.activityRate}%</span>
                  </div>
                </div>
                
                <div className="engagement-insights">
                  {classStats.activityRate >= 80 && (
                    <div className="insight positive">
                      🎉 Excellent class engagement! Most students are actively contributing.
                    </div>
                  )}
                  {classStats.activityRate >= 50 && classStats.activityRate < 80 && (
                    <div className="insight neutral">
                      👍 Good engagement level. Consider encouraging inactive students.
                    </div>
                  )}
                  {classStats.activityRate < 50 && (
                    <div className="insight negative">
                      ⚠️ Low engagement. Consider additional support or motivation strategies.
                    </div>
                  )}
                </div>
              </div>

              <div className="overview-card distribution-card">
                <h3>📊 PR Distribution</h3>
                <div className="distribution-stats">
                  <div className="distribution-item">
                    <span className="distribution-label">Total PRs:</span>
                    <span className="distribution-value">{classStats.totalPRs}</span>
                  </div>
                  <div className="distribution-item">
                    <span className="distribution-label">Average per Student:</span>
                    <span className="distribution-value">{classStats.averagePRsPerStudent}</span>
                  </div>
                  <div className="distribution-item">
                    <span className="distribution-label">Students with 0 PRs:</span>
                    <span className="distribution-value">{classStats.totalStudents - classStats.activeStudents}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'leaderboard' && (
          <motion.div 
            className="leaderboard-content"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h3>🏆 Top Contributors</h3>
            {classStats.topContributors.length === 0 ? (
              <div className="no-contributors">
                <p>No active contributors yet. Encourage students to start making pull requests!</p>
              </div>
            ) : (
              <div className="contributors-list">
                {classStats.topContributors.map((contributor, index) => (
                  <motion.div
                    key={contributor.studentId}
                    className={`contributor-item rank-${index + 1}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="contributor-rank">
                      <span className="rank-number">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </span>
                    </div>
                    
                    <div className="contributor-info">
                      <div className="contributor-name">{contributor.studentName}</div>
                      <div className="contributor-username">@{contributor.githubUsername}</div>
                    </div>
                    
                    <div className="contributor-stats">
                      <div className="stat-item">
                        <span className="stat-value">{contributor.totalPRs}</span>
                        <span className="stat-label">Total PRs</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-value">{contributor.mergedPRs}</span>
                        <span className="stat-label">Merged</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'activity' && (
          <motion.div 
            className="activity-content"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h3>🕒 Recent Activity (Last 7 Days)</h3>
            {classStats.recentActivity.length === 0 ? (
              <div className="no-activity">
                <p>No recent activity. Encourage students to create pull requests!</p>
              </div>
            ) : (
              <div className="activity-list">
                {classStats.recentActivity.map((activity, index) => (
                  <motion.div
                    key={`${activity.repository}-${activity.prNumber}-${index}`}
                    className="activity-item"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="activity-icon">
                      {getActivityIcon(activity.state)}
                    </div>
                    
                    <div className="activity-info">
                      <div className="activity-title">
                        <strong>{activity.studentName}</strong> created PR #{activity.prNumber}
                      </div>
                      <div className="activity-details">
                        <span className="pr-title">{activity.prTitle}</span>
                        <span className="repository">in {activity.repository}</span>
                      </div>
                    </div>
                    
                    <div className="activity-meta">
                      <span className="activity-time">{formatDate(activity.createdAt)}</span>
                      <span className={`activity-status ${activity.state}`}>
                        {activity.state}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default ClassPROverview;