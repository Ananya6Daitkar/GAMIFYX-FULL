import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

const Analytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [performanceMetrics, setPerformanceMetrics] = useState([]);
  const [skillAnalysis, setSkillAnalysis] = useState([]);
  const [timeAnalysis, setTimeAnalysis] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        // Mock analytics data
        const mockAnalytics = {
          totalSubmissions: 89,
          averageScore: 87.5,
          improvementRate: 12.3,
          timeSpent: 156, // hours
          streakDays: 15,
          completionRate: 94.2,
          skillsImproved: 8,
          challengesCompleted: 47,
          currentLevel: 12,
          nextLevelProgress: 70.6,
          learningVelocity: 8.4, // challenges per week
          consistencyScore: 92
        };

        const mockPerformanceMetrics = [
          { date: '2024-01-15', codeQuality: 78, security: 82, performance: 75, overall: 78.3 },
          { date: '2024-01-16', codeQuality: 81, security: 85, performance: 79, overall: 81.7 },
          { date: '2024-01-17', codeQuality: 83, security: 87, performance: 82, overall: 84.0 },
          { date: '2024-01-18', codeQuality: 85, security: 89, performance: 84, overall: 86.0 },
          { date: '2024-01-19', codeQuality: 87, security: 91, performance: 86, overall: 88.0 },
          { date: '2024-01-20', codeQuality: 89, security: 93, performance: 88, overall: 90.0 },
          { date: '2024-01-21', codeQuality: 91, security: 95, performance: 90, overall: 92.0 }
        ];

        setAnalyticsData(mockAnalytics);
        setPerformanceMetrics(mockPerformanceMetrics);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching analytics data:', error);
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [timeRange]);

  const getMetricColor = (value) => {
    if (value >= 90) return '#00ff88';
    if (value >= 75) return '#ffaa00';
    if (value >= 60) return '#ff6600';
    return '#ff4444';
  };

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="loading-spinner"></div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  return (
    <motion.div 
      className="analytics-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="analytics-header">
        <div className="header-content">
          <h1 className="analytics-title">
            <span className="title-icon">📈</span>
            Learning Analytics
          </h1>
          <p className="analytics-subtitle">
            AI-powered insights into your learning journey and performance trends
          </p>
        </div>
        
        <div className="time-range-selector">
          <button 
            className={`range-btn ${timeRange === '7d' ? 'active' : ''}`}
            onClick={() => setTimeRange('7d')}
          >
            7 Days
          </button>
          <button 
            className={`range-btn ${timeRange === '30d' ? 'active' : ''}`}
            onClick={() => setTimeRange('30d')}
          >
            30 Days
          </button>
          <button 
            className={`range-btn ${timeRange === '90d' ? 'active' : ''}`}
            onClick={() => setTimeRange('90d')}
          >
            90 Days
          </button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="metrics-overview">
        <div className="metric-card">
          <div className="metric-icon">📊</div>
          <div className="metric-content">
            <div className="metric-value">{analyticsData.averageScore}%</div>
            <div className="metric-label">Average Score</div>
            <div className="metric-trend positive">+{analyticsData.improvementRate}%</div>
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-icon">🎯</div>
          <div className="metric-content">
            <div className="metric-value">{analyticsData.challengesCompleted}</div>
            <div className="metric-label">Challenges Completed</div>
            <div className="metric-trend positive">+12 this month</div>
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-icon">⏱️</div>
          <div className="metric-content">
            <div className="metric-value">{analyticsData.timeSpent}h</div>
            <div className="metric-label">Time Invested</div>
            <div className="metric-trend neutral">{analyticsData.learningVelocity} challenges/week</div>
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-icon">🔥</div>
          <div className="metric-content">
            <div className="metric-value">{analyticsData.streakDays}</div>
            <div className="metric-label">Current Streak</div>
            <div className="metric-trend positive">Consistency: {analyticsData.consistencyScore}%</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="analytics-tabs">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <span className="tab-icon">📊</span>
          Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'performance' ? 'active' : ''}`}
          onClick={() => setActiveTab('performance')}
        >
          <span className="tab-icon">📈</span>
          Performance
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <motion.div 
            className="overview-section"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="overview-grid">
              <div className="overview-card progress-card">
                <h3>🎯 Learning Progress</h3>
                <div className="progress-stats">
                  <div className="progress-item">
                    <span className="progress-label">Level {analyticsData.currentLevel}</span>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${analyticsData.nextLevelProgress}%` }}
                      ></div>
                    </div>
                    <span className="progress-percentage">{analyticsData.nextLevelProgress}%</span>
                  </div>
                  <div className="progress-item">
                    <span className="progress-label">Completion Rate</span>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${analyticsData.completionRate}%` }}
                      ></div>
                    </div>
                    <span className="progress-percentage">{analyticsData.completionRate}%</span>
                  </div>
                </div>
              </div>

              <div className="overview-card recent-performance">
                <h3>📈 Recent Performance Trend</h3>
                <div className="mini-chart">
                  {performanceMetrics.slice(-7).map((metric, index) => (
                    <div key={index} className="chart-bar">
                      <div 
                        className="bar-fill"
                        style={{ 
                          height: `${metric.overall}%`,
                          backgroundColor: getMetricColor(metric.overall)
                        }}
                      ></div>
                      <span className="bar-label">{metric.date.slice(-2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'performance' && (
          <motion.div 
            className="performance-section"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h2>📈 Performance Analytics</h2>
            
            <div className="performance-charts">
              <div className="chart-card">
                <h3>Overall Performance Trend</h3>
                <div className="performance-chart">
                  {performanceMetrics.map((metric, index) => (
                    <div key={index} className="performance-bar">
                      <div 
                        className="bar-segment overall"
                        style={{ height: `${metric.overall}%` }}
                      ></div>
                      <span className="bar-date">{metric.date.slice(-2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <style jsx>{`
        .analytics-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          color: #00ff88;
        }

        .analytics-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
        }

        .header-content {
          flex: 1;
        }

        .analytics-title {
          font-size: 36px;
          margin: 0 0 10px 0;
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .title-icon {
          font-size: 40px;
        }

        .analytics-subtitle {
          color: #888;
          font-size: 16px;
          margin: 0;
        }

        .time-range-selector {
          display: flex;
          gap: 5px;
          background: #333;
          border-radius: 8px;
          padding: 4px;
        }

        .range-btn {
          background: none;
          border: none;
          color: #888;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .range-btn.active {
          background: #00ff88;
          color: #000;
        }

        .metrics-overview {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .metric-card {
          background: #1a1a2e;
          border: 1px solid #333;
          border-radius: 10px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .metric-icon {
          font-size: 24px;
        }

        .metric-value {
          font-size: 24px;
          font-weight: bold;
          color: #00ff88;
        }

        .metric-label {
          font-size: 12px;
          color: #888;
          margin-bottom: 5px;
        }

        .metric-trend {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 10px;
        }

        .metric-trend.positive {
          background: rgba(0, 255, 136, 0.2);
          color: #00ff88;
        }

        .metric-trend.neutral {
          background: rgba(255, 170, 0, 0.2);
          color: #ffaa00;
        }

        .analytics-tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 30px;
          border-bottom: 1px solid #333;
          flex-wrap: wrap;
        }

        .tab-btn {
          background: none;
          border: none;
          color: #888;
          padding: 15px 20px;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .tab-btn.active {
          color: #00ff88;
          border-bottom-color: #00ff88;
        }

        .tab-btn:hover {
          color: #00ff88;
        }

        .overview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }

        .overview-card {
          background: #1a1a2e;
          border: 1px solid #333;
          border-radius: 10px;
          padding: 20px;
        }

        .overview-card h3 {
          margin: 0 0 15px 0;
          color: #00ff88;
          font-size: 16px;
        }

        .progress-stats {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .progress-item {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .progress-label {
          min-width: 80px;
          font-size: 12px;
        }

        .progress-bar {
          flex: 1;
          height: 8px;
          background: #333;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #00ff88, #0066ff);
          transition: width 0.3s ease;
        }

        .progress-percentage {
          min-width: 40px;
          font-size: 12px;
          text-align: right;
        }

        .mini-chart {
          display: flex;
          align-items: end;
          gap: 5px;
          height: 100px;
        }

        .chart-bar {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
        }

        .bar-fill {
          width: 100%;
          min-height: 5px;
          border-radius: 2px 2px 0 0;
        }

        .bar-label {
          font-size: 10px;
          color: #888;
          margin-top: 5px;
        }

        .performance-charts {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }

        .chart-card {
          background: #1a1a2e;
          border: 1px solid #333;
          border-radius: 10px;
          padding: 20px;
        }

        .chart-card h3 {
          margin: 0 0 15px 0;
          color: #00ff88;
          font-size: 16px;
        }

        .performance-chart {
          display: flex;
          align-items: end;
          gap: 5px;
          height: 150px;
        }

        .performance-bar {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
        }

        .bar-segment {
          width: 100%;
          min-height: 5px;
          border-radius: 2px 2px 0 0;
        }

        .bar-segment.overall {
          background: #00ff88;
        }

        .bar-date {
          font-size: 10px;
          color: #888;
          margin-top: 5px;
        }

        .analytics-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 400px;
          color: #00ff88;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #333;
          border-top: 3px solid #00ff88;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .analytics-header {
            flex-direction: column;
            gap: 20px;
          }

          .metrics-overview {
            grid-template-columns: 1fr;
          }

          .analytics-tabs {
            flex-direction: column;
          }

          .tab-btn {
            justify-content: center;
          }
        }
      `}</style>
    </motion.div>
  );
};

export default Analytics;