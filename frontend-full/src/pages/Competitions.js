import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

const Competitions = () => {
  const [competitions, setCompetitions] = useState([]);
  const [userParticipation, setUserParticipation] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [selectedCompetition, setSelectedCompetition] = useState(null);

  useEffect(() => {
    const fetchCompetitionsData = async () => {
      try {
        // Mock competitions data
        const mockCompetitions = [
          {
            id: 'comp_001',
            title: 'Hacktoberfest 2024',
            description: 'Contribute to open source projects and earn exclusive rewards',
            type: 'external',
            platform: 'GitHub',
            status: 'active',
            startDate: '2024-10-01',
            endDate: '2024-10-31',
            participants: 15420,
            prizes: ['Digital Badges', 'T-Shirts', 'Stickers'],
            difficulty: 'beginner',
            tags: ['open-source', 'git', 'collaboration'],
            icon: '🎃',
            registrationUrl: 'https://hacktoberfest.com',
            requirements: [
              'Make 4 valid pull requests to participating repositories',
              'Follow Hacktoberfest quality standards',
              'Complete by October 31st'
            ]
          },
          {
            id: 'comp_002',
            title: 'DevOps Challenge 2024',
            description: 'Build and deploy a complete CI/CD pipeline',
            type: 'internal',
            platform: 'GamifyX',
            status: 'active',
            startDate: '2024-01-15',
            endDate: '2024-02-15',
            participants: 234,
            prizes: ['$500 Prize', 'Certification', 'Mentorship'],
            difficulty: 'intermediate',
            tags: ['devops', 'ci-cd', 'docker', 'kubernetes'],
            icon: '⚙️',
            requirements: [
              'Deploy application using Docker containers',
              'Implement automated testing pipeline',
              'Set up monitoring and logging'
            ]
          },
          {
            id: 'comp_003',
            title: 'Security CTF Championship',
            description: 'Capture the flag cybersecurity competition',
            type: 'internal',
            platform: 'GamifyX',
            status: 'active',
            startDate: '2024-01-20',
            endDate: '2024-01-27',
            participants: 89,
            prizes: ['$1000 Prize', 'Security Certification', 'Job Interviews'],
            difficulty: 'advanced',
            tags: ['security', 'ctf', 'penetration-testing'],
            icon: '🛡️',
            requirements: [
              'Solve security challenges across multiple categories',
              'Document your methodology',
              'Present findings to judges'
            ]
          },
          {
            id: 'comp_004',
            title: 'Cloud Architecture Contest',
            description: 'Design scalable cloud infrastructure solutions',
            type: 'external',
            platform: 'AWS',
            status: 'upcoming',
            startDate: '2024-02-01',
            endDate: '2024-02-28',
            participants: 0,
            prizes: ['AWS Credits', 'Certification Vouchers', 'Recognition'],
            difficulty: 'intermediate',
            tags: ['aws', 'cloud', 'architecture', 'scalability'],
            icon: '☁️',
            registrationUrl: 'https://aws.amazon.com/competitions',
            requirements: [
              'Design multi-tier cloud architecture',
              'Implement cost optimization strategies',
              'Ensure high availability and security'
            ]
          },
          {
            id: 'comp_005',
            title: 'GitLab Innovation Challenge',
            description: 'Build innovative DevOps solutions using GitLab',
            type: 'external',
            platform: 'GitLab',
            status: 'completed',
            startDate: '2023-12-01',
            endDate: '2023-12-31',
            participants: 567,
            prizes: ['GitLab Swag', 'Premium Licenses', 'Mentorship'],
            difficulty: 'intermediate',
            tags: ['gitlab', 'innovation', 'devops'],
            icon: '🦊',
            requirements: [
              'Create innovative GitLab CI/CD solution',
              'Document implementation process',
              'Share with community'
            ]
          }
        ];

        const mockUserParticipation = [
          {
            competitionId: 'comp_001',
            status: 'registered',
            progress: 75,
            rank: 1247,
            submissions: 3,
            lastActivity: '2024-01-21T14:30:00Z'
          },
          {
            competitionId: 'comp_002',
            status: 'participating',
            progress: 45,
            rank: 23,
            submissions: 2,
            lastActivity: '2024-01-20T16:45:00Z'
          },
          {
            competitionId: 'comp_005',
            status: 'completed',
            progress: 100,
            rank: 45,
            submissions: 5,
            lastActivity: '2023-12-30T10:15:00Z',
            finalScore: 87
          }
        ];

        const mockLeaderboard = [
          {
            rank: 1,
            username: 'devops_master',
            points: 2847,
            competitions: 12,
            wins: 3,
            avatar: '👑'
          },
          {
            rank: 2,
            username: 'cloud_ninja',
            points: 2654,
            competitions: 8,
            wins: 2,
            avatar: '🥷'
          },
          {
            rank: 3,
            username: 'security_guru',
            points: 2456,
            competitions: 15,
            wins: 4,
            avatar: '🛡️'
          },
          {
            rank: 4,
            username: 'alex_chen',
            points: 2234,
            competitions: 6,
            wins: 1,
            avatar: '👨‍💻'
          },
          {
            rank: 5,
            username: 'pipeline_pro',
            points: 2156,
            competitions: 9,
            wins: 2,
            avatar: '⚙️'
          }
        ];

        setCompetitions(mockCompetitions);
        setUserParticipation(mockUserParticipation);
        setLeaderboard(mockLeaderboard);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching competitions data:', error);
        setLoading(false);
      }
    };

    fetchCompetitionsData();
  }, []);

  const getFilteredCompetitions = () => {
    switch (activeTab) {
      case 'active':
        return competitions.filter(comp => comp.status === 'active');
      case 'upcoming':
        return competitions.filter(comp => comp.status === 'upcoming');
      case 'completed':
        return competitions.filter(comp => comp.status === 'completed');
      case 'my-competitions':
        return competitions.filter(comp => 
          userParticipation.some(up => up.competitionId === comp.id)
        );
      default:
        return competitions;
    }
  };

  const getUserParticipation = (competitionId) => {
    return userParticipation.find(up => up.competitionId === competitionId);
  };

  const handleJoinCompetition = (competition) => {
    if (competition.type === 'external' && competition.registrationUrl) {
      window.open(competition.registrationUrl, '_blank');
    } else {
      // Handle internal competition registration
      console.log('Joining internal competition:', competition.id);
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'beginner': return '#00ff88';
      case 'intermediate': return '#ffaa00';
      case 'advanced': return '#ff4444';
      default: return '#888';
    }
  };

  if (loading) {
    return (
      <div className="competitions-loading">
        <div className="loading-spinner"></div>
        <p>Loading competitions...</p>
      </div>
    );
  }

  return (
    <motion.div 
      className="competitions-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="competitions-header">
        <h1 className="competitions-title">
          <span className="title-icon">⚔️</span>
          Coding Competitions
        </h1>
        <p className="competitions-subtitle">
          Join competitions, showcase your skills, and compete with developers worldwide
        </p>
      </div>

      {/* Stats Overview */}
      <div className="competitions-stats">
        <div className="stat-card">
          <div className="stat-icon">🏆</div>
          <div className="stat-content">
            <div className="stat-value">{competitions.length}</div>
            <div className="stat-label">Total Competitions</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <div className="stat-value">{competitions.filter(c => c.status === 'active').length}</div>
            <div className="stat-label">Active Now</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-value">{userParticipation.length}</div>
            <div className="stat-label">My Participations</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🥇</div>
          <div className="stat-content">
            <div className="stat-value">4</div>
            <div className="stat-label">Current Rank</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="competitions-tabs">
        <button 
          className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          <span className="tab-icon">🔥</span>
          Active
        </button>
        <button 
          className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          <span className="tab-icon">📅</span>
          Upcoming
        </button>
        <button 
          className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          <span className="tab-icon">✅</span>
          Completed
        </button>
        <button 
          className={`tab-btn ${activeTab === 'my-competitions' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-competitions')}
        >
          <span className="tab-icon">👤</span>
          My Competitions
        </button>
        <button 
          className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          <span className="tab-icon">🏆</span>
          Leaderboard
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab !== 'leaderboard' && (
          <motion.div 
            className="competitions-section"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="competitions-grid">
              {getFilteredCompetitions().map((competition, index) => {
                const participation = getUserParticipation(competition.id);
                return (
                  <motion.div
                    key={competition.id}
                    className={`competition-card ${competition.status}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="competition-header">
                      <div className="competition-icon">{competition.icon}</div>
                      <div className="competition-meta">
                        <span className={`competition-type ${competition.type}`}>
                          {competition.type}
                        </span>
                        <span className="competition-platform">{competition.platform}</span>
                      </div>
                    </div>

                    <div className="competition-content">
                      <h3 className="competition-title">{competition.title}</h3>
                      <p className="competition-description">{competition.description}</p>

                      <div className="competition-details">
                        <div className="detail-item">
                          <span className="detail-icon">📅</span>
                          <span className="detail-text">
                            {new Date(competition.startDate).toLocaleDateString()} - 
                            {new Date(competition.endDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-icon">👥</span>
                          <span className="detail-text">{competition.participants.toLocaleString()} participants</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-icon">🎯</span>
                          <span 
                            className="difficulty-badge"
                            style={{ backgroundColor: getDifficultyColor(competition.difficulty) }}
                          >
                            {competition.difficulty}
                          </span>
                        </div>
                      </div>

                      <div className="competition-tags">
                        {competition.tags.map((tag, idx) => (
                          <span key={idx} className="tag">{tag}</span>
                        ))}
                      </div>

                      <div className="competition-prizes">
                        <h4>🏆 Prizes</h4>
                        <ul>
                          {competition.prizes.map((prize, idx) => (
                            <li key={idx}>{prize}</li>
                          ))}
                        </ul>
                      </div>

                      {participation && (
                        <div className="participation-status">
                          <div className="participation-header">
                            <span className={`status-badge ${participation.status}`}>
                              {participation.status}
                            </span>
                            {participation.rank && (
                              <span className="rank-badge">Rank #{participation.rank}</span>
                            )}
                          </div>
                          {participation.progress !== undefined && (
                            <div className="progress-section">
                              <div className="progress-info">
                                <span>Progress: {participation.progress}%</span>
                                <span>Submissions: {participation.submissions}</span>
                              </div>
                              <div className="progress-bar">
                                <div 
                                  className="progress-fill"
                                  style={{ width: `${participation.progress}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="competition-footer">
                      {!participation && competition.status === 'active' && (
                        <button 
                          className="join-btn"
                          onClick={() => handleJoinCompetition(competition)}
                        >
                          {competition.type === 'external' ? 'Register Now' : 'Join Competition'}
                        </button>
                      )}
                      <button 
                        className="details-btn"
                        onClick={() => setSelectedCompetition(competition)}
                      >
                        View Details
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeTab === 'leaderboard' && (
          <motion.div 
            className="leaderboard-section"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h2>🏆 Global Competition Leaderboard</h2>
            <div className="leaderboard-list">
              {leaderboard.map((entry, index) => (
                <motion.div
                  key={entry.username}
                  className={`leaderboard-item ${entry.username === 'alex_chen' ? 'current-user' : ''}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="rank-section">
                    <div className={`rank-number rank-${entry.rank}`}>
                      {entry.rank <= 3 ? (
                        <span className="medal">
                          {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                        </span>
                      ) : (
                        entry.rank
                      )}
                    </div>
                  </div>

                  <div className="user-section">
                    <div className="user-avatar">{entry.avatar}</div>
                    <div className="user-info">
                      <div className="username">{entry.username}</div>
                      <div className="user-stats">
                        {entry.competitions} competitions • {entry.wins} wins
                      </div>
                    </div>
                  </div>

                  <div className="points-section">
                    <div className="points-value">{entry.points.toLocaleString()}</div>
                    <div className="points-label">points</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Competition Details Modal */}
      {selectedCompetition && (
        <div className="modal-overlay" onClick={() => setSelectedCompetition(null)}>
          <motion.div 
            className="competition-modal"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{selectedCompetition.icon} {selectedCompetition.title}</h2>
              <button 
                className="close-btn"
                onClick={() => setSelectedCompetition(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-content">
              <p className="modal-description">{selectedCompetition.description}</p>
              
              <div className="modal-section">
                <h3>📋 Requirements</h3>
                <ul className="requirements-list">
                  {selectedCompetition.requirements.map((req, idx) => (
                    <li key={idx}>{req}</li>
                  ))}
                </ul>
              </div>

              <div className="modal-section">
                <h3>🏆 Prizes</h3>
                <ul className="prizes-list">
                  {selectedCompetition.prizes.map((prize, idx) => (
                    <li key={idx}>{prize}</li>
                  ))}
                </ul>
              </div>

              <div className="modal-section">
                <h3>📊 Competition Stats</h3>
                <div className="modal-stats">
                  <div className="modal-stat">
                    <span className="stat-label">Participants:</span>
                    <span className="stat-value">{selectedCompetition.participants.toLocaleString()}</span>
                  </div>
                  <div className="modal-stat">
                    <span className="stat-label">Difficulty:</span>
                    <span 
                      className="difficulty-badge"
                      style={{ backgroundColor: getDifficultyColor(selectedCompetition.difficulty) }}
                    >
                      {selectedCompetition.difficulty}
                    </span>
                  </div>
                  <div className="modal-stat">
                    <span className="stat-label">Platform:</span>
                    <span className="stat-value">{selectedCompetition.platform}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              {selectedCompetition.status === 'active' && (
                <button 
                  className="join-btn"
                  onClick={() => handleJoinCompetition(selectedCompetition)}
                >
                  {selectedCompetition.type === 'external' ? 'Register Now' : 'Join Competition'}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}

      <style jsx>{`
        .competitions-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          color: #00ff88;
        }

        .competitions-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .competitions-title {
          font-size: 36px;
          margin: 0 0 10px 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
        }

        .title-icon {
          font-size: 40px;
        }

        .competitions-subtitle {
          color: #888;
          font-size: 16px;
          margin: 0;
        }

        .competitions-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: #1a1a2e;
          border: 1px solid #333;
          border-radius: 10px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .stat-icon {
          font-size: 24px;
        }

        .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: #00ff88;
        }

        .stat-label {
          font-size: 12px;
          color: #888;
        }

        .competitions-tabs {
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

        .competitions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 20px;
        }

        .competition-card {
          background: #1a1a2e;
          border: 1px solid #333;
          border-radius: 15px;
          padding: 20px;
          transition: all 0.3s ease;
        }

        .competition-card:hover {
          border-color: #00ff88;
          box-shadow: 0 0 20px rgba(0, 255, 136, 0.2);
        }

        .competition-card.active {
          border-color: #00ff88;
        }

        .competition-card.upcoming {
          border-color: #ffaa00;
        }

        .competition-card.completed {
          border-color: #666;
          opacity: 0.8;
        }

        .competition-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 15px;
        }

        .competition-icon {
          font-size: 32px;
        }

        .competition-meta {
          display: flex;
          flex-direction: column;
          gap: 5px;
          align-items: flex-end;
        }

        .competition-type {
          padding: 4px 8px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: bold;
        }

        .competition-type.internal {
          background: #00ff88;
          color: #000;
        }

        .competition-type.external {
          background: #0066ff;
          color: #fff;
        }

        .competition-platform {
          font-size: 12px;
          color: #888;
        }

        .competition-title {
          font-size: 20px;
          margin: 0 0 10px 0;
          color: #00ff88;
        }

        .competition-description {
          color: #ccc;
          margin: 0 0 15px 0;
          line-height: 1.4;
        }

        .competition-details {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 15px;
        }

        .detail-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .detail-icon {
          font-size: 16px;
        }

        .difficulty-badge {
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: bold;
          color: #000;
        }

        .competition-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-bottom: 15px;
        }

        .tag {
          background: #333;
          color: #888;
          padding: 4px 8px;
          border-radius: 10px;
          font-size: 10px;
        }

        .competition-prizes {
          margin-bottom: 15px;
        }

        .competition-prizes h4 {
          margin: 0 0 8px 0;
          font-size: 14px;
          color: #00ff88;
        }

        .competition-prizes ul {
          margin: 0;
          padding-left: 20px;
          font-size: 12px;
          color: #ccc;
        }

        .participation-status {
          background: #333;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 15px;
        }

        .participation-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: bold;
        }

        .status-badge.registered {
          background: #ffaa00;
          color: #000;
        }

        .status-badge.participating {
          background: #00ff88;
          color: #000;
        }

        .status-badge.completed {
          background: #666;
          color: #fff;
        }

        .rank-badge {
          background: #0066ff;
          color: #fff;
          padding: 4px 8px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: bold;
        }

        .progress-section {
          margin-top: 10px;
        }

        .progress-info {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          margin-bottom: 5px;
        }

        .progress-bar {
          height: 6px;
          background: #555;
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #00ff88;
          transition: width 0.3s ease;
        }

        .competition-footer {
          display: flex;
          gap: 10px;
        }

        .join-btn, .details-btn {
          flex: 1;
          padding: 10px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s ease;
        }

        .join-btn {
          background: #00ff88;
          color: #000;
        }

        .join-btn:hover {
          background: #00cc6a;
        }

        .details-btn {
          background: #333;
          color: #fff;
          border: 1px solid #555;
        }

        .details-btn:hover {
          background: #444;
        }

        .leaderboard-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .leaderboard-item {
          background: #1a1a2e;
          border: 1px solid #333;
          border-radius: 10px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .leaderboard-item.current-user {
          border-color: #00ff88;
          background: rgba(0, 255, 136, 0.1);
        }

        .rank-section {
          min-width: 60px;
          text-align: center;
        }

        .rank-number {
          font-size: 24px;
          font-weight: bold;
        }

        .rank-1, .rank-2, .rank-3 {
          color: #ffaa00;
        }

        .medal {
          font-size: 32px;
        }

        .user-section {
          display: flex;
          align-items: center;
          gap: 15px;
          flex: 1;
        }

        .user-avatar {
          font-size: 32px;
        }

        .username {
          font-size: 18px;
          font-weight: bold;
          color: #00ff88;
        }

        .user-stats {
          font-size: 12px;
          color: #888;
        }

        .points-section {
          text-align: right;
        }

        .points-value {
          font-size: 20px;
          font-weight: bold;
          color: #00ff88;
        }

        .points-label {
          font-size: 12px;
          color: #888;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .competition-modal {
          background: #1a1a2e;
          border: 1px solid #00ff88;
          border-radius: 15px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #333;
        }

        .modal-header h2 {
          margin: 0;
          color: #00ff88;
        }

        .close-btn {
          background: none;
          border: none;
          color: #888;
          font-size: 20px;
          cursor: pointer;
        }

        .close-btn:hover {
          color: #00ff88;
        }

        .modal-content {
          padding: 20px;
        }

        .modal-description {
          color: #ccc;
          margin-bottom: 20px;
          line-height: 1.5;
        }

        .modal-section {
          margin-bottom: 20px;
        }

        .modal-section h3 {
          color: #00ff88;
          margin: 0 0 10px 0;
          font-size: 16px;
        }

        .requirements-list, .prizes-list {
          margin: 0;
          padding-left: 20px;
          color: #ccc;
        }

        .modal-stats {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .modal-stat {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-footer {
          padding: 20px;
          border-top: 1px solid #333;
          text-align: center;
        }

        .competitions-loading {
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
          .competitions-grid {
            grid-template-columns: 1fr;
          }

          .competitions-tabs {
            flex-direction: column;
          }

          .tab-btn {
            justify-content: center;
          }

          .competition-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }

          .competition-meta {
            align-items: flex-start;
          }
        }
      `}</style>
    </motion.div>
  );
};

export default Competitions;