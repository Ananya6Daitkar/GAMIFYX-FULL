import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import GitHubConfigPanel from '../components/GitHub/GitHubConfigPanel';
import ClassPROverview from '../components/GitHub/ClassPROverview';
import StudentPRTracker from '../components/GitHub/StudentPRTracker';
import './TeacherDashboard.css';

const TeacherDashboard = () => {
  const [students, setStudents] = useState([]);
  const [classStats, setClassStats] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);
  const [competitions, setCompetitions] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  useEffect(() => {
    const fetchTeacherData = async () => {
      console.log('TeacherDashboard: Starting data fetch...');
      try {
        // Mock comprehensive teacher data
        const mockStudents = [
          {
            id: 1,
            name: 'Alex Chen',
            email: 'alex.chen@university.edu',
            avatar: '👨‍💻',
            status: 'active',
            progress: 85,
            submissions: 12,
            lastActivity: new Date('2024-01-21T10:30:00'),
            riskScore: 0.15,
            predictedGrade: 'A',
            strengths: ['Security', 'Docker'],
            weaknesses: ['Networking'],
            githubPRs: 8,
            codeQuality: 92
          },
          {
            id: 2,
            name: 'Sarah Kim',
            email: 'sarah.kim@university.edu',
            avatar: '👩‍💻',
            status: 'active',
            progress: 72,
            submissions: 10,
            lastActivity: new Date('2024-01-21T09:15:00'),
            riskScore: 0.35,
            predictedGrade: 'B+',
            strengths: ['Kubernetes', 'Problem Solving'],
            weaknesses: ['Resource Management'],
            githubPRs: 6,
            codeQuality: 78
          },
          {
            id: 3,
            name: 'Mike Johnson',
            email: 'mike.johnson@university.edu',
            avatar: '👨‍🔬',
            status: 'at-risk',
            progress: 45,
            submissions: 6,
            lastActivity: new Date('2024-01-18T14:20:00'),
            riskScore: 0.72,
            predictedGrade: 'C+',
            strengths: ['Basic Concepts'],
            weaknesses: ['Code Structure', 'Testing'],
            githubPRs: 2,
            codeQuality: 58
          },
          {
            id: 4,
            name: 'Emma Davis',
            email: 'emma.davis@university.edu',
            avatar: '👩‍🔬',
            status: 'active',
            progress: 90,
            submissions: 14,
            lastActivity: new Date('2024-01-21T11:45:00'),
            riskScore: 0.08,
            predictedGrade: 'A+',
            strengths: ['Security', 'CI/CD', 'Monitoring'],
            weaknesses: [],
            githubPRs: 12,
            codeQuality: 95
          },
          {
            id: 5,
            name: 'David Wilson',
            email: 'david.wilson@university.edu',
            avatar: '👨‍💼',
            status: 'inactive',
            progress: 30,
            submissions: 4,
            lastActivity: new Date('2024-01-15T16:30:00'),
            riskScore: 0.85,
            predictedGrade: 'D+',
            strengths: ['Basic Understanding'],
            weaknesses: ['Engagement', 'Consistency'],
            githubPRs: 1,
            codeQuality: 42
          }
        ];

        const mockClassStats = {
          totalStudents: 25,
          activeStudents: 20,
          atRiskStudents: 3,
          averageProgress: 68,
          averageGrade: 'B',
          totalSubmissions: 156,
          totalPRs: 89,
          averageCodeQuality: 75
        };

        const mockAlerts = [
          {
            id: 1,
            type: 'performance',
            severity: 'high',
            studentName: 'Mike Johnson',
            message: 'No submissions for 3 days, risk score increased to 72%',
            recommendation: 'Schedule immediate check-in meeting',
            timestamp: new Date('2024-01-21T11:00:00')
          },
          {
            id: 2,
            type: 'engagement',
            severity: 'high',
            studentName: 'David Wilson',
            message: 'Inactive for 6 days, predicted grade dropped to D+',
            recommendation: 'Contact student and provide additional support',
            timestamp: new Date('2024-01-21T10:30:00')
          },
          {
            id: 3,
            type: 'code_quality',
            severity: 'medium',
            studentName: 'Sarah Kim',
            message: 'Code quality score below class average',
            recommendation: 'Provide code review session and best practices guide',
            timestamp: new Date('2024-01-21T09:45:00')
          }
        ];

        // Mock competitions data
        const mockCompetitions = [
          {
            id: 1,
            name: 'Hacktoberfest 2024',
            type: 'open-source',
            platform: 'github',
            startDate: new Date('2024-10-01'),
            endDate: new Date('2024-10-31'),
            participants: 15,
            completions: 8,
            status: 'active',
            description: 'Annual open-source contribution challenge',
            requirements: ['4 valid PRs', 'Quality contributions', 'Eligible repositories']
          },
          {
            id: 2,
            name: 'DevOps Challenge 2024',
            type: 'coding-challenge',
            platform: 'external',
            startDate: new Date('2024-11-01'),
            endDate: new Date('2024-11-30'),
            participants: 12,
            completions: 5,
            status: 'upcoming',
            description: 'Infrastructure automation and monitoring challenge',
            requirements: ['Docker deployment', 'CI/CD pipeline', 'Monitoring setup']
          },
          {
            id: 3,
            name: 'Kubernetes Hackathon',
            type: 'hackathon',
            platform: 'external',
            startDate: new Date('2024-09-15'),
            endDate: new Date('2024-09-17'),
            participants: 8,
            completions: 6,
            status: 'completed',
            description: '48-hour Kubernetes application development',
            requirements: ['Working K8s app', 'Documentation', 'Presentation']
          }
        ];

        // Mock campaigns data
        const mockCampaigns = [
          {
            id: 1,
            name: 'Fall Open Source Initiative',
            description: 'Encouraging students to contribute to open-source projects',
            targetCompetitions: ['Hacktoberfest 2024'],
            invitedStudents: 25,
            participatingStudents: 15,
            startDate: new Date('2024-09-01'),
            endDate: new Date('2024-11-30'),
            status: 'active',
            analytics: {
              participationRate: 60,
              completionRate: 53,
              averageScore: 78,
              performanceCorrelation: 0.72
            }
          },
          {
            id: 2,
            name: 'DevOps Skills Challenge',
            description: 'Real-world DevOps challenges to enhance practical skills',
            targetCompetitions: ['DevOps Challenge 2024', 'Kubernetes Hackathon'],
            invitedStudents: 20,
            participatingStudents: 12,
            startDate: new Date('2024-10-15'),
            endDate: new Date('2024-12-15'),
            status: 'active',
            analytics: {
              participationRate: 60,
              completionRate: 42,
              averageScore: 82,
              performanceCorrelation: 0.68
            }
          }
        ];

        setStudents(mockStudents);
        setClassStats(mockClassStats);
        setAlerts(mockAlerts);
        setCompetitions(mockCompetitions);
        setCampaigns(mockCampaigns);
        console.log('TeacherDashboard: Data loaded successfully, setting loading to false');
        setLoading(false);
      } catch (error) {
        console.error('TeacherDashboard: Error fetching teacher data:', error);
        setLoading(false);
      }
    };

    fetchTeacherData();
    const interval = setInterval(fetchTeacherData, 30000);
    
    // Fallback timeout to ensure loading doesn't get stuck
    const timeout = setTimeout(() => {
      console.log('Fallback: Setting loading to false after timeout');
      setLoading(false);
    }, 5000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  // Chart data
  const progressData = students.map(student => ({
    name: student.name.split(' ')[0],
    progress: student.progress,
    submissions: student.submissions,
    codeQuality: student.codeQuality
  }));

  const riskDistribution = [
    { name: 'Low Risk', value: students.filter(s => s.riskScore < 0.3).length, color: '#00FF80' },
    { name: 'Medium Risk', value: students.filter(s => s.riskScore >= 0.3 && s.riskScore < 0.6).length, color: '#FFA500' },
    { name: 'High Risk', value: students.filter(s => s.riskScore >= 0.6).length, color: '#FF6B6B' }
  ];

  // Quick Action Handlers
  const handleCreateAssignment = () => {
    try {
      setFormData({
        title: '',
        description: '',
        dueDate: '',
        points: ''
      });
      setModalType('assignment');
      setShowModal(true);
      console.log('Opening assignment creation modal...');
    } catch (error) {
      console.error('Error opening assignment modal:', error);
      showNotification('Error opening assignment form. Please try again.', 'error');
    }
  };

  const handleGenerateReport = () => {
    try {
      setFormData({
        reportType: 'Class Progress Report',
        startDate: '',
        endDate: '',
        includeCharts: true,
        includePRData: true,
        includeAI: false,
        includeRisk: false
      });
      setModalType('report');
      setShowModal(true);
      console.log('Opening report generation modal...');
    } catch (error) {
      console.error('Error opening report modal:', error);
      showNotification('Error opening report form. Please try again.', 'error');
    }
  };

  const handleSendAnnouncement = () => {
    try {
      setFormData({
        subject: '',
        message: '',
        allStudents: true,
        atRiskOnly: false,
        highPerformers: false,
        priority: 'Normal'
      });
      setModalType('announcement');
      setShowModal(true);
      console.log('Opening announcement modal...');
    } catch (error) {
      console.error('Error opening announcement modal:', error);
      showNotification('Error opening announcement form. Please try again.', 'error');
    }
  };

  const handleSetLearningGoals = () => {
    try {
      setFormData({
        goalType: 'Class-wide Goal',
        goalDescription: '',
        targetDate: '',
        successCriteria: ''
      });
      setModalType('goals');
      setShowModal(true);
      console.log('Opening learning goals modal...');
    } catch (error) {
      console.error('Error opening goals modal:', error);
      showNotification('Error opening goals form. Please try again.', 'error');
    }
  };

  const handleCreateCompetition = () => {
    try {
      setFormData({
        name: '',
        type: 'open-source',
        platform: 'github',
        description: '',
        startDate: '',
        endDate: '',
        requirements: '',
        pointValue: ''
      });
      setModalType('competition');
      setShowModal(true);
      console.log('Opening competition creation modal...');
    } catch (error) {
      console.error('Error opening competition modal:', error);
      showNotification('Error opening competition form. Please try again.', 'error');
    }
  };

  const closeModal = () => {
    try {
      setShowModal(false);
      setModalType('');
      setFormData({});
      setIsSubmitting(false);
    } catch (error) {
      console.error('Error closing modal:', error);
    }
  };

  // Form submission handlers
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submitted with data:', formData);
    console.log('Modal type:', modalType);
    
    // Validate required fields
    if (!validateForm()) {
      showNotification('Please fill in all required fields.', 'error');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      switch (modalType) {
        case 'assignment':
          await handleAssignmentSubmit();
          break;
        case 'report':
          await handleReportSubmit();
          break;
        case 'announcement':
          await handleAnnouncementSubmit();
          break;
        case 'goals':
          await handleGoalsSubmit();
          break;
        case 'competition':
          await handleCompetitionSubmit();
          break;
        default:
          console.log('Unknown modal type:', modalType);
          showNotification('Unknown form type. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      showNotification('There was an error submitting the form. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateForm = () => {
    try {
      switch (modalType) {
        case 'assignment':
          return formData.title && formData.description && formData.dueDate;
        case 'report':
          return formData.reportType;
        case 'announcement':
          return formData.subject && formData.message;
        case 'goals':
          return formData.goalType && formData.goalDescription;
        case 'competition':
          return formData.name && formData.description && formData.startDate && formData.endDate;
        default:
          return false;
      }
    } catch (error) {
      console.error('Form validation error:', error);
      return false;
    }
  };

  const handleAssignmentSubmit = async () => {
    console.log('Creating assignment:', formData);
    
    try {
      // Simulate API call with potential failure
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          // Simulate 90% success rate
          if (Math.random() > 0.1) {
            resolve();
          } else {
            reject(new Error('Network error'));
          }
        }, 1000);
      });
      
      showNotification(`Assignment "${formData.title}" created successfully! Students will be notified.`, 'success');
      closeModal();
      
      // In a real app, you would make an API call here:
      // const response = await fetch('/api/assignments', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     title: formData.title,
      //     description: formData.description,
      //     dueDate: formData.dueDate,
      //     points: formData.points || 100
      //   })
      // });
      // if (!response.ok) throw new Error('Failed to create assignment');
    } catch (error) {
      console.error('Assignment creation failed:', error);
      throw error;
    }
  };

  const handleReportSubmit = async () => {
    console.log('Generating report:', formData);
    
    try {
      // Simulate API call with longer processing time
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() > 0.05) {
            resolve();
          } else {
            reject(new Error('Report generation failed'));
          }
        }, 1500);
      });
      
      const reportType = formData.reportType || 'Class Progress Report';
      showNotification(`${reportType} generated successfully! Check your downloads folder.`, 'success');
      closeModal();
      
      // In a real app, you would generate and download the report:
      // const response = await fetch('/api/reports/generate', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     reportType: formData.reportType,
      //     startDate: formData.startDate,
      //     endDate: formData.endDate,
      //     includeCharts: formData.includeCharts,
      //     includePRData: formData.includePRData,
      //     includeAI: formData.includeAI,
      //     includeRisk: formData.includeRisk
      //   })
      // });
      // if (!response.ok) throw new Error('Failed to generate report');
      // const blob = await response.blob();
      // const url = window.URL.createObjectURL(blob);
      // const a = document.createElement('a');
      // a.href = url;
      // a.download = `${reportType.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      // a.click();
    } catch (error) {
      console.error('Report generation failed:', error);
      throw error;
    }
  };

  const handleAnnouncementSubmit = async () => {
    console.log('Sending announcement:', formData);
    
    try {
      // Simulate API call
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() > 0.05) {
            resolve();
          } else {
            reject(new Error('Failed to send announcement'));
          }
        }, 800);
      });
      
      // Calculate recipient count
      let recipientCount = 0;
      if (formData.allStudents) recipientCount += classStats.totalStudents || 25;
      if (formData.atRiskOnly) recipientCount += classStats.atRiskStudents || 3;
      if (formData.highPerformers) recipientCount += Math.floor((classStats.totalStudents || 25) * 0.2);
      
      if (recipientCount === 0) recipientCount = classStats.totalStudents || 25; // Default to all students
      
      showNotification(`Announcement "${formData.subject}" sent to ${recipientCount} students successfully!`, 'success');
      closeModal();
      
      // In a real app, you would send the announcement:
      // const response = await fetch('/api/announcements', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     subject: formData.subject,
      //     message: formData.message,
      //     priority: formData.priority || 'Normal',
      //     recipients: {
      //       allStudents: formData.allStudents,
      //       atRiskOnly: formData.atRiskOnly,
      //       highPerformers: formData.highPerformers
      //     }
      //   })
      // });
      // if (!response.ok) throw new Error('Failed to send announcement');
    } catch (error) {
      console.error('Announcement sending failed:', error);
      throw error;
    }
  };

  const handleGoalsSubmit = async () => {
    console.log('Setting learning goals:', formData);
    
    try {
      // Simulate API call
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() > 0.05) {
            resolve();
          } else {
            reject(new Error('Failed to set learning goals'));
          }
        }, 1200);
      });
      
      const goalType = formData.goalType || 'Class-wide Goal';
      const targetDate = formData.targetDate ? ` by ${new Date(formData.targetDate).toLocaleDateString()}` : '';
      
      const shortDescription = formData.goalDescription ? formData.goalDescription.substring(0, 30) : 'Goal';
      showNotification(`${goalType} "${shortDescription}..." set successfully${targetDate}!`, 'success');
      closeModal();
      
      // In a real app, you would save the goals:
      // const response = await fetch('/api/goals', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     goalType: formData.goalType,
      //     description: formData.goalDescription,
      //     targetDate: formData.targetDate,
      //     successCriteria: formData.successCriteria,
      //     createdAt: new Date().toISOString()
      //   })
      // });
      // if (!response.ok) throw new Error('Failed to set learning goals');
    } catch (error) {
      console.error('Goal setting failed:', error);
      throw error;
    }
  };

  const handleCompetitionSubmit = async () => {
    console.log('Creating competition:', formData);
    
    try {
      // Simulate API call
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() > 0.05) {
            resolve();
          } else {
            reject(new Error('Failed to create competition'));
          }
        }, 1000);
      });
      
      const competitionName = formData.name || 'New Competition';
      const startDate = formData.startDate ? new Date(formData.startDate).toLocaleDateString() : 'TBD';
      
      showNotification(`Competition "${competitionName}" created successfully! Starting ${startDate}.`, 'success');
      closeModal();
      
      // In a real app, you would save the competition:
      // const response = await fetch('/api/competitions', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     name: formData.name,
      //     type: formData.type,
      //     platform: formData.platform,
      //     description: formData.description,
      //     startDate: formData.startDate,
      //     endDate: formData.endDate,
      //     requirements: formData.requirements ? formData.requirements.split('\n') : [],
      //     pointValue: formData.pointValue || 100
      //   })
      // });
      // if (!response.ok) throw new Error('Failed to create competition');
    } catch (error) {
      console.error('Competition creation failed:', error);
      throw error;
    }
  };

  const handleInputChange = (field, value) => {
    try {
      console.log(`Field ${field} changed to:`, value);
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    } catch (error) {
      console.error('Input change error:', error);
      showNotification('Error updating form field. Please try again.', 'error');
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Interactive handlers for student management
  const handleStudentMessage = (student) => {
    try {
      console.log('Messaging student:', student.name);
      showNotification(`Message sent to ${student.name}`, 'success');
      // In a real app: open messaging interface or send email
    } catch (error) {
      console.error('Error messaging student:', error);
      showNotification('Error sending message. Please try again.', 'error');
    }
  };

  const handleStudentDetails = (student) => {
    try {
      console.log('Viewing student details:', student.name);
      setSelectedStudent(student);
      showNotification(`Viewing details for ${student.name}`, 'success');
      // In a real app: navigate to detailed student view
    } catch (error) {
      console.error('Error viewing student details:', error);
      showNotification('Error loading student details. Please try again.', 'error');
    }
  };

  const handleStudentIntervention = (student) => {
    try {
      console.log('Creating intervention for:', student.name);
      showNotification(`Intervention plan created for ${student.name}`, 'success');
      // In a real app: open intervention planning interface
    } catch (error) {
      console.error('Error creating intervention:', error);
      showNotification('Error creating intervention. Please try again.', 'error');
    }
  };

  const handleContactStudent = (alertId, studentName) => {
    try {
      console.log('Contacting student from alert:', studentName);
      showNotification(`Contacting ${studentName} regarding alert`, 'success');
      // In a real app: initiate contact workflow
    } catch (error) {
      console.error('Error contacting student:', error);
      showNotification('Error contacting student. Please try again.', 'error');
    }
  };

  const handleResolveAlert = (alertId) => {
    try {
      console.log('Resolving alert:', alertId);
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
      showNotification('Alert resolved successfully', 'success');
      // In a real app: update alert status in database
    } catch (error) {
      console.error('Error resolving alert:', error);
      showNotification('Error resolving alert. Please try again.', 'error');
    }
  };

  // Competition management handlers
  const handleCompetitionView = (competition) => {
    try {
      console.log('Viewing competition:', competition.name);
      showNotification(`Viewing ${competition.name} details`, 'success');
      // In a real app: navigate to competition details page
    } catch (error) {
      console.error('Error viewing competition:', error);
      showNotification('Error loading competition details. Please try again.', 'error');
    }
  };

  const handleCompetitionEdit = (competition) => {
    try {
      console.log('Editing competition:', competition.name);
      setFormData({
        name: competition.name,
        type: competition.type,
        platform: competition.platform,
        description: competition.description,
        startDate: competition.startDate.toISOString().split('T')[0],
        endDate: competition.endDate.toISOString().split('T')[0],
        requirements: competition.requirements.join('\n'),
        pointValue: '100'
      });
      setModalType('competition');
      setShowModal(true);
      showNotification(`Editing ${competition.name}`, 'success');
    } catch (error) {
      console.error('Error editing competition:', error);
      showNotification('Error opening competition editor. Please try again.', 'error');
    }
  };

  const handleCompetitionManage = (competition) => {
    try {
      console.log('Managing competition:', competition.name);
      showNotification(`Managing ${competition.name} participants`, 'success');
      // In a real app: open competition management interface
    } catch (error) {
      console.error('Error managing competition:', error);
      showNotification('Error opening competition management. Please try again.', 'error');
    }
  };

  const handleCampaignAnalytics = (campaign) => {
    try {
      console.log('Viewing campaign analytics:', campaign.name);
      showNotification(`Loading analytics for ${campaign.name}`, 'success');
      // In a real app: navigate to campaign analytics page
    } catch (error) {
      console.error('Error loading campaign analytics:', error);
      showNotification('Error loading campaign analytics. Please try again.', 'error');
    }
  };

  const handleCampaignManage = (campaign) => {
    try {
      console.log('Managing campaign:', campaign.name);
      showNotification(`Managing ${campaign.name}`, 'success');
      // In a real app: open campaign management interface
    } catch (error) {
      console.error('Error managing campaign:', error);
      showNotification('Error opening campaign management. Please try again.', 'error');
    }
  };

  // Filter functionality
  const handleFilterChange = (status) => {
    try {
      setFilterStatus(status);
      console.log('Filter changed to:', status);
      showNotification(`Showing ${status === 'all' ? 'all' : status} students`, 'success');
    } catch (error) {
      console.error('Error changing filter:', error);
      showNotification('Error applying filter. Please try again.', 'error');
    }
  };

  // Get filtered students
  const getFilteredStudents = () => {
    try {
      let filtered = students;
      
      // Apply status filter
      switch (filterStatus) {
        case 'active':
          filtered = filtered.filter(s => s.status === 'active');
          break;
        case 'at-risk':
          filtered = filtered.filter(s => s.status === 'at-risk');
          break;
        case 'inactive':
          filtered = filtered.filter(s => s.status === 'inactive');
          break;
        default:
          break;
      }
      
      // Apply search filter
      if (searchTerm) {
        filtered = filtered.filter(s => 
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      return filtered;
    } catch (error) {
      console.error('Error filtering students:', error);
      return students;
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      try {
        // Ctrl/Cmd + R for refresh
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
          e.preventDefault();
          setLoading(true);
          setTimeout(() => {
            setLoading(false);
            showNotification('Dashboard refreshed via keyboard shortcut!', 'success');
          }, 1000);
        }
        
        // Ctrl/Cmd + N for new assignment
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
          e.preventDefault();
          handleCreateAssignment();
        }
        
        // Escape to close modal
        if (e.key === 'Escape' && showModal) {
          closeModal();
        }
        
        // ? to show keyboard shortcuts
        if (e.key === '?' && !showModal) {
          e.preventDefault();
          setShowKeyboardShortcuts(!showKeyboardShortcuts);
        }
      } catch (error) {
        console.error('Error handling keyboard shortcut:', error);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showModal, showKeyboardShortcuts]);

  if (loading) {
    console.log('TeacherDashboard: Rendering loading state...');
    return (
      <div className="teacher-loading">
        <div className="loading-spinner"></div>
        <p>Loading GamifyX Teacher Dashboard...</p>
        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginTop: '1rem' }}>
          Initializing AI-powered analytics and student monitoring...
        </p>
      </div>
    );
  }

  return (
    <motion.div 
      className="teacher-dashboard"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="teacher-header">
        <div className="header-content">
          <div className="title-section">
            <h1 className="teacher-title">
              <span className="title-icon">👨‍🏫</span>
              AIOps Teacher Dashboard
            </h1>
            <p className="teacher-subtitle">
              AI-powered student monitoring, progress tracking, and intelligent alerts.
            </p>
          </div>
          <div className="header-actions">
            <button 
              className="refresh-btn"
              onClick={() => {
                setLoading(true);
                setTimeout(() => {
                  setLoading(false);
                  showNotification('Dashboard data refreshed!', 'success');
                }, 1000);
              }}
              disabled={loading}
            >
              <span className="refresh-icon">🔄</span>
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      {/* Class Overview Stats */}
      <div className="class-stats">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-value">{classStats.totalStudents}</div>
            <div className="stat-label">Total Students</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{classStats.activeStudents}</div>
            <div className="stat-label">Active Students</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-value">{classStats.atRiskStudents}</div>
            <div className="stat-label">At Risk</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{classStats.averageProgress}%</div>
            <div className="stat-label">Avg Progress</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="teacher-tabs">
        <button 
          className={`tab-btn ${activeView === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveView('overview')}
        >
          <span className="tab-icon">📊</span>
          Class Overview
        </button>
        <button 
          className={`tab-btn ${activeView === 'students' ? 'active' : ''}`}
          onClick={() => setActiveView('students')}
        >
          <span className="tab-icon">👥</span>
          Student Management
        </button>
        <button 
          className={`tab-btn ${activeView === 'competitions' ? 'active' : ''}`}
          onClick={() => setActiveView('competitions')}
        >
          <span className="tab-icon">🏆</span>
          Competitions ({competitions.length})
        </button>
        <button 
          className={`tab-btn ${activeView === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveView('analytics')}
        >
          <span className="tab-icon">📈</span>
          Analytics
        </button>
        <button 
          className={`tab-btn ${activeView === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveView('profile')}
        >
          <span className="tab-icon">👨‍🏫</span>
          Profile
        </button>
        <button 
          className={`tab-btn ${activeView === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveView('alerts')}
        >
          <span className="tab-icon">🚨</span>
          AI Alerts ({alerts.length})
        </button>
        <button 
          className={`tab-btn ${activeView === 'github' ? 'active' : ''}`}
          onClick={() => setActiveView('github')}
        >
          <span className="tab-icon">🔀</span>
          GitHub PR Tracking
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeView === 'overview' && (
          <motion.div 
            className="overview-section"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="charts-grid">
              {/* Student Progress Chart */}
              <div className="chart-card">
                <h3>Student Progress & Code Quality</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={progressData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="name" stroke="#ffffff" />
                    <YAxis stroke="#ffffff" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.8)', 
                        border: '1px solid rgba(0,255,255,0.3)',
                        borderRadius: '8px'
                      }} 
                    />
                    <Bar dataKey="progress" fill="#00FFFF" name="Progress %" />
                    <Bar dataKey="codeQuality" fill="#FF00FF" name="Code Quality" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Risk Distribution */}
              <div className="chart-card">
                <h3>Student Risk Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={riskDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {riskDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
              <h3>Quick Actions</h3>
              <div className="actions-grid">
                <button className="action-card" onClick={handleCreateAssignment}>
                  <span className="action-icon">📝</span>
                  <span className="action-text">Create Assignment</span>
                </button>
                <button className="action-card" onClick={handleGenerateReport}>
                  <span className="action-icon">📊</span>
                  <span className="action-text">Generate Report</span>
                </button>
                <button className="action-card" onClick={handleSendAnnouncement}>
                  <span className="action-icon">📧</span>
                  <span className="action-text">Send Announcements</span>
                </button>
                <button className="action-card" onClick={handleSetLearningGoals}>
                  <span className="action-icon">🎯</span>
                  <span className="action-text">Set Learning Goals</span>
                </button>
                <button className="action-card" onClick={handleCreateCompetition}>
                  <span className="action-icon">🏆</span>
                  <span className="action-text">Create Competition</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {activeView === 'students' && (
          <motion.div 
            className="students-section"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="students-header">
              <h3>Student Management & AI Insights</h3>
              <div className="students-controls">
                <div className="search-container">
                  <input
                    type="text"
                    placeholder="Search students by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                  <span className="search-icon">🔍</span>
                </div>
                <div className="students-filters">
                  <select 
                    className="filter-select"
                    value={filterStatus}
                    onChange={(e) => handleFilterChange(e.target.value)}
                  >
                    <option value="all">All Students</option>
                    <option value="active">Active</option>
                    <option value="at-risk">At Risk</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {getFilteredStudents().length === 0 ? (
              <div className="no-results">
                <div className="no-results-icon">🔍</div>
                <h3>No Students Found</h3>
                <p>
                  {searchTerm 
                    ? `No students match "${searchTerm}"`
                    : `No ${filterStatus === 'all' ? '' : filterStatus} students found`
                  }
                </p>
              </div>
            ) : (
              <div className="students-grid">
                {getFilteredStudents().map((student, index) => (
                <motion.div
                  key={student.id}
                  className={`student-card status-${student.status}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="student-header">
                    <div className="student-info">
                      <div className="student-avatar">{student.avatar}</div>
                      <div className="student-details">
                        <h4>{student.name}</h4>
                        <p>{student.email}</p>
                      </div>
                    </div>
                    <div className={`student-status status-${student.status}`}>
                      {student.status.replace('-', ' ')}
                    </div>
                  </div>

                  <div className="student-metrics">
                    <div className="metric">
                      <span className="metric-label">Progress:</span>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ width: `${student.progress}%` }}
                        ></div>
                      </div>
                      <span className="metric-value">{student.progress}%</span>
                    </div>

                    <div className="metric">
                      <span className="metric-label">Risk Score:</span>
                      <div className="risk-indicator">
                        <div 
                          className={`risk-dot risk-${student.riskScore > 0.6 ? 'high' : student.riskScore > 0.3 ? 'medium' : 'low'}`}
                        ></div>
                        <span className="risk-value">{Math.round(student.riskScore * 100)}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="student-stats">
                    <div className="stat-item">
                      <span className="stat-icon">📝</span>
                      <span className="stat-text">{student.submissions} submissions</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-icon">🔀</span>
                      <span className="stat-text">{student.githubPRs} GitHub PRs</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-icon">⭐</span>
                      <span className="stat-text">{student.codeQuality}% code quality</span>
                    </div>
                  </div>

                  <div className="ai-insights">
                    <div className="predicted-grade">
                      <span className="grade-label">AI Predicted Grade:</span>
                      <span className="grade-value">{student.predictedGrade}</span>
                    </div>
                    
                    <div className="strengths-weaknesses">
                      <div className="strengths">
                        <span className="sw-label">💪 Strengths:</span>
                        <span className="sw-value">{student.strengths.join(', ')}</span>
                      </div>
                      {student.weaknesses.length > 0 && (
                        <div className="weaknesses">
                          <span className="sw-label">📈 Needs Work:</span>
                          <span className="sw-value">{student.weaknesses.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="student-actions">
                    <button 
                      className="action-btn message-btn"
                      onClick={() => handleStudentMessage(student)}
                    >
                      <span className="btn-icon">💬</span>
                      Message
                    </button>
                    <button 
                      className="action-btn view-btn"
                      onClick={() => handleStudentDetails(student)}
                    >
                      <span className="btn-icon">👁️</span>
                      View Details
                    </button>
                    {student.riskScore > 0.6 && (
                      <button 
                        className="action-btn intervention-btn"
                        onClick={() => handleStudentIntervention(student)}
                      >
                        <span className="btn-icon">🆘</span>
                        Intervention
                      </button>
                    )}
                  </div>

                  <div className="last-activity">
                    <span className="activity-label">Last Activity:</span>
                    <span className="activity-time">{student.lastActivity.toLocaleDateString()}</span>
                  </div>
                </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeView === 'alerts' && (
          <motion.div 
            className="alerts-section"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h3>🚨 AI-Generated Student Alerts</h3>
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
                    <div className="alert-student">
                      <h4>{alert.studentName}</h4>
                      <span className={`alert-type type-${alert.type}`}>
                        {alert.type.replace('_', ' ')}
                      </span>
                    </div>
                    <div className={`alert-severity severity-${alert.severity}`}>
                      {alert.severity} priority
                    </div>
                  </div>

                  <div className="alert-content">
                    <p className="alert-message">{alert.message}</p>
                    <div className="alert-recommendation">
                      <span className="rec-icon">💡</span>
                      <span className="rec-text">{alert.recommendation}</span>
                    </div>
                  </div>

                  <div className="alert-footer">
                    <span className="alert-time">{alert.timestamp.toLocaleString()}</span>
                    <div className="alert-actions">
                      <button 
                        className="action-btn contact-btn"
                        onClick={() => handleContactStudent(alert.id, alert.studentName)}
                      >
                        Contact Student
                      </button>
                      <button 
                        className="action-btn resolve-btn"
                        onClick={() => handleResolveAlert(alert.id)}
                      >
                        Mark Resolved
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {activeView === 'competitions' && (
          <motion.div 
            className="competitions-section"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="competitions-header">
              <h3>🏆 Competition Management</h3>
              <button className="create-btn" onClick={handleCreateCompetition}>
                <span className="btn-icon">➕</span>
                Create Competition
              </button>
            </div>

            <div className="competitions-stats">
              <div className="stat-card">
                <div className="stat-icon">🏆</div>
                <div className="stat-content">
                  <div className="stat-value">{competitions.length}</div>
                  <div className="stat-label">Active Competitions</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-content">
                  <div className="stat-value">{competitions.reduce((sum, comp) => sum + comp.participants, 0)}</div>
                  <div className="stat-label">Total Participants</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">✅</div>
                <div className="stat-content">
                  <div className="stat-value">{competitions.reduce((sum, comp) => sum + comp.completions, 0)}</div>
                  <div className="stat-label">Completions</div>
                </div>
              </div>
            </div>

            <div className="competitions-grid">
              {competitions.map((competition, index) => (
                <motion.div
                  key={competition.id}
                  className={`competition-card status-${competition.status}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="competition-header">
                    <div className="competition-info">
                      <h4>{competition.name}</h4>
                      <p className="competition-type">{competition.type.replace('-', ' ')}</p>
                    </div>
                    <div className={`competition-status status-${competition.status}`}>
                      {competition.status}
                    </div>
                  </div>

                  <div className="competition-description">
                    <p>{competition.description}</p>
                  </div>

                  <div className="competition-dates">
                    <div className="date-item">
                      <span className="date-label">Start:</span>
                      <span className="date-value">{competition.startDate.toLocaleDateString()}</span>
                    </div>
                    <div className="date-item">
                      <span className="date-label">End:</span>
                      <span className="date-value">{competition.endDate.toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="competition-metrics">
                    <div className="metric">
                      <span className="metric-label">Participants:</span>
                      <span className="metric-value">{competition.participants}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Completions:</span>
                      <span className="metric-value">{competition.completions}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Success Rate:</span>
                      <span className="metric-value">{Math.round((competition.completions / competition.participants) * 100)}%</span>
                    </div>
                  </div>

                  <div className="competition-requirements">
                    <h5>Requirements:</h5>
                    <ul>
                      {competition.requirements.map((req, idx) => (
                        <li key={idx}>{req}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="competition-actions">
                    <button 
                      className="action-btn view-btn"
                      onClick={() => handleCompetitionView(competition)}
                    >
                      <span className="btn-icon">👁️</span>
                      View Details
                    </button>
                    <button 
                      className="action-btn edit-btn"
                      onClick={() => handleCompetitionEdit(competition)}
                    >
                      <span className="btn-icon">✏️</span>
                      Edit
                    </button>
                    {competition.status === 'active' && (
                      <button 
                        className="action-btn manage-btn"
                        onClick={() => handleCompetitionManage(competition)}
                      >
                        <span className="btn-icon">⚙️</span>
                        Manage
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="campaigns-section">
              <h3>📢 Competition Campaigns</h3>
              <div className="campaigns-grid">
                {campaigns.map((campaign, index) => (
                  <motion.div
                    key={campaign.id}
                    className="campaign-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="campaign-header">
                      <h4>{campaign.name}</h4>
                      <div className={`campaign-status status-${campaign.status}`}>
                        {campaign.status}
                      </div>
                    </div>
                    <p className="campaign-description">{campaign.description}</p>
                    
                    <div className="campaign-analytics">
                      <div className="analytics-item">
                        <span className="analytics-label">Participation Rate:</span>
                        <span className="analytics-value">{campaign.analytics.participationRate}%</span>
                      </div>
                      <div className="analytics-item">
                        <span className="analytics-label">Completion Rate:</span>
                        <span className="analytics-value">{campaign.analytics.completionRate}%</span>
                      </div>
                      <div className="analytics-item">
                        <span className="analytics-label">Performance Correlation:</span>
                        <span className="analytics-value">{campaign.analytics.performanceCorrelation}</span>
                      </div>
                    </div>

                    <div className="campaign-actions">
                      <button 
                        className="action-btn analytics-btn"
                        onClick={() => handleCampaignAnalytics(campaign)}
                      >
                        <span className="btn-icon">📊</span>
                        Analytics
                      </button>
                      <button 
                        className="action-btn manage-btn"
                        onClick={() => handleCampaignManage(campaign)}
                      >
                        <span className="btn-icon">⚙️</span>
                        Manage
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeView === 'analytics' && (
          <motion.div 
            className="analytics-section"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h3>📈 Advanced Analytics Dashboard</h3>
            
            <div className="analytics-overview">
              <div className="analytics-card">
                <h4>Class Performance Trends</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={progressData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="name" stroke="#ffffff" />
                    <YAxis stroke="#ffffff" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.8)', 
                        border: '1px solid rgba(0,255,255,0.3)',
                        borderRadius: '8px'
                      }} 
                    />
                    <Line type="monotone" dataKey="progress" stroke="#00FFFF" strokeWidth={2} />
                    <Line type="monotone" dataKey="codeQuality" stroke="#FF00FF" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="analytics-card">
                <h4>Competition Impact Analysis</h4>
                <div className="impact-metrics">
                  <div className="impact-item">
                    <span className="impact-label">Students in Competitions:</span>
                    <span className="impact-value">15/25 (60%)</span>
                  </div>
                  <div className="impact-item">
                    <span className="impact-label">Average Grade Improvement:</span>
                    <span className="impact-value">+12.5%</span>
                  </div>
                  <div className="impact-item">
                    <span className="impact-label">Engagement Correlation:</span>
                    <span className="impact-value">0.72 (Strong)</span>
                  </div>
                  <div className="impact-item">
                    <span className="impact-label">Skill Development Rate:</span>
                    <span className="impact-value">+18% faster</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="detailed-analytics">
              <div className="analytics-card">
                <h4>Student Engagement Heatmap</h4>
                <div className="heatmap-container">
                  <div className="heatmap-grid">
                    {students.map((student, index) => (
                      <div 
                        key={student.id} 
                        className={`heatmap-cell engagement-${student.progress > 80 ? 'high' : student.progress > 60 ? 'medium' : 'low'}`}
                        title={`${student.name}: ${student.progress}% progress`}
                        onClick={() => handleStudentDetails(student)}
                        style={{ cursor: 'pointer' }}
                      >
                        {student.name.split(' ')[0]}
                      </div>
                    ))}
                  </div>
                  <div className="heatmap-legend">
                    <div className="legend-item">
                      <div className="legend-color engagement-high"></div>
                      <span>High Engagement (80%+)</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color engagement-medium"></div>
                      <span>Medium Engagement (60-80%)</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color engagement-low"></div>
                      <span>Low Engagement (&lt;60%)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="analytics-card">
                <h4>Predictive Analytics</h4>
                <div className="predictions">
                  <div className="prediction-item">
                    <h5>At-Risk Students</h5>
                    <div className="prediction-list">
                      {students.filter(s => s.riskScore > 0.6).map(student => (
                        <div key={student.id} className="prediction-student">
                          <span className="student-name">{student.name}</span>
                          <span className="risk-score">{Math.round(student.riskScore * 100)}% risk</span>
                          <span className="recommendation">Recommend: Individual support</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="prediction-item">
                    <h5>Performance Forecast</h5>
                    <div className="forecast-metrics">
                      <div className="forecast-metric">
                        <span className="metric-name">Expected Class Average:</span>
                        <span className="metric-value">73.2%</span>
                      </div>
                      <div className="forecast-metric">
                        <span className="metric-name">Projected Completion Rate:</span>
                        <span className="metric-value">88%</span>
                      </div>
                      <div className="forecast-metric">
                        <span className="metric-name">Intervention Success Rate:</span>
                        <span className="metric-value">76%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeView === 'profile' && (
          <motion.div 
            className="profile-section"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="profile-header">
              <div className="profile-avatar">
                <div className="avatar-image">👨‍🏫</div>
                <button 
                  className="avatar-edit"
                  onClick={() => showNotification('Avatar upload feature coming soon!', 'success')}
                >
                  📷
                </button>
              </div>
              <div className="profile-info">
                <h2>Dr. Sarah Johnson</h2>
                <p className="profile-title">Senior DevOps Instructor</p>
                <p className="profile-department">Computer Science Department</p>
                <div className="profile-stats">
                  <div className="profile-stat">
                    <span className="stat-value">5</span>
                    <span className="stat-label">Years Teaching</span>
                  </div>
                  <div className="profile-stat">
                    <span className="stat-value">150+</span>
                    <span className="stat-label">Students Taught</span>
                  </div>
                  <div className="profile-stat">
                    <span className="stat-value">4.8/5</span>
                    <span className="stat-label">Rating</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="profile-content">
              <div className="profile-card">
                <h3>Teaching Performance</h3>
                <div className="performance-metrics">
                  <div className="performance-item">
                    <span className="performance-label">Student Success Rate:</span>
                    <div className="performance-bar">
                      <div className="performance-fill" style={{ width: '92%' }}></div>
                    </div>
                    <span className="performance-value">92%</span>
                  </div>
                  <div className="performance-item">
                    <span className="performance-label">Engagement Score:</span>
                    <div className="performance-bar">
                      <div className="performance-fill" style={{ width: '88%' }}></div>
                    </div>
                    <span className="performance-value">88%</span>
                  </div>
                  <div className="performance-item">
                    <span className="performance-label">Innovation Index:</span>
                    <div className="performance-bar">
                      <div className="performance-fill" style={{ width: '95%' }}></div>
                    </div>
                    <span className="performance-value">95%</span>
                  </div>
                </div>
              </div>

              <div className="profile-card">
                <h3>Achievements & Certifications</h3>
                <div className="achievements-grid">
                  <div className="achievement-item">
                    <div className="achievement-icon">🏆</div>
                    <div className="achievement-info">
                      <h4>Excellence in Teaching Award</h4>
                      <p>University Recognition - 2023</p>
                    </div>
                  </div>
                  <div className="achievement-item">
                    <div className="achievement-icon">☁️</div>
                    <div className="achievement-info">
                      <h4>AWS Certified Solutions Architect</h4>
                      <p>Professional Level - 2024</p>
                    </div>
                  </div>
                  <div className="achievement-item">
                    <div className="achievement-icon">🔧</div>
                    <div className="achievement-info">
                      <h4>Kubernetes Certified Administrator</h4>
                      <p>CNCF Certification - 2023</p>
                    </div>
                  </div>
                  <div className="achievement-item">
                    <div className="achievement-icon">📚</div>
                    <div className="achievement-info">
                      <h4>Published Research</h4>
                      <p>DevOps Education Methods - 2024</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="profile-card">
                <h3>Current Classes</h3>
                <div className="classes-list">
                  <div className="class-item">
                    <div className="class-info">
                      <h4>Advanced DevOps Practices</h4>
                      <p>CS-485 • Fall 2024 • 25 students</p>
                    </div>
                    <div className="class-stats">
                      <span className="class-stat">Avg: 78%</span>
                      <span className="class-stat">3 at-risk</span>
                    </div>
                  </div>
                  <div className="class-item">
                    <div className="class-info">
                      <h4>Cloud Infrastructure</h4>
                      <p>CS-420 • Fall 2024 • 32 students</p>
                    </div>
                    <div className="class-stats">
                      <span className="class-stat">Avg: 82%</span>
                      <span className="class-stat">1 at-risk</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="profile-card">
                <h3>Professional Development</h3>
                <div className="development-timeline">
                  <div className="timeline-item">
                    <div className="timeline-date">2024</div>
                    <div className="timeline-content">
                      <h4>AI in Education Conference</h4>
                      <p>Keynote speaker on "Integrating AI in DevOps Education"</p>
                    </div>
                  </div>
                  <div className="timeline-item">
                    <div className="timeline-date">2023</div>
                    <div className="timeline-content">
                      <h4>DevOps Days Workshop</h4>
                      <p>Led workshop on "Teaching Infrastructure as Code"</p>
                    </div>
                  </div>
                  <div className="timeline-item">
                    <div className="timeline-date">2023</div>
                    <div className="timeline-content">
                      <h4>Research Sabbatical</h4>
                      <p>6-month research on gamification in technical education</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeView === 'github' && (
          <motion.div 
            className="github-section"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="github-header">
              <h2>🔀 GitHub PR Tracking</h2>
              <p>Monitor student GitHub activity and pull request submissions</p>
            </div>

            <div className="github-content">
              {/* GitHub Configuration Panel */}
              <div className="github-config-section">
                <GitHubConfigPanel 
                  onConfigUpdate={(config) => {
                    console.log('GitHub config updated:', config);
                    // Handle configuration updates
                  }}
                />
              </div>

              {/* Class PR Overview */}
              <div className="github-overview-section">
                <ClassPROverview refreshTrigger={Date.now()} />
              </div>

              {/* Individual Student PR Trackers */}
              <div className="github-students-section">
                <h3>📊 Individual Student PR Tracking</h3>
                <div className="student-pr-grid">
                  {students.map((student) => (
                    <StudentPRTracker
                      key={student.id}
                      studentId={student.id.toString()}
                      studentName={student.name}
                      compact={true}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Quick Actions Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {modalType === 'assignment' && '📝 Create Assignment'}
                {modalType === 'report' && '📊 Generate Report'}
                {modalType === 'announcement' && '📧 Send Announcement'}
                {modalType === 'goals' && '🎯 Set Learning Goals'}
                {modalType === 'competition' && '🏆 Create Competition'}
              </h3>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="modal-body">
                {modalType === 'assignment' && (
                  <div className="assignment-form">
                    <div className="form-group">
                      <label>Assignment Title *</label>
                      <input 
                        type="text" 
                        placeholder="Enter assignment title..." 
                        value={formData.title || ''}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Description *</label>
                      <textarea 
                        placeholder="Assignment description and requirements..."
                        value={formData.description || ''}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        required
                      ></textarea>
                    </div>
                    <div className="form-group">
                      <label>Due Date *</label>
                      <input 
                        type="datetime-local" 
                        value={formData.dueDate || ''}
                        onChange={(e) => handleInputChange('dueDate', e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Points</label>
                      <input 
                        type="number" 
                        placeholder="100" 
                        value={formData.points || ''}
                        onChange={(e) => handleInputChange('points', e.target.value)}
                        min="0"
                      />
                    </div>
                  </div>
                )}
              
                {modalType === 'report' && (
                  <div className="report-form">
                    <div className="form-group">
                      <label>Report Type *</label>
                      <select 
                        value={formData.reportType || 'Class Progress Report'}
                        onChange={(e) => handleInputChange('reportType', e.target.value)}
                        required
                      >
                        <option>Class Progress Report</option>
                        <option>Individual Student Report</option>
                        <option>GitHub Activity Report</option>
                        <option>Risk Assessment Report</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Date Range</label>
                      <div className="date-range">
                        <input 
                          type="date" 
                          value={formData.startDate || ''}
                          onChange={(e) => handleInputChange('startDate', e.target.value)}
                        />
                        <span>to</span>
                        <input 
                          type="date" 
                          value={formData.endDate || ''}
                          onChange={(e) => handleInputChange('endDate', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Include</label>
                      <div className="checkbox-group">
                        <label>
                          <input 
                            type="checkbox" 
                            checked={formData.includeCharts !== false}
                            onChange={(e) => handleInputChange('includeCharts', e.target.checked)}
                          /> 
                          Progress Charts
                        </label>
                        <label>
                          <input 
                            type="checkbox" 
                            checked={formData.includePRData !== false}
                            onChange={(e) => handleInputChange('includePRData', e.target.checked)}
                          /> 
                          GitHub PR Data
                        </label>
                        <label>
                          <input 
                            type="checkbox" 
                            checked={formData.includeAI || false}
                            onChange={(e) => handleInputChange('includeAI', e.target.checked)}
                          /> 
                          AI Insights
                        </label>
                        <label>
                          <input 
                            type="checkbox" 
                            checked={formData.includeRisk || false}
                            onChange={(e) => handleInputChange('includeRisk', e.target.checked)}
                          /> 
                          Risk Analysis
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              
                {modalType === 'announcement' && (
                  <div className="announcement-form">
                    <div className="form-group">
                      <label>Subject *</label>
                      <input 
                        type="text" 
                        placeholder="Announcement subject..." 
                        value={formData.subject || ''}
                        onChange={(e) => handleInputChange('subject', e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Message *</label>
                      <textarea 
                        placeholder="Your announcement message..."
                        value={formData.message || ''}
                        onChange={(e) => handleInputChange('message', e.target.value)}
                        required
                      ></textarea>
                    </div>
                    <div className="form-group">
                      <label>Recipients</label>
                      <div className="checkbox-group">
                        <label>
                          <input 
                            type="checkbox" 
                            checked={formData.allStudents !== false}
                            onChange={(e) => handleInputChange('allStudents', e.target.checked)}
                          /> 
                          All Students
                        </label>
                        <label>
                          <input 
                            type="checkbox" 
                            checked={formData.atRiskOnly || false}
                            onChange={(e) => handleInputChange('atRiskOnly', e.target.checked)}
                          /> 
                          At-Risk Students Only
                        </label>
                        <label>
                          <input 
                            type="checkbox" 
                            checked={formData.highPerformers || false}
                            onChange={(e) => handleInputChange('highPerformers', e.target.checked)}
                          /> 
                          High Performers
                        </label>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Priority</label>
                      <select 
                        value={formData.priority || 'Normal'}
                        onChange={(e) => handleInputChange('priority', e.target.value)}
                      >
                        <option>Normal</option>
                        <option>High</option>
                        <option>Urgent</option>
                      </select>
                    </div>
                  </div>
                )}
              
                {modalType === 'goals' && (
                  <div className="goals-form">
                    <div className="form-group">
                      <label>Goal Type *</label>
                      <select 
                        value={formData.goalType || 'Class-wide Goal'}
                        onChange={(e) => handleInputChange('goalType', e.target.value)}
                        required
                      >
                        <option>Class-wide Goal</option>
                        <option>Individual Student Goal</option>
                        <option>GitHub Activity Goal</option>
                        <option>Submission Goal</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Goal Description *</label>
                      <textarea 
                        placeholder="Describe the learning goal..."
                        value={formData.goalDescription || ''}
                        onChange={(e) => handleInputChange('goalDescription', e.target.value)}
                        required
                      ></textarea>
                    </div>
                    <div className="form-group">
                      <label>Target Date</label>
                      <input 
                        type="date" 
                        value={formData.targetDate || ''}
                        onChange={(e) => handleInputChange('targetDate', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Success Criteria</label>
                      <textarea 
                        placeholder="How will success be measured?"
                        value={formData.successCriteria || ''}
                        onChange={(e) => handleInputChange('successCriteria', e.target.value)}
                      ></textarea>
                    </div>
                  </div>
                )}
                
                {modalType === 'competition' && (
                  <div className="competition-form">
                    <div className="form-group">
                      <label>Competition Name *</label>
                      <input 
                        type="text" 
                        placeholder="Enter competition name..." 
                        value={formData.name || ''}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Type *</label>
                      <select 
                        value={formData.type || 'open-source'}
                        onChange={(e) => handleInputChange('type', e.target.value)}
                        required
                      >
                        <option value="open-source">Open Source</option>
                        <option value="coding-challenge">Coding Challenge</option>
                        <option value="hackathon">Hackathon</option>
                        <option value="external">External Competition</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Platform</label>
                      <select 
                        value={formData.platform || 'github'}
                        onChange={(e) => handleInputChange('platform', e.target.value)}
                      >
                        <option value="github">GitHub</option>
                        <option value="gitlab">GitLab</option>
                        <option value="external">External Platform</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Description *</label>
                      <textarea 
                        placeholder="Describe the competition objectives and goals..."
                        value={formData.description || ''}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        required
                      ></textarea>
                    </div>
                    <div className="form-group">
                      <label>Start Date *</label>
                      <input 
                        type="date" 
                        value={formData.startDate || ''}
                        onChange={(e) => handleInputChange('startDate', e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>End Date *</label>
                      <input 
                        type="date" 
                        value={formData.endDate || ''}
                        onChange={(e) => handleInputChange('endDate', e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Requirements</label>
                      <textarea 
                        placeholder="List competition requirements (one per line)..."
                        value={formData.requirements || ''}
                        onChange={(e) => handleInputChange('requirements', e.target.value)}
                      ></textarea>
                    </div>
                    <div className="form-group">
                      <label>Point Value</label>
                      <input 
                        type="number" 
                        placeholder="100" 
                        value={formData.pointValue || ''}
                        onChange={(e) => handleInputChange('pointValue', e.target.value)}
                        min="0"
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeModal} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="loading-spinner-small"></span>
                      {modalType === 'assignment' && 'Creating...'}
                      {modalType === 'report' && 'Generating...'}
                      {modalType === 'announcement' && 'Sending...'}
                      {modalType === 'goals' && 'Setting...'}
                      {modalType === 'competition' && 'Creating...'}
                    </>
                  ) : (
                    <>
                      {modalType === 'assignment' && 'Create Assignment'}
                      {modalType === 'report' && 'Generate Report'}
                      {modalType === 'announcement' && 'Send Announcement'}
                      {modalType === 'goals' && 'Set Goals'}
                      {modalType === 'competition' && 'Create Competition'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          <div className="notification-content">
            <span className="notification-icon">
              {notification.type === 'success' ? '✅' : '❌'}
            </span>
            <span className="notification-message">{notification.message}</span>
            <button 
              className="notification-close" 
              onClick={() => setNotification(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Helper */}
      {showKeyboardShortcuts && (
        <div className="keyboard-shortcuts show">
          <h4>⌨️ Keyboard Shortcuts</h4>
          <ul>
            <li><kbd>Ctrl/Cmd</kbd> + <kbd>R</kbd> - Refresh Dashboard</li>
            <li><kbd>Ctrl/Cmd</kbd> + <kbd>N</kbd> - New Assignment</li>
            <li><kbd>Esc</kbd> - Close Modal</li>
            <li><kbd>?</kbd> - Toggle Shortcuts</li>
          </ul>
          <button 
            className="close-shortcuts"
            onClick={() => setShowKeyboardShortcuts(false)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary-cyan)',
              cursor: 'pointer',
              marginTop: '0.5rem',
              fontSize: '0.8rem'
            }}
          >
            Close (Esc)
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default TeacherDashboard;