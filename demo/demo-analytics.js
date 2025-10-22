/**
 * GamifyX Demo Analytics and Metrics Tracking
 * Tracks demo effectiveness, user engagement, and conversion metrics
 */

class DemoAnalytics {
  constructor() {
    this.demoSessions = [];
    this.metrics = {
      totalDemos: 0,
      averageDuration: 0,
      conversionRate: 0,
      featureEngagement: {},
      audienceTypes: {},
      followUpRequests: 0
    };
    
    this.startTime = null;
    this.currentSession = null;
  }

  /**
   * Start a new demo session
   */
  startDemoSession(audienceInfo = {}) {
    this.startTime = new Date();
    this.currentSession = {
      id: this.generateSessionId(),
      startTime: this.startTime,
      audienceType: audienceInfo.type || 'unknown',
      audienceSize: audienceInfo.size || 1,
      presenter: audienceInfo.presenter || 'unknown',
      features: [],
      interactions: [],
      questions: [],
      technicalIssues: [],
      outcome: null,
      followUpRequested: false,
      rating: null,
      feedback: null
    };

    console.log(`🎬 Demo session started: ${this.currentSession.id}`);
    console.log(`👥 Audience: ${this.currentSession.audienceType} (${this.currentSession.audienceSize} people)`);
    
    return this.currentSession.id;
  }

  /**
   * Track feature demonstration
   */
  trackFeatureDemo(featureName, duration, engagement = 'medium') {
    if (!this.currentSession) {
      console.warn('No active demo session');
      return;
    }

    const feature = {
      name: featureName,
      timestamp: new Date(),
      duration: duration,
      engagement: engagement, // low, medium, high
      questionsAsked: 0,
      technicalIssues: []
    };

    this.currentSession.features.push(feature);
    
    console.log(`✨ Feature demonstrated: ${featureName} (${duration}s, ${engagement} engagement)`);
  }

  /**
   * Track audience interaction
   */
  trackInteraction(type, details = {}) {
    if (!this.currentSession) {
      console.warn('No active demo session');
      return;
    }

    const interaction = {
      type: type, // question, comment, request, interruption
      timestamp: new Date(),
      details: details,
      response: null
    };

    this.currentSession.interactions.push(interaction);
    
    if (type === 'question') {
      this.currentSession.questions.push({
        question: details.question || 'Unknown question',
        category: details.category || 'general',
        timestamp: new Date(),
        answered: details.answered || false
      });
    }

    console.log(`💬 Interaction tracked: ${type}`);
  }

  /**
   * Track technical issues during demo
   */
  trackTechnicalIssue(issue, severity = 'medium', resolution = null) {
    if (!this.currentSession) {
      console.warn('No active demo session');
      return;
    }

    const technicalIssue = {
      issue: issue,
      severity: severity, // low, medium, high, critical
      timestamp: new Date(),
      resolution: resolution,
      impactOnDemo: severity === 'critical' ? 'major' : severity === 'high' ? 'moderate' : 'minor'
    };

    this.currentSession.technicalIssues.push(technicalIssue);
    
    console.log(`⚠️ Technical issue: ${issue} (${severity})`);
  }

  /**
   * End demo session with outcome
   */
  endDemoSession(outcome, rating = null, feedback = null) {
    if (!this.currentSession) {
      console.warn('No active demo session');
      return;
    }

    const endTime = new Date();
    const duration = Math.round((endTime - this.startTime) / 1000); // seconds

    this.currentSession.endTime = endTime;
    this.currentSession.duration = duration;
    this.currentSession.outcome = outcome; // interested, very_interested, not_interested, follow_up_requested
    this.currentSession.rating = rating; // 1-10 scale
    this.currentSession.feedback = feedback;

    // Determine if follow-up was requested
    this.currentSession.followUpRequested = outcome === 'follow_up_requested' || 
      this.currentSession.interactions.some(i => i.type === 'request' && i.details.type === 'follow_up');

    // Store completed session
    this.demoSessions.push({ ...this.currentSession });
    
    // Update metrics
    this.updateMetrics();

    console.log(`🎯 Demo session completed: ${this.currentSession.id}`);
    console.log(`⏱️ Duration: ${Math.round(duration / 60)} minutes`);
    console.log(`📊 Outcome: ${outcome}`);
    console.log(`⭐ Rating: ${rating || 'Not provided'}`);

    // Reset current session
    this.currentSession = null;
    this.startTime = null;
  }

  /**
   * Update overall metrics
   */
  updateMetrics() {
    const sessions = this.demoSessions;
    
    this.metrics.totalDemos = sessions.length;
    
    // Average duration
    if (sessions.length > 0) {
      this.metrics.averageDuration = Math.round(
        sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length
      );
    }

    // Conversion rate (interested + very_interested + follow_up_requested)
    const positiveOutcomes = sessions.filter(s => 
      ['interested', 'very_interested', 'follow_up_requested'].includes(s.outcome)
    ).length;
    this.metrics.conversionRate = sessions.length > 0 ? 
      Math.round((positiveOutcomes / sessions.length) * 100) : 0;

    // Feature engagement
    this.metrics.featureEngagement = {};
    sessions.forEach(session => {
      session.features.forEach(feature => {
        if (!this.metrics.featureEngagement[feature.name]) {
          this.metrics.featureEngagement[feature.name] = {
            demonstrations: 0,
            totalDuration: 0,
            averageDuration: 0,
            highEngagement: 0,
            questionsGenerated: 0
          };
        }
        
        const featureMetric = this.metrics.featureEngagement[feature.name];
        featureMetric.demonstrations++;
        featureMetric.totalDuration += feature.duration;
        featureMetric.averageDuration = Math.round(featureMetric.totalDuration / featureMetric.demonstrations);
        
        if (feature.engagement === 'high') {
          featureMetric.highEngagement++;
        }
      });
    });

    // Audience types
    this.metrics.audienceTypes = {};
    sessions.forEach(session => {
      const type = session.audienceType;
      if (!this.metrics.audienceTypes[type]) {
        this.metrics.audienceTypes[type] = {
          count: 0,
          totalPeople: 0,
          averageRating: 0,
          conversionRate: 0
        };
      }
      
      this.metrics.audienceTypes[type].count++;
      this.metrics.audienceTypes[type].totalPeople += session.audienceSize;
      
      if (session.rating) {
        this.metrics.audienceTypes[type].averageRating = 
          (this.metrics.audienceTypes[type].averageRating + session.rating) / 2;
      }
    });

    // Follow-up requests
    this.metrics.followUpRequests = sessions.filter(s => s.followUpRequested).length;
  }

  /**
   * Generate comprehensive demo report
   */
  generateDemoReport() {
    const report = {
      summary: {
        totalDemos: this.metrics.totalDemos,
        averageDuration: `${Math.round(this.metrics.averageDuration / 60)} minutes`,
        conversionRate: `${this.metrics.conversionRate}%`,
        followUpRequests: this.metrics.followUpRequests,
        averageRating: this.calculateAverageRating()
      },
      featurePerformance: this.analyzeFeaturePerformance(),
      audienceAnalysis: this.analyzeAudienceTypes(),
      commonQuestions: this.analyzeCommonQuestions(),
      technicalIssues: this.analyzeTechnicalIssues(),
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  /**
   * Analyze feature performance
   */
  analyzeFeaturePerformance() {
    const features = Object.entries(this.metrics.featureEngagement)
      .map(([name, data]) => ({
        name,
        demonstrations: data.demonstrations,
        averageDuration: `${data.averageDuration}s`,
        engagementRate: `${Math.round((data.highEngagement / data.demonstrations) * 100)}%`,
        questionsPerDemo: Math.round(data.questionsGenerated / data.demonstrations)
      }))
      .sort((a, b) => b.demonstrations - a.demonstrations);

    return features;
  }

  /**
   * Analyze audience types
   */
  analyzeAudienceTypes() {
    return Object.entries(this.metrics.audienceTypes)
      .map(([type, data]) => ({
        type,
        sessions: data.count,
        totalPeople: data.totalPeople,
        averageRating: Math.round(data.averageRating * 10) / 10,
        conversionRate: `${Math.round(data.conversionRate)}%`
      }))
      .sort((a, b) => b.sessions - a.sessions);
  }

  /**
   * Analyze common questions
   */
  analyzeCommonQuestions() {
    const allQuestions = this.demoSessions.flatMap(s => s.questions);
    const questionCategories = {};

    allQuestions.forEach(q => {
      const category = q.category;
      if (!questionCategories[category]) {
        questionCategories[category] = {
          count: 0,
          examples: [],
          answeredRate: 0
        };
      }
      
      questionCategories[category].count++;
      if (questionCategories[category].examples.length < 3) {
        questionCategories[category].examples.push(q.question);
      }
    });

    return Object.entries(questionCategories)
      .map(([category, data]) => ({
        category,
        frequency: data.count,
        examples: data.examples
      }))
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Analyze technical issues
   */
  analyzeTechnicalIssues() {
    const allIssues = this.demoSessions.flatMap(s => s.technicalIssues);
    const issueTypes = {};

    allIssues.forEach(issue => {
      const type = issue.issue;
      if (!issueTypes[type]) {
        issueTypes[type] = {
          count: 0,
          severities: { low: 0, medium: 0, high: 0, critical: 0 },
          resolved: 0
        };
      }
      
      issueTypes[type].count++;
      issueTypes[type].severities[issue.severity]++;
      if (issue.resolution) {
        issueTypes[type].resolved++;
      }
    });

    return Object.entries(issueTypes)
      .map(([issue, data]) => ({
        issue,
        frequency: data.count,
        mostCommonSeverity: Object.entries(data.severities)
          .sort(([,a], [,b]) => b - a)[0][0],
        resolutionRate: `${Math.round((data.resolved / data.count) * 100)}%`
      }))
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Generate recommendations for demo improvement
   */
  generateRecommendations() {
    const recommendations = [];

    // Conversion rate recommendations
    if (this.metrics.conversionRate < 50) {
      recommendations.push({
        category: 'Conversion',
        priority: 'high',
        recommendation: 'Focus on business value and ROI early in the demo',
        reason: `Current conversion rate is ${this.metrics.conversionRate}%, below target of 50%`
      });
    }

    // Duration recommendations
    if (this.metrics.averageDuration > 1200) { // 20 minutes
      recommendations.push({
        category: 'Duration',
        priority: 'medium',
        recommendation: 'Consider shortening demo or creating modular versions',
        reason: `Average duration of ${Math.round(this.metrics.averageDuration / 60)} minutes may be too long`
      });
    }

    // Feature engagement recommendations
    const lowEngagementFeatures = Object.entries(this.metrics.featureEngagement)
      .filter(([, data]) => (data.highEngagement / data.demonstrations) < 0.3)
      .map(([name]) => name);

    if (lowEngagementFeatures.length > 0) {
      recommendations.push({
        category: 'Feature Engagement',
        priority: 'medium',
        recommendation: `Improve demonstration of: ${lowEngagementFeatures.join(', ')}`,
        reason: 'These features show low audience engagement'
      });
    }

    // Technical issues recommendations
    const criticalIssues = this.demoSessions
      .flatMap(s => s.technicalIssues)
      .filter(i => i.severity === 'critical');

    if (criticalIssues.length > 0) {
      recommendations.push({
        category: 'Technical Reliability',
        priority: 'high',
        recommendation: 'Address critical technical issues before next demo',
        reason: `${criticalIssues.length} critical issues encountered`
      });
    }

    return recommendations;
  }

  /**
   * Calculate average rating across all sessions
   */
  calculateAverageRating() {
    const ratedSessions = this.demoSessions.filter(s => s.rating !== null);
    if (ratedSessions.length === 0) return 'N/A';
    
    const average = ratedSessions.reduce((sum, s) => sum + s.rating, 0) / ratedSessions.length;
    return Math.round(average * 10) / 10;
  }

  /**
   * Export demo data for analysis
   */
  exportDemoData() {
    return {
      sessions: this.demoSessions,
      metrics: this.metrics,
      report: this.generateDemoReport(),
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Generate session ID
   */
  generateSessionId() {
    return `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Print demo statistics to console
   */
  printStats() {
    console.log('\n📊 GamifyX Demo Analytics Summary');
    console.log('================================');
    console.log(`Total Demos: ${this.metrics.totalDemos}`);
    console.log(`Average Duration: ${Math.round(this.metrics.averageDuration / 60)} minutes`);
    console.log(`Conversion Rate: ${this.metrics.conversionRate}%`);
    console.log(`Follow-up Requests: ${this.metrics.followUpRequests}`);
    console.log(`Average Rating: ${this.calculateAverageRating()}/10`);
    
    if (Object.keys(this.metrics.featureEngagement).length > 0) {
      console.log('\n🎯 Top Demonstrated Features:');
      Object.entries(this.metrics.featureEngagement)
        .sort(([,a], [,b]) => b.demonstrations - a.demonstrations)
        .slice(0, 5)
        .forEach(([name, data]) => {
          console.log(`  ${name}: ${data.demonstrations} times (avg ${data.averageDuration}s)`);
        });
    }
  }
}

// Example usage and demo scenarios
const demoAnalytics = new DemoAnalytics();

// Export for use in demo scripts
module.exports = DemoAnalytics;

// Example demo session tracking
if (require.main === module) {
  console.log('🎬 GamifyX Demo Analytics Example');
  
  // Simulate a demo session
  const sessionId = demoAnalytics.startDemoSession({
    type: 'investor_pitch',
    size: 5,
    presenter: 'John Doe'
  });

  // Simulate feature demonstrations
  demoAnalytics.trackFeatureDemo('AI Code Analysis', 180, 'high');
  demoAnalytics.trackFeatureDemo('Competition Integration', 240, 'high');
  demoAnalytics.trackFeatureDemo('Cyberpunk Dashboard', 120, 'medium');
  demoAnalytics.trackFeatureDemo('Teacher Analytics', 150, 'high');

  // Simulate interactions
  demoAnalytics.trackInteraction('question', {
    question: 'How does the GitHub integration work?',
    category: 'technical',
    answered: true
  });

  demoAnalytics.trackInteraction('question', {
    question: 'What is the ROI for institutions?',
    category: 'business',
    answered: true
  });

  // End session
  demoAnalytics.endDemoSession('very_interested', 9, 'Impressive platform, would like to discuss pilot program');

  // Print statistics
  demoAnalytics.printStats();

  // Generate report
  const report = demoAnalytics.generateDemoReport();
  console.log('\n📋 Demo Report Generated');
  console.log('Recommendations:', report.recommendations);
}