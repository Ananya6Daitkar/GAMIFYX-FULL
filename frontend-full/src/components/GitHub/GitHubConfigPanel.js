/**
 * GitHub Configuration Panel
 * Allows teachers to configure GitHub integration settings
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import githubService from '../../services/githubService';
import prTrackingService from '../../services/prTrackingService';
import './GitHubConfigPanel.css';

const GitHubConfigPanel = ({ onConfigUpdate }) => {
  const [token, setToken] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [repositories, setRepositories] = useState([]);
  const [selectedRepos, setSelectedRepos] = useState([]);
  const [studentMappings, setStudentMappings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('token');
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    // Load existing token on component mount
    const existingToken = githubService.getAuthToken();
    if (existingToken) {
      setToken(existingToken);
      validateToken(existingToken);
    }

    // Load existing configuration
    loadConfiguration();
  }, []);

  const loadConfiguration = () => {
    try {
      const savedRepos = localStorage.getItem('github_monitored_repos');
      const savedMappings = localStorage.getItem('github_student_mappings');

      if (savedRepos) {
        const repos = JSON.parse(savedRepos);
        setSelectedRepos(repos);
        prTrackingService.setMonitoredRepositories(repos);
      }

      if (savedMappings) {
        const mappings = JSON.parse(savedMappings);
        setStudentMappings(mappings);
        prTrackingService.setStudentMappings(mappings);
      }
    } catch (error) {
      console.error('Error loading GitHub configuration:', error);
    }
  };

  const validateToken = async (tokenToValidate = token) => {
    if (!tokenToValidate.trim()) return;

    setIsValidating(true);
    try {
      githubService.setAuthToken(tokenToValidate);
      const valid = await githubService.validateToken();
      
      if (valid) {
        const user = await githubService.getAuthenticatedUser();
        setUserInfo(user);
        setIsValid(true);
        
        // Notify parent component
        if (onConfigUpdate) {
          onConfigUpdate({ tokenValid: true, userInfo: user });
        }
      } else {
        setIsValid(false);
        setUserInfo(null);
      }
    } catch (error) {
      console.error('Token validation error:', error);
      setIsValid(false);
      setUserInfo(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleTokenSubmit = (e) => {
    e.preventDefault();
    validateToken();
  };

  const searchRepositories = async () => {
    if (!searchQuery.trim() || !isValid) return;

    setIsSearching(true);
    try {
      const results = await githubService.searchRepositories(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Repository search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const addRepository = (repo) => {
    const repoFullName = repo.fullName;
    if (!selectedRepos.includes(repoFullName)) {
      const newRepos = [...selectedRepos, repoFullName];
      setSelectedRepos(newRepos);
      
      // Save to localStorage
      localStorage.setItem('github_monitored_repos', JSON.stringify(newRepos));
      
      // Update service
      prTrackingService.setMonitoredRepositories(newRepos);
      
      if (onConfigUpdate) {
        onConfigUpdate({ repositories: newRepos });
      }
    }
  };

  const removeRepository = (repoFullName) => {
    const newRepos = selectedRepos.filter(repo => repo !== repoFullName);
    setSelectedRepos(newRepos);
    
    // Save to localStorage
    localStorage.setItem('github_monitored_repos', JSON.stringify(newRepos));
    
    // Update service
    prTrackingService.setMonitoredRepositories(newRepos);
    
    if (onConfigUpdate) {
      onConfigUpdate({ repositories: newRepos });
    }
  };

  const addStudentMapping = () => {
    const newMapping = {
      id: Date.now().toString(),
      studentId: '',
      studentName: '',
      githubUsername: ''
    };
    setStudentMappings([...studentMappings, newMapping]);
  };

  const updateStudentMapping = (id, field, value) => {
    const updatedMappings = studentMappings.map(mapping =>
      mapping.id === id ? { ...mapping, [field]: value } : mapping
    );
    setStudentMappings(updatedMappings);
  };

  const removeStudentMapping = (id) => {
    const updatedMappings = studentMappings.filter(mapping => mapping.id !== id);
    setStudentMappings(updatedMappings);
  };

  const saveStudentMappings = () => {
    // Filter out incomplete mappings
    const completeMappings = studentMappings.filter(mapping =>
      mapping.studentId && mapping.studentName && mapping.githubUsername
    );

    // Save to localStorage
    localStorage.setItem('github_student_mappings', JSON.stringify(completeMappings));
    
    // Update service
    prTrackingService.setStudentMappings(completeMappings);
    
    if (onConfigUpdate) {
      onConfigUpdate({ studentMappings: completeMappings });
    }

    alert(`Saved ${completeMappings.length} student mappings`);
  };

  const startMonitoring = () => {
    if (selectedRepos.length === 0 || studentMappings.length === 0) {
      alert('Please configure repositories and student mappings first');
      return;
    }

    prTrackingService.startMonitoring();
    alert('GitHub PR monitoring started!');
  };

  const stopMonitoring = () => {
    prTrackingService.stopMonitoring();
    alert('GitHub PR monitoring stopped');
  };

  return (
    <motion.div 
      className="github-config-panel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="config-header">
        <h2>🔧 GitHub Integration Setup</h2>
        <p>Configure GitHub PR tracking for your students</p>
      </div>

      {/* Tab Navigation */}
      <div className="config-tabs">
        <button 
          className={`tab-btn ${activeTab === 'token' ? 'active' : ''}`}
          onClick={() => setActiveTab('token')}
        >
          🔑 Authentication
        </button>
        <button 
          className={`tab-btn ${activeTab === 'repos' ? 'active' : ''}`}
          onClick={() => setActiveTab('repos')}
          disabled={!isValid}
        >
          📁 Repositories
        </button>
        <button 
          className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`}
          onClick={() => setActiveTab('students')}
          disabled={!isValid}
        >
          👥 Student Mapping
        </button>
        <button 
          className={`tab-btn ${activeTab === 'monitoring' ? 'active' : ''}`}
          onClick={() => setActiveTab('monitoring')}
          disabled={!isValid}
        >
          📊 Monitoring
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'token' && (
          <div className="token-section">
            <h3>GitHub Personal Access Token</h3>
            <p>Enter your GitHub Personal Access Token to enable PR tracking.</p>
            
            <form onSubmit={handleTokenSubmit} className="token-form">
              <div className="token-input-group">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="token-input"
                />
                <button
                  type="button"
                  className="toggle-visibility"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? '👁️' : '🙈'}
                </button>
              </div>
              
              <button 
                type="submit" 
                className="validate-btn"
                disabled={isValidating || !token.trim()}
              >
                {isValidating ? 'Validating...' : 'Validate Token'}
              </button>
            </form>

            {isValid && userInfo && (
              <div className="user-info">
                <h4>✅ Token Valid</h4>
                <div className="user-details">
                  <img src={userInfo.avatarUrl} alt="Avatar" className="user-avatar" />
                  <div>
                    <p><strong>{userInfo.name || userInfo.login}</strong></p>
                    <p>@{userInfo.login}</p>
                    <p>{userInfo.publicRepos} public repositories</p>
                  </div>
                </div>
              </div>
            )}

            <div className="token-help">
              <h4>How to create a Personal Access Token:</h4>
              <ol>
                <li>Go to GitHub Settings → Developer settings → Personal access tokens</li>
                <li>Click "Generate new token"</li>
                <li>Select scopes: <code>repo</code>, <code>read:user</code></li>
                <li>Copy the generated token and paste it above</li>
              </ol>
            </div>
          </div>
        )}

        {activeTab === 'repos' && (
          <div className="repos-section">
            <h3>Monitored Repositories</h3>
            
            <div className="repo-search">
              <div className="search-input-group">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search repositories..."
                  className="search-input"
                  onKeyPress={(e) => e.key === 'Enter' && searchRepositories()}
                />
                <button 
                  onClick={searchRepositories}
                  className="search-btn"
                  disabled={isSearching}
                >
                  {isSearching ? '🔄' : '🔍'}
                </button>
              </div>
            </div>

            {searchResults.length > 0 && (
              <div className="search-results">
                <h4>Search Results:</h4>
                {searchResults.map(repo => (
                  <div key={repo.id} className="repo-item">
                    <div className="repo-info">
                      <strong>{repo.fullName}</strong>
                      <p>{repo.description}</p>
                      <span className="repo-language">{repo.language}</span>
                    </div>
                    <button 
                      onClick={() => addRepository(repo)}
                      className="add-repo-btn"
                      disabled={selectedRepos.includes(repo.fullName)}
                    >
                      {selectedRepos.includes(repo.fullName) ? '✅' : '➕'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="selected-repos">
              <h4>Selected Repositories ({selectedRepos.length}):</h4>
              {selectedRepos.length === 0 ? (
                <p>No repositories selected. Search and add repositories above.</p>
              ) : (
                <div className="repo-list">
                  {selectedRepos.map(repoFullName => (
                    <div key={repoFullName} className="selected-repo">
                      <span>{repoFullName}</span>
                      <button 
                        onClick={() => removeRepository(repoFullName)}
                        className="remove-repo-btn"
                      >
                        ❌
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="students-section">
            <h3>Student GitHub Mappings</h3>
            <p>Map your students to their GitHub usernames for PR tracking.</p>
            
            <button onClick={addStudentMapping} className="add-student-btn">
              ➕ Add Student
            </button>

            <div className="student-mappings">
              {studentMappings.map(mapping => (
                <div key={mapping.id} className="student-mapping">
                  <input
                    type="text"
                    placeholder="Student ID"
                    value={mapping.studentId}
                    onChange={(e) => updateStudentMapping(mapping.id, 'studentId', e.target.value)}
                    className="mapping-input"
                  />
                  <input
                    type="text"
                    placeholder="Student Name"
                    value={mapping.studentName}
                    onChange={(e) => updateStudentMapping(mapping.id, 'studentName', e.target.value)}
                    className="mapping-input"
                  />
                  <input
                    type="text"
                    placeholder="GitHub Username"
                    value={mapping.githubUsername}
                    onChange={(e) => updateStudentMapping(mapping.id, 'githubUsername', e.target.value)}
                    className="mapping-input"
                  />
                  <button 
                    onClick={() => removeStudentMapping(mapping.id)}
                    className="remove-mapping-btn"
                  >
                    ❌
                  </button>
                </div>
              ))}
            </div>

            {studentMappings.length > 0 && (
              <button onClick={saveStudentMappings} className="save-mappings-btn">
                💾 Save Mappings
              </button>
            )}
          </div>
        )}

        {activeTab === 'monitoring' && (
          <div className="monitoring-section">
            <h3>PR Monitoring Control</h3>
            
            <div className="monitoring-status">
              <div className="status-item">
                <span className="status-label">Repositories:</span>
                <span className="status-value">{selectedRepos.length}</span>
              </div>
              <div className="status-item">
                <span className="status-label">Students:</span>
                <span className="status-value">{studentMappings.filter(m => m.studentId && m.githubUsername).length}</span>
              </div>
              <div className="status-item">
                <span className="status-label">Rate Limit:</span>
                <span className="status-value">{githubService.getRateLimitStatus().remaining}</span>
              </div>
            </div>

            <div className="monitoring-controls">
              <button onClick={startMonitoring} className="start-monitoring-btn">
                ▶️ Start Monitoring
              </button>
              <button onClick={stopMonitoring} className="stop-monitoring-btn">
                ⏹️ Stop Monitoring
              </button>
            </div>

            <div className="monitoring-info">
              <h4>Monitoring Features:</h4>
              <ul>
                <li>✅ Automatic PR detection every 5 minutes</li>
                <li>✅ Real-time progress analysis</li>
                <li>✅ Student activity tracking</li>
                <li>✅ Class-wide statistics</li>
                <li>✅ Rate limit management</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default GitHubConfigPanel;