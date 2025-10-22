import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

const Profile = () => {
  const [profileData, setProfileData] = useState(null);
  const [skillsData, setSkillsData] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [badges, setBadges] = useState([]);
  const [progressData, setProgressData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        // Mock profile data - in real app, this would come from API
        const mockProfile = {
          id: 'user_001',
          username: 'alex_chen',
          email: 'alex.chen@example.com',
          fullName: 'Alex Chen',
          role: 'student',
          avatar: '👨‍💻',
          bio: 'Passionate about DevOps and cloud security. Always learning new technologies.',
          location: 'San Francisco, CA',
          joinedDate: '2024-01-15',
          totalPoints: 2847,
          level: 12,
          currentXp: 847,
          xpToNextLevel: 1200,
          streaks: {
            current: 15,
            longest: 23,
            lastActivityDate: '2024-01-21'
          },
          leaderboardRank: 3,
          completedChallenges: 47,
          totalSubmissions: 89,
          averageScore: 87.5
        };

        const mockSkills = [
          { name: 'Docker', level: 85, category: 'Containerization', xp: 1250 },
          { name: 'Kubernetes', level: 72, category: 'Orchestration', xp: 980 },
          { name: 'AWS', level: 68, category: 'Cloud Platforms', xp: 890 },
          { name: 'CI/CD', level: 91, category: 'DevOps', xp: 1450 },
          { name: 'Security', level: 76, category: 'Cybersecurity', xp: 1100 },
          { name: 'Monitoring', level: 63, category: 'Observability', xp: 750 },
          { name: 'Terraform', level: 58, category: 'Infrastructure', xp: 680 },
          { name: 'Python', level: 82, category: 'Programming', xp: 1200 }
        ];

        const mockAchievements = [
          {
            id: 'ach_001',
            name: 'First Steps',
            description: 'Complete your first challenge',
            category: 'milestone',
            points: 100,
            earnedAt: '2024-01-15T10:30:00Z',
            icon: '🎯'
          },
          {
            id: 'ach_002',
            name: 'Security Expert',
            description: 'Score 90+ on 10 security challenges',
            category: 'quality',
            points: 500,
            earnedAt: '2024-01-18T14:20:00Z',
            icon: '🛡️'
          },
          {
            id: 'ach_003',
            name: 'Streak Master',
            description: 'Maintain a 20-day learning streak',
            category: 'consistency',
            points: 300,
            earnedAt: '2024-01-20T09:15:00Z',
            icon: '🔥'
          },
          {
            id: 'ach_004',
            name: 'Code Quality Champion',
            description: 'Achieve 95+ code quality score 5 times',
            category: 'quality',
            points: 400,
            earnedAt: '2024-01-19T16:45:00Z',
            icon: '⭐'
          }
        ];

        const mockBadges = [
          {
            id: 'badge_001',
            name: 'Docker Master',
            description: 'Mastered containerization concepts',
            category: 'coding',
            rarity: 'rare',
            points: 200,
            earnedAt: '2024-01-17T11:30:00Z',
            icon: '🐳'
          },
          {
            id: 'badge_002',
            name: 'Security Sentinel',
            description: 'Identified critical security vulnerabilities',
            category: 'security',
            rarity: 'epic',
            points: 350,
            earnedAt: '2024-01-19T13:20:00Z',
            icon: '🔒'
          },
          {
            id: 'badge_003',
            name: 'CI/CD Architect',
            description: 'Built complex deployment pipelines',
            category: 'performance',
            rarity: 'rare',
            points: 250,
            earnedAt: '2024-01-20T15:10:00Z',
            icon: '⚙️'
          },
          {
            id: 'badge_004',
            name: 'Cloud Navigator',
            description: 'Deployed applications across multiple cloud platforms',
            category: 'milestone',
            rarity: 'uncommon',
            points: 150,
            earnedAt: '2024-01-16T12:45:00Z',
            icon: '☁️'
          }
        ];

        const mockProgress = [
          { date: '2024-01-15', points: 1200, level: 8, submissions: 12 },
          { date: '2024-01-16', points: 1450, level: 9, submissions: 15 },
          { date: '2024-01-17', points: 1780, level: 10, submissions: 18 },
          { date: '2024-01-18', points: 2100, level: 11, submissions: 22 },
          { date: '2024-01-19', points: 2450, level: 11, submissions: 26 },
          { date: '2024-01-20', points: 2680, level: 12, submissions: 29 },
          { date: '2024-01-21', points: 2847, level: 12, submissions: 32 }
        ];

        setProfileData(mockProfile);
        setSkillsData(mockSkills);
        setAchievements(mockAchievements);
        setBadges(mockBadges);
        setProgressData(mockProgress);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching profile data:', error);
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  const handleSaveProfile = () => {
    // In real app, this would save to API
    setEditMode(false);
    // Show success notification
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <motion.div 
      className="profile-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-banner">
          <div className="profile-avatar-section">
            <div className="profile-avatar">
              <span className="avatar-emoji">{profileData.avatar}</span>
              <button className="avatar-edit-btn" onClick={() => setEditMode(!editMode)}>
                📷
              </button>
            </div>
            <div className="profile-basic-info">
              <h1 className="profile-name">{profileData.fullName}</h1>
              <p className="profile-username">@{profileData.username}</p>
              <p className="profile-role">{profileData.role}</p>
              {profileData.location && (
                <p className="profile-location">📍 {profileData.location}</p>
              )}
            </div>
          </div>
          
          <div className="profile-stats">
            <div className="stat-item">
              <div className="stat-value">{profileData.totalPoints.toLocaleString()}</div>
              <div className="stat-label">Total Points</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">#{profileData.leaderboardRank}</div>
              <div className="stat-label">Rank</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{profileData.level}</div>
              <div className="stat-label">Level</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{profileData.streaks.current}</div>
              <div className="stat-label">Streak</div>
            </div>
          </div>
        </div>

        {/* Level Progress Bar */}
        <div className="level-progress">
          <div className="level-info">
            <span className="current-level">Level {profileData.level}</span>
            <span className="xp-info">{profileData.currentXp} / {profileData.xpToNextLevel} XP</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${(profileData.currentXp / profileData.xpToNextLevel) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="profile-tabs">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <span className="tab-icon">📊</span>
          Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'skills' ? 'active' : ''}`}
          onClick={() => setActiveTab('skills')}
        >
          <span className="tab-icon">🎯</span>
          Skills
        </button>
        <button 
          className={`tab-btn ${activeTab === 'achievements' ? 'active' : ''}`}
          onClick={() => setActiveTab('achievements')}
        >
          <span className="tab-icon">🏆</span>
          Achievements
        </button>
        <button 
          className={`tab-btn ${activeTab === 'badges' ? 'active' : ''}`}
          onClick={() => setActiveTab('badges')}
        >
          <span className="tab-icon">🎖️</span>
          Badges
        </button>
        <button 
          className={`tab-btn ${activeTab === 'progress' ? 'active' : ''}`}
          onClick={() => setActiveTab('progress')}
        >
          <span className="tab-icon">📈</span>
          Progress
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
              <div className="overview-card bio-card">
                <h3>📝 About Me</h3>
                {editMode ? (
                  <textarea 
                    className="bio-edit"
                    defaultValue={profileData.bio}
                    placeholder="Tell us about yourself..."
                  />
                ) : (
                  <p>{profileData.bio}</p>
                )}
                {editMode && (
                  <button className="save-btn" onClick={handleSaveProfile}>
                    Save Changes
                  </button>
                )}
              </div>

              <div className="overview-card stats-card">
                <h3>📊 Quick Stats</h3>
                <div className="quick-stats">
                  <div className="quick-stat">
                    <span className="stat-icon">🎯</span>
                    <div>
                      <div className="stat-number">{profileData.completedChallenges}</div>
                      <div className="stat-text">Challenges Completed</div>
                    </div>
                  </div>
                  <div className="quick-stat">
                    <span className="stat-icon">📤</span>
                    <div>
                      <div className="stat-number">{profileData.totalSubmissions}</div>
                      <div className="stat-text">Total Submissions</div>
                    </div>
                  </div>
                  <div className="quick-stat">
                    <span className="stat-icon">⭐</span>
                    <div>
                      <div className="stat-number">{profileData.averageScore}%</div>
                      <div className="stat-text">Average Score</div>
                    </div>
                  </div>
                  <div className="quick-stat">
                    <span className="stat-icon">🔥</span>
                    <div>
                      <div className="stat-number">{profileData.streaks.longest}</div>
                      <div className="stat-text">Longest Streak</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overview-card recent-achievements">
                <h3>🏆 Recent Achievements</h3>
                <div className="recent-achievement-list">
                  {achievements.slice(0, 3).map((achievement) => (
                    <div key={achievement.id} className="recent-achievement-item">
                      <span className="achievement-icon">{achievement.icon}</span>
                      <div className="achievement-info">
                        <div className="achievement-name">{achievement.name}</div>
                        <div className="achievement-points">+{achievement.points} points</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Other tabs content would go here */}
      </div>

      <style jsx>{`
        .profile-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          color: #00ff88;
        }

        .profile-header {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border: 1px solid #00ff88;
          border-radius: 15px;
          padding: 30px;
          margin-bottom: 30px;
          box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
        }

        .profile-banner {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .profile-avatar-section {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .profile-avatar {
          position: relative;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: linear-gradient(45deg, #00ff88, #0066ff);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
        }

        .avatar-edit-btn {
          position: absolute;
          bottom: 0;
          right: 0;
          background: #00ff88;
          border: none;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          cursor: pointer;
          font-size: 14px;
        }

        .profile-basic-info h1 {
          margin: 0 0 5px 0;
          font-size: 28px;
        }

        .profile-username {
          color: #888;
          margin: 0 0 5px 0;
        }

        .profile-role {
          background: #00ff88;
          color: #000;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          display: inline-block;
          margin-bottom: 5px;
        }

        .profile-stats {
          display: flex;
          gap: 30px;
        }

        .stat-item {
          text-align: center;
        }

        .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: #00ff88;
        }

        .stat-label {
          font-size: 12px;
          color: #888;
          margin-top: 5px;
        }

        .level-progress {
          margin-top: 20px;
        }

        .level-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          font-size: 14px;
        }

        .progress-bar {
          height: 10px;
          background: #333;
          border-radius: 5px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #00ff88, #0066ff);
          transition: width 0.3s ease;
        }

        .profile-tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 30px;
          border-bottom: 1px solid #333;
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
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
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
        }

        .bio-card {
          grid-column: 1 / -1;
        }

        .bio-edit {
          width: 100%;
          background: #333;
          border: 1px solid #555;
          border-radius: 5px;
          padding: 10px;
          color: #fff;
          resize: vertical;
          min-height: 80px;
        }

        .save-btn {
          background: #00ff88;
          color: #000;
          border: none;
          padding: 8px 16px;
          border-radius: 5px;
          cursor: pointer;
          margin-top: 10px;
        }

        .quick-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .quick-stat {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .stat-icon {
          font-size: 20px;
        }

        .stat-number {
          font-size: 18px;
          font-weight: bold;
          color: #00ff88;
        }

        .stat-text {
          font-size: 12px;
          color: #888;
        }

        .recent-achievement-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .recent-achievement-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          background: #333;
          border-radius: 5px;
        }

        .achievement-icon {
          font-size: 20px;
        }

        .achievement-name {
          font-weight: bold;
        }

        .achievement-points {
          font-size: 12px;
          color: #00ff88;
        }

        .profile-loading {
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
          .profile-banner {
            flex-direction: column;
            gap: 20px;
          }

          .profile-stats {
            justify-content: space-around;
          }

          .overview-grid {
            grid-template-columns: 1fr;
          }

          .profile-tabs {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </motion.div>
  );
};

export default Profile;