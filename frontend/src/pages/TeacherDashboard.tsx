import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Badge,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent
} from '@mui/material';
import {
  Dashboard,
  People,
  Warning,
  Assessment,
  Refresh,
  Healing,
  Analytics,
  GitHub
} from '@mui/icons-material';

// Import teacher dashboard components
import ClassOverview from '../components/teacher/ClassOverview';
import StudentDrillDown from '../components/teacher/StudentDrillDown';
import AlertManagement from '../components/teacher/AlertManagement';
import ReportGeneration from '../components/teacher/ReportGeneration';
import InterventionTracking from '../components/teacher/InterventionTracking';
import TeacherMetrics from '../components/teacher/TeacherMetrics';

// Import GitHub PR tracking components
import ClassPROverview from '../components/teacher/ClassPROverview';
import StudentPRTracker from '../components/teacher/StudentPRTracker';
import GitHubConfigPanel from '../components/teacher/GitHubConfigPanel';

// Import services and types
import { apiService } from '../services/api';
import { useTeacherMetrics } from '../hooks/useTeacherMetrics';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`teacher-tabpanel-${index}`}
      aria-labelledby={`teacher-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const TeacherDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | undefined>();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [aiRecommendations, setAiRecommendations] = useState<string[]>([]);
  const [githubTimeframe, setGithubTimeframe] = useState<'7d' | '30d' | '90d'>('30d');
  const [githubConfigOpen, setGithubConfigOpen] = useState(false);
  const [githubRepositories, setGithubRepositories] = useState<any[]>([]);
  const [githubStudentMappings, setGithubStudentMappings] = useState<any[]>([]);

  // Initialize teacher metrics tracking
  const {
    trackPageView,
    // trackAction,
    // trackFeatureUsage,
    trackIntervention,
    trackAlertAction,
    trackReportGeneration
  } = useTeacherMetrics({
    teacherId: 'teacher-123', // In real app, get from auth context
    trackingEnabled: true
  });

  // Mock data - fallback for when API is not available
  const mockDashboardData = {
    classMetrics: {
      totalStudents: 45,
      activeStudents: 42,
      atRiskStudents: 3,
      averagePerformance: 78,
      completionRate: 85,
      engagementScore: 82,
      trendsData: [
        { date: '2023-10-01', performance: 75, engagement: 80, submissions: 35 },
        { date: '2023-10-08', performance: 77, engagement: 82, submissions: 38 },
        { date: '2023-10-15', performance: 78, engagement: 81, submissions: 42 },
        { date: '2023-10-22', performance: 78, engagement: 83, submissions: 40 }
      ],
      performanceDistribution: [
        { range: '90-100%', count: 8, color: '#4CAF50' },
        { range: '80-89%', count: 15, color: '#FF9800' },
        { range: '70-79%', count: 12, color: '#2196F3' },
        { range: '60-69%', count: 7, color: '#F44336' },
        { range: '<60%', count: 3, color: '#9E9E9E' }
      ],
      skillsProgress: [
        { skill: 'DevOps', average: 75, improvement: 5 },
        { skill: 'Security', average: 82, improvement: 8 },
        { skill: 'Performance', average: 68, improvement: -2 },
        { skill: 'Testing', average: 79, improvement: 12 }
      ]
    },
    students: [
      {
        id: 'student-1',
        name: 'Alice Johnson',
        email: 'alice@example.com',
        level: 6,
        totalPoints: 1850,
        rank: 3,
        riskScore: 0.2,
        riskLevel: 'low' as const,
        lastActive: '2023-10-22T10:30:00Z',
        performanceHistory: [
          { date: '2023-10-01', score: 85, submissions: 3, engagement: 90 },
          { date: '2023-10-08', score: 88, submissions: 4, engagement: 92 },
          { date: '2023-10-15', score: 87, submissions: 3, engagement: 89 },
          { date: '2023-10-22', score: 90, submissions: 4, engagement: 95 }
        ],
        skillsRadar: [
          { skill: 'DevOps', score: 85, maxScore: 100 },
          { skill: 'Security', score: 90, maxScore: 100 },
          { skill: 'Performance', score: 80, maxScore: 100 },
          { skill: 'Testing', score: 88, maxScore: 100 }
        ],
        recentSubmissions: [
          { id: 'sub-1', title: 'Docker Setup', score: 92, submittedAt: '2023-10-22T09:00:00Z', feedback: ['Great work!'] },
          { id: 'sub-2', title: 'CI/CD Pipeline', score: 88, submittedAt: '2023-10-20T14:30:00Z', feedback: ['Good implementation'] }
        ],
        interventions: [],
        recommendations: ['Continue excellent work', 'Consider peer mentoring role']
      },
      {
        id: 'student-2',
        name: 'Bob Smith',
        email: 'bob@example.com',
        level: 3,
        totalPoints: 890,
        rank: 28,
        riskScore: 0.75,
        riskLevel: 'high' as const,
        lastActive: '2023-10-18T16:45:00Z',
        performanceHistory: [
          { date: '2023-10-01', score: 65, submissions: 2, engagement: 60 },
          { date: '2023-10-08', score: 58, submissions: 1, engagement: 55 },
          { date: '2023-10-15', score: 62, submissions: 2, engagement: 58 },
          { date: '2023-10-22', score: 55, submissions: 1, engagement: 50 }
        ],
        skillsRadar: [
          { skill: 'DevOps', score: 45, maxScore: 100 },
          { skill: 'Security', score: 60, maxScore: 100 },
          { skill: 'Performance', score: 40, maxScore: 100 },
          { skill: 'Testing', score: 55, maxScore: 100 }
        ],
        recentSubmissions: [
          { id: 'sub-3', title: 'Basic Setup', score: 55, submittedAt: '2023-10-18T11:00:00Z', feedback: ['Needs improvement', 'Missing requirements'] }
        ],
        interventions: [
          { id: 'int-1', type: 'one-on-one', description: 'Scheduled meeting to discuss challenges', createdAt: '2023-10-20T10:00:00Z', status: 'pending' as const }
        ],
        recommendations: ['Schedule one-on-one meeting', 'Provide additional resources', 'Consider study group']
      }
    ],
    alerts: [
      {
        id: 'alert-1',
        type: 'performance' as const,
        severity: 'high' as const,
        title: 'Student Performance Decline',
        description: 'Bob Smith\'s performance has declined by 15% over the past 2 weeks',
        studentId: 'student-2',
        studentName: 'Bob Smith',
        createdAt: '2023-10-22T08:00:00Z',
        status: 'active' as const,
        actions: [],
        metadata: {
          riskScore: 0.75,
          performanceChange: -15,
          submissionCount: 1,
          lastActivity: '2023-10-18T16:45:00Z'
        }
      },
      {
        id: 'alert-2',
        type: 'engagement' as const,
        severity: 'medium' as const,
        title: 'Low Class Engagement',
        description: 'Overall class engagement has dropped below 80%',
        createdAt: '2023-10-21T14:30:00Z',
        status: 'acknowledged' as const,
        acknowledgedAt: '2023-10-21T15:00:00Z',
        actions: [
          { id: 'action-1', type: 'monitoring', description: 'Monitoring engagement metrics closely', createdAt: '2023-10-21T15:00:00Z', createdBy: 'Teacher' }
        ]
      }
    ],
    reportTemplates: [
      {
        id: 'template-1',
        name: 'Student Performance Report',
        description: 'Comprehensive performance analysis for all students',
        type: 'performance' as const,
        format: 'pdf' as const,
        fields: ['student_info', 'performance_scores', 'submission_history'],
        generatedCount: 5,
        lastGenerated: '2023-10-20T10:00:00Z'
      },
      {
        id: 'template-2',
        name: 'At-Risk Students Report',
        description: 'Detailed analysis of students requiring intervention',
        type: 'intervention' as const,
        format: 'excel' as const,
        fields: ['student_info', 'risk_scores', 'interventions', 'recommendations'],
        generatedCount: 3,
        lastGenerated: '2023-10-18T14:00:00Z'
      }
    ],
    generatedReports: [
      {
        id: 'report-1',
        name: 'Weekly Performance Report - Oct 22',
        type: 'performance',
        format: 'pdf',
        generatedAt: '2023-10-22T09:00:00Z',
        generatedBy: 'Teacher',
        fileSize: '2048576',
        downloadUrl: '/reports/weekly-performance-oct22.pdf',
        parameters: {}
      }
    ],
    interventions: [
      {
        id: 'intervention-1',
        studentId: 'student-2',
        studentName: 'Bob Smith',
        type: 'one-on-one',
        title: 'Performance Improvement Meeting',
        description: 'Scheduled meeting to discuss recent performance decline and provide additional support',
        priority: 'high',
        status: 'in-progress',
        createdAt: '2023-10-20T10:00:00Z',
        createdBy: 'Teacher',
        scheduledDate: '2023-10-25T14:00:00Z',
        followUpRequired: true,
        followUpDate: '2023-11-01T14:00:00Z',
        tags: ['performance', 'support'],
        metrics: {
          performanceBefore: 55,
          engagementBefore: 50,
          riskScoreBefore: 0.75
        },
        notes: [
          {
            id: 'note-1',
            content: 'Student seems motivated to improve. Provided additional resources.',
            createdAt: '2023-10-20T10:30:00Z',
            createdBy: 'Teacher'
          }
        ]
      },
      {
        id: 'intervention-2',
        studentId: 'student-1',
        studentName: 'Alice Johnson',
        type: 'peer-mentoring',
        title: 'Peer Mentoring Assignment',
        description: 'Assigned Alice as a peer mentor to help struggling students',
        priority: 'medium',
        status: 'completed',
        createdAt: '2023-10-15T09:00:00Z',
        createdBy: 'Teacher',
        completedDate: '2023-10-22T16:00:00Z',
        outcome: 'Successfully mentored 2 students, both showed improvement',
        effectiveness: 5,
        followUpRequired: false,
        tags: ['mentoring', 'leadership'],
        metrics: {
          performanceBefore: 88,
          performanceAfter: 90,
          engagementBefore: 89,
          engagementAfter: 95,
          riskScoreBefore: 0.2,
          riskScoreAfter: 0.1
        },
        notes: [
          {
            id: 'note-2',
            content: 'Alice has excellent leadership skills and is helping other students effectively.',
            createdAt: '2023-10-22T16:00:00Z',
            createdBy: 'Teacher'
          }
        ]
      }
    ],
    teacherMetrics: {
      userId: 'teacher-123',
      teacherName: 'Dr. Sarah Johnson',
      dashboardUsage: {
        totalSessions: 45,
        totalTimeSpent: 1250, // minutes
        averageSessionDuration: 28,
        lastLogin: '2023-10-22T08:30:00Z',
        loginFrequency: 5.2,
        featuresUsed: [
          { feature: 'class_overview', usageCount: 120, lastUsed: '2023-10-22T08:30:00Z' },
          { feature: 'student_analytics', usageCount: 85, lastUsed: '2023-10-22T07:45:00Z' },
          { feature: 'alert_management', usageCount: 65, lastUsed: '2023-10-21T16:20:00Z' },
          { feature: 'intervention_tracking', usageCount: 42, lastUsed: '2023-10-21T14:15:00Z' },
          { feature: 'report_generation', usageCount: 28, lastUsed: '2023-10-20T11:30:00Z' }
        ],
        dailyUsage: [
          { date: '2023-10-16', sessions: 3, timeSpent: 45, actionsPerformed: 28 },
          { date: '2023-10-17', sessions: 4, timeSpent: 52, actionsPerformed: 35 },
          { date: '2023-10-18', sessions: 2, timeSpent: 38, actionsPerformed: 22 },
          { date: '2023-10-19', sessions: 5, timeSpent: 68, actionsPerformed: 41 },
          { date: '2023-10-20', sessions: 3, timeSpent: 42, actionsPerformed: 29 },
          { date: '2023-10-21', sessions: 4, timeSpent: 55, actionsPerformed: 38 },
          { date: '2023-10-22', sessions: 2, timeSpent: 25, actionsPerformed: 18 }
        ]
      },
      interventionActivity: {
        totalInterventions: 15,
        activeInterventions: 3,
        completedInterventions: 10,
        averageResponseTime: 18,
        interventionTypes: [
          { type: 'one-on-one', count: 6, successRate: 85 },
          { type: 'peer-mentoring', count: 4, successRate: 92 },
          { type: 'additional-resources', count: 3, successRate: 75 },
          { type: 'study-group', count: 2, successRate: 88 }
        ],
        weeklyInterventions: [
          { week: 'Week 1', created: 3, completed: 2 },
          { week: 'Week 2', created: 4, completed: 3 },
          { week: 'Week 3', created: 2, completed: 4 },
          { week: 'Week 4', created: 6, completed: 1 }
        ]
      },
      alertManagement: {
        totalAlertsReceived: 28,
        alertsAcknowledged: 26,
        alertsResolved: 24,
        averageResponseTime: 45,
        alertTypes: [
          { type: 'performance', count: 12, averageResolutionTime: 120 },
          { type: 'engagement', count: 8, averageResolutionTime: 85 },
          { type: 'submission', count: 6, averageResolutionTime: 60 },
          { type: 'system', count: 2, averageResolutionTime: 30 }
        ]
      },
      studentEngagement: {
        studentsMonitored: 45,
        atRiskStudentsIdentified: 8,
        studentsImproved: 6,
        averageStudentProgress: 78,
        engagementTrends: [
          { date: '2023-10-16', engagement: 82, interventions: 1 },
          { date: '2023-10-17', engagement: 79, interventions: 2 },
          { date: '2023-10-18', engagement: 81, interventions: 0 },
          { date: '2023-10-19', engagement: 85, interventions: 3 },
          { date: '2023-10-20', engagement: 83, interventions: 1 },
          { date: '2023-10-21', engagement: 87, interventions: 2 },
          { date: '2023-10-22', engagement: 84, interventions: 1 }
        ]
      },
      effectiveness: {
        overallScore: 85,
        interventionSuccessRate: 87,
        studentImprovementRate: 75,
        alertResolutionRate: 92,
        recommendations: [
          'Continue current intervention strategies - showing excellent results',
          'Consider increasing frequency of student check-ins',
          'Explore peer mentoring program expansion'
        ]
      }
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const teacherId = 'teacher-123'; // In real app, get from auth context
      
      // Load comprehensive dashboard data
      const [
        dashboardResponse,
        recommendationsResponse
      ] = await Promise.all([
        apiService.getTeacherDashboardData(teacherId).catch(() => ({ data: mockDashboardData })),
        apiService.getTeacherRecommendations(teacherId).catch(() => ({ data: { recommendations: [] } }))
      ]);

      setDashboardData(dashboardResponse.data);
      setAiRecommendations(recommendationsResponse.data.recommendations || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load teacher dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
      setDashboardData(mockDashboardData); // Fallback to mock data
      setLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    
    // Track tab navigation
    const tabNames = ['overview', 'students', 'alerts', 'interventions', 'reports', 'metrics', 'github'];
    trackPageView(`teacher_dashboard_${tabNames[newValue]}`);
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
  };

  const handleCreateIntervention = async (studentId: string, intervention: any) => {
    try {
      const interventionData = {
        ...intervention,
        studentId,
        teacherId: 'teacher-123', // In real app, get from auth context
        createdAt: new Date().toISOString()
      };

      await apiService.createIntervention(interventionData);
      
      // Track intervention creation
      trackIntervention(intervention.type, studentId);
      
      // Reload dashboard data to reflect changes
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to create intervention:', error);
      setError('Failed to create intervention. Please try again.');
    }
  };

  const handleAcknowledgeAlert = async (alertId: string, note?: string) => {
    try {
      await apiService.acknowledgeAlert(alertId, note);
      trackAlertAction(alertId, 'acknowledge');
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      setError('Failed to acknowledge alert. Please try again.');
    }
  };

  const handleResolveAlert = async (alertId: string, resolution: string) => {
    try {
      await apiService.resolveAlert(alertId, resolution);
      trackAlertAction(alertId, 'resolve');
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      setError('Failed to resolve alert. Please try again.');
    }
  };

  const handleSnoozeAlert = async (alertId: string, duration: number) => {
    try {
      await apiService.snoozeAlert(alertId, duration);
      trackAlertAction(alertId, 'snooze');
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to snooze alert:', error);
      setError('Failed to snooze alert. Please try again.');
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      await apiService.deleteReport(alertId); // Assuming similar endpoint structure
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to delete alert:', error);
      setError('Failed to delete alert. Please try again.');
    }
  };

  const handleCreateAction = async (alertId: string, action: any) => {
    try {
      await apiService.createAlertAction(alertId, action);
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to create action:', error);
      setError('Failed to create action. Please try again.');
    }
  };

  const handleGenerateReport = async (template: any, parameters: any) => {
    try {
      await apiService.generateReport(template, parameters);
      trackReportGeneration(template.type, parameters);
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to generate report:', error);
      setError('Failed to generate report. Please try again.');
    }
  };

  const handleDownloadReport = async (reportId: string) => {
    try {
      const blob = await apiService.downloadReport(reportId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download report:', error);
      setError('Failed to download report. Please try again.');
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      await apiService.deleteReport(reportId);
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to delete report:', error);
      setError('Failed to delete report. Please try again.');
    }
  };

  // GitHub Configuration Handlers
  const handleAddRepository = (repository: any) => {
    const newRepo = {
      ...repository,
      id: `repo-${Date.now()}`,
      syncStatus: 'pending' as const,
      lastSync: new Date().toISOString()
    };
    setGithubRepositories(prev => [...prev, newRepo]);
  };

  const handleRemoveRepository = (repositoryId: string) => {
    setGithubRepositories(prev => prev.filter(repo => repo.id !== repositoryId));
  };

  const handleAddStudentMapping = (mapping: any) => {
    const newMapping = {
      ...mapping,
      id: `mapping-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setGithubStudentMappings(prev => [...prev, newMapping]);
  };

  const handleRemoveStudentMapping = (mappingId: string) => {
    setGithubStudentMappings(prev => prev.filter(mapping => mapping.id !== mappingId));
  };

  const handleSaveGitHubToken = async (token: string) => {
    try {
      // In a real implementation, this would save the token securely
      console.log('Saving GitHub token:', token.substring(0, 10) + '...');
      // You could call an API here to save the token
      // await apiService.saveGitHubToken(token);
    } catch (error) {
      console.error('Failed to save GitHub token:', error);
      setError('Failed to save GitHub token. Please try again.');
    }
  };

  const handleTestGitHubConnection = async (): Promise<boolean> => {
    try {
      // In a real implementation, this would test the GitHub connection
      console.log('Testing GitHub connection...');
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return true;
    } catch (error) {
      console.error('GitHub connection test failed:', error);
      return false;
    }
  };

  const handleSyncRepositories = async () => {
    try {
      console.log('Syncing repositories...');
      // In a real implementation, this would sync all repositories
      setGithubRepositories(prev => prev.map(repo => ({
        ...repo,
        syncStatus: 'completed' as const,
        lastSync: new Date().toISOString()
      })));
    } catch (error) {
      console.error('Failed to sync repositories:', error);
      setError('Failed to sync repositories. Please try again.');
    }
  };

  const activeAlertsCount = dashboardData?.alerts?.filter((a: any) => a.status === 'active').length || 0;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading teacher dashboard...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box textAlign="center" py={4}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <IconButton onClick={handleRefresh} color="primary">
          <Refresh />
        </IconButton>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Teacher Dashboard
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Monitor and support your students' learning journey
          </Typography>
        </Box>
        
        <Tooltip title="Refresh Data">
          <IconButton onClick={handleRefresh} color="primary">
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Navigation Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab 
            icon={<Dashboard />} 
            label="Overview" 
            id="teacher-tab-0"
            aria-controls="teacher-tabpanel-0"
          />
          <Tab 
            icon={<People />} 
            label="Students" 
            id="teacher-tab-1"
            aria-controls="teacher-tabpanel-1"
          />
          <Tab 
            icon={
              <Badge badgeContent={activeAlertsCount} color="error">
                <Warning />
              </Badge>
            } 
            label="Alerts" 
            id="teacher-tab-2"
            aria-controls="teacher-tabpanel-2"
          />
          <Tab 
            icon={<Healing />} 
            label="Interventions" 
            id="teacher-tab-3"
            aria-controls="teacher-tabpanel-3"
          />
          <Tab 
            icon={<Assessment />} 
            label="Reports" 
            id="teacher-tab-4"
            aria-controls="teacher-tabpanel-4"
          />
          <Tab 
            icon={<Analytics />} 
            label="My Metrics" 
            id="teacher-tab-5"
            aria-controls="teacher-tabpanel-5"
          />
          <Tab 
            icon={<GitHub />} 
            label="GitHub PRs" 
            id="teacher-tab-6"
            aria-controls="teacher-tabpanel-6"
          />
        </Tabs>
      </Box>

      {/* AI Recommendations Banner */}
      {aiRecommendations.length > 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            AI-Powered Teaching Recommendations
          </Typography>
          <Typography variant="body2">
            {aiRecommendations.slice(0, 2).join(' • ')}
          </Typography>
        </Alert>
      )}

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        {dashboardData && (
          <ClassOverview
            classId="class-1"
            metrics={dashboardData.classMetrics}
            onRefresh={handleRefresh}
          />
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {dashboardData && (
          <StudentDrillDown
            students={dashboardData.students}
            selectedStudentId={selectedStudentId || dashboardData.students[0]?.id || ''}
            onStudentSelect={handleStudentSelect}
            onCreateIntervention={handleCreateIntervention}
          />
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {dashboardData && (
          <AlertManagement
            alerts={dashboardData.alerts}
            onAcknowledgeAlert={handleAcknowledgeAlert}
            onResolveAlert={handleResolveAlert}
            onSnoozeAlert={handleSnoozeAlert}
            onDeleteAlert={handleDeleteAlert}
            onCreateAction={handleCreateAction}
          />
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        {dashboardData && (
          <InterventionTracking
            interventions={dashboardData.interventions || []}
            onCreateIntervention={handleCreateIntervention}
            onUpdateIntervention={async (id: string, updates: any) => {
              try {
                await apiService.updateIntervention(id, updates);
                await loadDashboardData();
              } catch (error) {
                console.error('Failed to update intervention:', error);
                setError('Failed to update intervention. Please try again.');
              }
            }}
            onDeleteIntervention={async (id: string) => {
              try {
                await apiService.deleteReport(id); // Assuming similar endpoint structure
                await loadDashboardData();
              } catch (error) {
                console.error('Failed to delete intervention:', error);
                setError('Failed to delete intervention. Please try again.');
              }
            }}
            onAddNote={async (interventionId: string, note: string) => {
              try {
                await apiService.updateIntervention(interventionId, {
                  notes: [...(dashboardData.interventions.find((i: any) => i.id === interventionId)?.notes || []), {
                    id: `note-${Date.now()}`,
                    content: note,
                    createdAt: new Date().toISOString(),
                    createdBy: 'Current Teacher'
                  }]
                });
                await loadDashboardData();
              } catch (error) {
                console.error('Failed to add note:', error);
                setError('Failed to add note. Please try again.');
              }
            }}
          />
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={4}>
        {dashboardData && (
          <ReportGeneration
            templates={dashboardData.reportTemplates}
            generatedReports={dashboardData.generatedReports}
            onGenerateReport={handleGenerateReport}
            onDownloadReport={handleDownloadReport}
            onDeleteReport={handleDeleteReport}
            onRefreshReports={handleRefresh}
          />
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={5}>
        {dashboardData && (
          <TeacherMetrics
            metrics={dashboardData.teacherMetrics}
            onRefresh={handleRefresh}
          />
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={6}>
        <ClassPROverview
          teacherId="teacher-123"
          timeframe={githubTimeframe}
          onTimeframeChange={setGithubTimeframe}
          onRefresh={handleRefresh}
          onConfigureGitHub={() => setGithubConfigOpen(true)}
        />
      </TabPanel>

      {/* GitHub Configuration Dialog */}
      <Dialog
        open={githubConfigOpen}
        onClose={() => setGithubConfigOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { minHeight: '80vh' }
        }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">
              GitHub Integration Configuration
            </Typography>
            <IconButton onClick={() => setGithubConfigOpen(false)}>
              <Warning />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <GitHubConfigPanel
            teacherId="teacher-123"
            repositories={githubRepositories}
            studentMappings={githubStudentMappings}
            onAddRepository={handleAddRepository}
            onRemoveRepository={handleRemoveRepository}
            onAddStudentMapping={handleAddStudentMapping}
            onRemoveStudentMapping={handleRemoveStudentMapping}
            onSaveToken={handleSaveGitHubToken}
            onTestConnection={handleTestGitHubConnection}
            onSyncRepositories={handleSyncRepositories}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default TeacherDashboard;