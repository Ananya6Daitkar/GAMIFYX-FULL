/**
 * Intervention Tracking System - Track interventions and their outcomes
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  LinearProgress,
  Alert as MuiAlert,
  Divider,
  IconButton,
  // Tooltip,
  Tabs,
  Tab
} from '@mui/material';
import {
  Assignment,
  // CheckCircle,
  Schedule,
  // Cancel,
  // TrendingUp,
  // TrendingDown,
  Person,
  Add,
  Edit,
  Visibility,
  // Assessment
} from '@mui/icons-material';
import {
  // BarChart,
  // Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';

interface Intervention {
  id: string;
  studentId: string;
  studentName: string;
  type: 'one-on-one' | 'additional-resources' | 'peer-mentoring' | 'study-group' | 'deadline-extension' | 'custom';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled';
  createdAt: string;
  createdBy: string;
  scheduledDate?: string;
  completedDate?: string;
  outcome?: string;
  effectiveness: number; // 1-5 scale
  followUpRequired: boolean;
  followUpDate?: string;
  tags: string[];
  metrics: {
    performanceBefore: number;
    performanceAfter?: number;
    engagementBefore: number;
    engagementAfter?: number;
    riskScoreBefore: number;
    riskScoreAfter?: number;
  };
  notes: Array<{
    id: string;
    content: string;
    createdAt: string;
    createdBy: string;
  }>;
}

interface InterventionTrackingProps {
  interventions: Intervention[];
  onCreateIntervention: (intervention: Partial<Intervention>) => void;
  onUpdateIntervention: (id: string, updates: Partial<Intervention>) => void;
  onDeleteIntervention: (id: string) => void;
  onAddNote: (interventionId: string, note: string) => void;
}

const InterventionTracking: React.FC<InterventionTrackingProps> = ({
  interventions,
  onCreateIntervention,
  onUpdateIntervention,
  // onDeleteIntervention,
  // onAddNote
}) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [createDialog, setCreateDialog] = useState(false);
  const [_editDialog, setEditDialog] = useState<string | null>(null);
  const [outcomeDialog, setOutcomeDialog] = useState<string | null>(null);
  const [newIntervention, setNewIntervention] = useState<Partial<Intervention>>({
    type: 'one-on-one',
    priority: 'medium',
    status: 'planned',
    followUpRequired: false,
    tags: []
  });
  const [outcome, setOutcome] = useState('');
  const [effectiveness, setEffectiveness] = useState(3);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'info';
      case 'in-progress': return 'warning';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'one-on-one': return <Person />;
      case 'additional-resources': return <Assignment />;
      case 'peer-mentoring': return <Person />;
      case 'study-group': return <Person />;
      case 'deadline-extension': return <Schedule />;
      default: return <Assignment />;
    }
  };

  const calculateEffectiveness = (intervention: Intervention) => {
    if (!intervention.metrics.performanceAfter) return null;
    
    const performanceImprovement = intervention.metrics.performanceAfter - intervention.metrics.performanceBefore;
    const engagementImprovement = (intervention.metrics.engagementAfter || 0) - intervention.metrics.engagementBefore;
    const riskImprovement = intervention.metrics.riskScoreBefore - (intervention.metrics.riskScoreAfter || 0);
    
    return {
      performance: performanceImprovement,
      engagement: engagementImprovement,
      risk: riskImprovement,
      overall: (performanceImprovement + engagementImprovement + riskImprovement * 10) / 3
    };
  };

  const getInterventionStats = () => {
    const total = interventions.length;
    const completed = interventions.filter(i => i.status === 'completed').length;
    const inProgress = interventions.filter(i => i.status === 'in-progress').length;
    const planned = interventions.filter(i => i.status === 'planned').length;
    
    const completedInterventions = interventions.filter(i => i.status === 'completed' && i.effectiveness);
    const avgEffectiveness = completedInterventions.length > 0 
      ? completedInterventions.reduce((sum, i) => sum + i.effectiveness, 0) / completedInterventions.length 
      : 0;

    const typeDistribution = interventions.reduce((acc, intervention) => {
      acc[intervention.type] = (acc[intervention.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Advanced analytics
    const overduePlanned = interventions.filter(i => 
      i.status === 'planned' && 
      i.scheduledDate && 
      new Date(i.scheduledDate) < new Date()
    ).length;

    const followUpRequired = interventions.filter(i => 
      i.followUpRequired && 
      i.followUpDate && 
      new Date(i.followUpDate) <= new Date()
    ).length;

    const successRate = completedInterventions.length > 0 
      ? (completedInterventions.filter(i => i.effectiveness >= 4).length / completedInterventions.length) * 100 
      : 0;

    const avgResponseTime = completedInterventions.length > 0
      ? completedInterventions.reduce((sum, i) => {
          const created = new Date(i.createdAt).getTime();
          const completed = new Date(i.completedDate!).getTime();
          return sum + (completed - created) / (1000 * 60 * 60 * 24); // days
        }, 0) / completedInterventions.length
      : 0;

    return {
      total,
      completed,
      inProgress,
      planned,
      avgEffectiveness,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      overduePlanned,
      followUpRequired,
      successRate,
      avgResponseTime,
      typeDistribution: Object.entries(typeDistribution).map(([type, count]) => ({
        type: type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        count,
        percentage: (count / total) * 100
      }))
    };
  };

  const getWorkflowSuggestions = () => {
    const stats = getInterventionStats();
    const suggestions = [];

    if (stats.overduePlanned > 0) {
      suggestions.push({
        type: 'urgent',
        message: `${stats.overduePlanned} planned interventions are overdue`,
        action: 'Review and reschedule overdue interventions'
      });
    }

    if (stats.followUpRequired > 0) {
      suggestions.push({
        type: 'warning',
        message: `${stats.followUpRequired} interventions require follow-up`,
        action: 'Schedule follow-up meetings'
      });
    }

    if (stats.avgEffectiveness < 3) {
      suggestions.push({
        type: 'info',
        message: 'Average intervention effectiveness is below target',
        action: 'Review intervention strategies and consider training'
      });
    }

    if (stats.successRate < 60) {
      suggestions.push({
        type: 'warning',
        message: 'Intervention success rate is below 60%',
        action: 'Analyze unsuccessful interventions and adjust approach'
      });
    }

    return suggestions;
  };

  const handleCreateIntervention = async () => {
    if (newIntervention.title && newIntervention.studentName) {
      // Get AI-powered intervention suggestions
      const aiSuggestions = await getInterventionSuggestions(newIntervention);
      
      onCreateIntervention({
        ...newIntervention,
        createdAt: new Date().toISOString(),
        createdBy: 'Current Teacher', // In real app, get from auth context
        notes: [],
        aiSuggestions: aiSuggestions,
        metrics: {
          performanceBefore: 0, // Would be populated from student data
          engagementBefore: 0,
          riskScoreBefore: 0
        }
      });
      setCreateDialog(false);
      setNewIntervention({
        type: 'one-on-one',
        priority: 'medium',
        status: 'planned',
        followUpRequired: false,
        tags: []
      });
    }
  };

  const getInterventionSuggestions = async (intervention: Partial<Intervention>) => {
    // Mock AI suggestions - in real app, this would call the AI service
    const suggestions = [
      'Schedule follow-up meeting within 1 week',
      'Provide additional learning resources',
      'Consider peer mentoring assignment',
      'Monitor progress closely for next 2 weeks'
    ];
    return suggestions;
  };

  const handleCompleteIntervention = (interventionId: string) => {
    if (outcome && effectiveness) {
      const intervention = interventions.find(i => i.id === interventionId);
      const effectivenessAnalysis = analyzeInterventionEffectiveness(intervention, effectiveness);
      
      onUpdateIntervention(interventionId, {
        status: 'completed',
        completedDate: new Date().toISOString(),
        outcome,
        effectiveness,
        effectivenessAnalysis,
        metrics: {
          ...intervention?.metrics,
          performanceAfter: intervention?.metrics.performanceBefore + (effectiveness - 3) * 5, // Mock calculation
          engagementAfter: intervention?.metrics.engagementBefore + (effectiveness - 3) * 3,
          riskScoreAfter: Math.max(0, (intervention?.metrics.riskScoreBefore || 0) - (effectiveness - 3) * 0.1)
        }
      });
      setOutcomeDialog(null);
      setOutcome('');
      setEffectiveness(3);
    }
  };

  const analyzeInterventionEffectiveness = (intervention: Intervention | undefined, effectivenessRating: number) => {
    if (!intervention) return {};
    
    const analysis = {
      rating: effectivenessRating,
      category: effectivenessRating >= 4 ? 'highly_effective' : effectivenessRating >= 3 ? 'effective' : 'needs_improvement',
      recommendations: [] as string[]
    };

    if (effectivenessRating >= 4) {
      analysis.recommendations.push('Consider replicating this approach for similar cases');
      analysis.recommendations.push('Document best practices for future reference');
    } else if (effectivenessRating <= 2) {
      analysis.recommendations.push('Review intervention strategy and consider alternative approaches');
      analysis.recommendations.push('Schedule additional follow-up sessions');
    }

    return analysis;
  };

  const filterInterventions = () => {
    switch (selectedTab) {
      case 0: return interventions; // All
      case 1: return interventions.filter(i => i.status === 'planned');
      case 2: return interventions.filter(i => i.status === 'in-progress');
      case 3: return interventions.filter(i => i.status === 'completed');
      default: return interventions;
    }
  };

  const stats = getInterventionStats();
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>
        Intervention Tracking System
      </Typography>

      {/* Workflow Suggestions */}
      {getWorkflowSuggestions().length > 0 && (
        <Box mb={3}>
          {getWorkflowSuggestions().map((suggestion, index) => (
            <MuiAlert 
              key={index}
              severity={suggestion.type as any}
              sx={{ mb: 1 }}
              action={
                <Button color="inherit" size="small">
                  {suggestion.action}
                </Button>
              }
            >
              {suggestion.message}
            </MuiAlert>
          ))}
        </Box>
      )}

      {/* Statistics Overview */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="primary">
                {stats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Interventions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="success.main">
                {stats.completed}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completed
              </Typography>
              <LinearProgress
                variant="determinate"
                value={stats.completionRate}
                color="success"
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="warning.main">
                {stats.inProgress}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                In Progress
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="info.main">
                {stats.avgEffectiveness.toFixed(1)}/5
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg Effectiveness
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="success.main">
                {stats.successRate.toFixed(0)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Success Rate
              </Typography>
              <Typography variant="caption" color="text.secondary">
                (Rating ≥ 4)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="warning.main">
                {stats.overduePlanned}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Overdue
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="primary.main">
                {stats.avgResponseTime.toFixed(1)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg Response Days
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Intervention Types
              </Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.typeDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ type, percentage }) => `${type}: ${percentage.toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {stats.typeDistribution.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Effectiveness Trends
              </Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={interventions.filter(i => i.status === 'completed').map(i => ({
                    date: new Date(i.completedDate!).toLocaleDateString(),
                    effectiveness: i.effectiveness,
                    performance: calculateEffectiveness(i)?.performance || 0
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="effectiveness" stroke="#8884d8" name="Effectiveness Rating" />
                    <Line type="monotone" dataKey="performance" stroke="#82ca9d" name="Performance Impact" />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Interventions List */}
      <Card>
        <Box display="flex" justifyContent="space-between" alignItems="center" p={2}>
          <Tabs value={selectedTab} onChange={(_e, v) => setSelectedTab(v)}>
            <Tab label={`All (${interventions.length})`} />
            <Tab label={`Planned (${stats.planned})`} />
            <Tab label={`In Progress (${stats.inProgress})`} />
            <Tab label={`Completed (${stats.completed})`} />
          </Tabs>
          
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialog(true)}
          >
            New Intervention
          </Button>
        </Box>

        <CardContent>
          <List>
            {filterInterventions().map((intervention, index) => (
              <React.Fragment key={intervention.id}>
                <ListItem
                  sx={{
                    bgcolor: intervention.priority === 'urgent' ? 'error.50' : 'transparent',
                    borderRadius: 1,
                    mb: 1
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: `${getStatusColor(intervention.status)}.main` }}>
                      {getTypeIcon(intervention.type)}
                    </Avatar>
                  </ListItemAvatar>
                  
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {intervention.title}
                        </Typography>
                        <Chip
                          size="small"
                          label={intervention.status}
                          color={getStatusColor(intervention.status) as any}
                        />
                        <Chip
                          size="small"
                          label={intervention.priority}
                          color={getPriorityColor(intervention.priority) as any}
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Student: {intervention.studentName} • {intervention.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Created: {new Date(intervention.createdAt).toLocaleDateString()}
                          {intervention.scheduledDate && ` • Scheduled: ${new Date(intervention.scheduledDate).toLocaleDateString()}`}
                        </Typography>
                        
                        {intervention.tags.length > 0 && (
                          <Box display="flex" gap={0.5} mt={0.5}>
                            {intervention.tags.map(tag => (
                              <Chip key={tag} size="small" label={tag} variant="outlined" />
                            ))}
                          </Box>
                        )}
                      </Box>
                    }
                  />
                  
                  <Box display="flex" alignItems="center" gap={1}>
                    {intervention.status === 'in-progress' && (
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        onClick={() => setOutcomeDialog(intervention.id)}
                      >
                        Complete
                      </Button>
                    )}
                    
                    <IconButton size="small" onClick={() => setEditDialog(intervention.id)}>
                      <Edit />
                    </IconButton>
                    
                    <IconButton size="small">
                      <Visibility />
                    </IconButton>
                  </Box>
                </ListItem>
                
                {index < filterInterventions().length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>

          {filterInterventions().length === 0 && (
            <Box textAlign="center" py={4}>
              <Assignment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No interventions in this category
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Create Intervention Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Intervention</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Student Name"
                value={newIntervention.studentName || ''}
                onChange={(e) => setNewIntervention(prev => ({ ...prev, studentName: e.target.value }))}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Intervention Type"
                value={newIntervention.type}
                onChange={(e) => setNewIntervention(prev => ({ ...prev, type: e.target.value as any }))}
              >
                <MenuItem value="one-on-one">One-on-One Meeting</MenuItem>
                <MenuItem value="additional-resources">Additional Resources</MenuItem>
                <MenuItem value="peer-mentoring">Peer Mentoring</MenuItem>
                <MenuItem value="study-group">Study Group</MenuItem>
                <MenuItem value="deadline-extension">Deadline Extension</MenuItem>
                <MenuItem value="custom">Custom</MenuItem>
              </TextField>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                value={newIntervention.title || ''}
                onChange={(e) => setNewIntervention(prev => ({ ...prev, title: e.target.value }))}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={newIntervention.description || ''}
                onChange={(e) => setNewIntervention(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Priority"
                value={newIntervention.priority}
                onChange={(e) => setNewIntervention(prev => ({ ...prev, priority: e.target.value as any }))}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
              </TextField>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                type="date"
                fullWidth
                label="Scheduled Date"
                value={newIntervention.scheduledDate?.split('T')[0] || ''}
                onChange={(e) => setNewIntervention(prev => ({ 
                  ...prev, 
                  scheduledDate: e.target.value ? new Date(e.target.value).toISOString() : '' 
                }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateIntervention} variant="contained">
            Create Intervention
          </Button>
        </DialogActions>
      </Dialog>

      {/* Complete Intervention Dialog */}
      <Dialog open={!!outcomeDialog} onClose={() => setOutcomeDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Complete Intervention</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Outcome Description"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="Describe the outcome and results of this intervention..."
              sx={{ mb: 2 }}
            />
            
            <TextField
              select
              fullWidth
              label="Effectiveness Rating"
              value={effectiveness}
              onChange={(e) => setEffectiveness(Number(e.target.value))}
            >
              <MenuItem value={1}>1 - Not Effective</MenuItem>
              <MenuItem value={2}>2 - Slightly Effective</MenuItem>
              <MenuItem value={3}>3 - Moderately Effective</MenuItem>
              <MenuItem value={4}>4 - Very Effective</MenuItem>
              <MenuItem value={5}>5 - Extremely Effective</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOutcomeDialog(null)}>Cancel</Button>
          <Button onClick={() => handleCompleteIntervention(outcomeDialog!)} variant="contained">
            Complete Intervention
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InterventionTracking;