/**
 * Student Drill-down Component - Detailed analytics for individual students
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Avatar,
  Chip,
  // LinearProgress,
  IconButton,
  // Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Alert,
  TextField,
  MenuItem
} from '@mui/material';
import { formatDate, sanitizeSubmissionData } from '../../utils/dateUtils';
import {
  // Person,
  // TrendingUp,
  // TrendingDown,
  Warning,
  CheckCircle,
  Assignment,
  // EmojiEvents,
  Visibility,
  Message,
  History,
  School
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

interface StudentData {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  level: number;
  totalPoints: number;
  rank: number;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastActive: string;
  performanceHistory: Array<{
    date: string;
    score: number;
    submissions: number;
    engagement: number;
  }>;
  skillsRadar: Array<{
    skill: string;
    score: number;
    maxScore: number;
  }>;
  recentSubmissions: Array<{
    id: string;
    title: string;
    score: number;
    submittedAt: string;
    feedback: string[];
  }>;
  interventions: Array<{
    id: string;
    type: string;
    description: string;
    createdAt: string;
    status: 'pending' | 'completed' | 'cancelled';
    outcome?: string;
  }>;
  recommendations: string[];
}

interface StudentDrillDownProps {
  students: StudentData[];
  selectedStudentId?: string;
  onStudentSelect: (studentId: string) => void;
  onCreateIntervention: (studentId: string, intervention: any) => void;
}

const StudentDrillDown: React.FC<StudentDrillDownProps> = ({
  students,
  selectedStudentId,
  onStudentSelect,
  onCreateIntervention
}) => {
  const [interventionDialog, setInterventionDialog] = useState(false);
  const [interventionType, setInterventionType] = useState('');
  const [interventionDescription, setInterventionDescription] = useState('');

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return <CheckCircle />;
      case 'medium': return <Warning />;
      case 'high': return <Warning />;
      case 'critical': return <Warning />;
      default: return <CheckCircle />;
    }
  };

  const handleCreateIntervention = () => {
    if (selectedStudent && interventionType && interventionDescription) {
      onCreateIntervention(selectedStudent.id, {
        type: interventionType,
        description: interventionDescription
      });
      setInterventionDialog(false);
      setInterventionType('');
      setInterventionDescription('');
    }
  };

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>
        Student Analytics
      </Typography>

      <Grid container spacing={3}>
        {/* Student List */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Students ({students.length})
              </Typography>
              <List sx={{ maxHeight: 600, overflow: 'auto' }}>
                {students.map((student, index) => (
                  <React.Fragment key={student.id}>
                    <ListItem
                      button
                      selected={student.id === selectedStudentId}
                      onClick={() => onStudentSelect(student.id)}
                      sx={{
                        borderRadius: 1,
                        mb: 0.5,
                        '&.Mui-selected': {
                          bgcolor: 'primary.50'
                        }
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar {...(student.avatar ? { src: student.avatar } : {})}>
                          {student.name.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle2">
                              {student.name}
                            </Typography>
                            <Chip
                              size="small"
                              label={student.riskLevel}
                              color={getRiskColor(student.riskLevel) as any}
                              icon={getRiskIcon(student.riskLevel)}
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" display="block">
                              Level {student.level} • Rank #{student.rank}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Last active: {formatDate(student.lastActive)}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < students.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Student Details */}
        <Grid item xs={12} md={8}>
          {selectedStudent ? (
            <Box>
              {/* Student Header */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar
                        {...(selectedStudent.avatar ? { src: selectedStudent.avatar } : {})}
                        sx={{ width: 64, height: 64 }}
                      >
                        {selectedStudent.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="h5">
                          {selectedStudent.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedStudent.email}
                        </Typography>
                        <Box display="flex" gap={1} mt={1}>
                          <Chip
                            size="small"
                            label={`Level ${selectedStudent.level}`}
                            color="primary"
                          />
                          <Chip
                            size="small"
                            label={`Rank #${selectedStudent.rank}`}
                            color="secondary"
                          />
                          <Chip
                            size="small"
                            label={`${selectedStudent.totalPoints} points`}
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                    </Box>
                    <Box textAlign="right">
                      <Button
                        variant="contained"
                        startIcon={<Message />}
                        onClick={() => setInterventionDialog(true)}
                        sx={{ mb: 1 }}
                      >
                        Create Intervention
                      </Button>
                      <Typography variant="h6" color={`${getRiskColor(selectedStudent.riskLevel)}.main`}>
                        Risk Score: {(selectedStudent.riskScore * 100).toFixed(0)}%
                      </Typography>
                      <Chip
                        label={selectedStudent.riskLevel.toUpperCase()}
                        color={getRiskColor(selectedStudent.riskLevel) as any}
                        icon={getRiskIcon(selectedStudent.riskLevel)}
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              {/* Risk Alert */}
              {selectedStudent.riskLevel !== 'low' && (
                <Alert 
                  severity={selectedStudent.riskLevel === 'critical' ? 'error' : 'warning'}
                  sx={{ mb: 3 }}
                >
                  <Typography variant="subtitle2">
                    Student requires attention - {selectedStudent.riskLevel} risk level
                  </Typography>
                  <Typography variant="body2">
                    Recommendations: {selectedStudent.recommendations.join(', ')}
                  </Typography>
                </Alert>
              )}

              <Grid container spacing={3}>
                {/* Performance Chart */}
                <Grid item xs={12} lg={8}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Performance History
                      </Typography>
                      <Box height={300}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={selectedStudent.performanceHistory}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="date" 
                              tickFormatter={(value) => new Date(value).toLocaleDateString()}
                            />
                            <YAxis />
                            <RechartsTooltip 
                              labelFormatter={(value) => new Date(value).toLocaleDateString()}
                            />
                            <Line
                              type="monotone"
                              dataKey="score"
                              stroke="#1976d2"
                              strokeWidth={2}
                              name="Performance Score"
                            />
                            <Line
                              type="monotone"
                              dataKey="engagement"
                              stroke="#2e7d32"
                              strokeWidth={2}
                              name="Engagement Score"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Skills Radar */}
                <Grid item xs={12} lg={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Skills Assessment
                      </Typography>
                      <Box height={300}>
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={selectedStudent.skillsRadar}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="skill" />
                            <PolarRadiusAxis
                              angle={90}
                              domain={[0, 100]}
                              tick={false}
                            />
                            <Radar
                              name="Skills"
                              dataKey="score"
                              stroke="#1976d2"
                              fill="#1976d2"
                              fillOpacity={0.3}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Recent Submissions */}
                <Grid item xs={12} lg={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Recent Submissions
                      </Typography>
                      <List>
                        {selectedStudent.recentSubmissions.map((rawSubmission) => {
                          const submission = sanitizeSubmissionData(rawSubmission);
                          return (
                          <ListItem key={submission.id} divider>
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: 'primary.main' }}>
                                <Assignment />
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={submission.title}
                              secondary={
                                <Box>
                                  <Typography variant="caption" display="block">
                                    Score: {submission.score}% • {formatDate(submission.submittedAt)}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {submission.feedback.length} feedback items
                                  </Typography>
                                </Box>
                              }
                            />
                            <IconButton size="small">
                              <Visibility />
                            </IconButton>
                          </ListItem>
                          );
                        })}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Interventions */}
                <Grid item xs={12} lg={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Interventions & Actions
                      </Typography>
                      <List>
                        {selectedStudent.interventions.map((intervention) => (
                          <ListItem key={intervention.id} divider>
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: 'secondary.main' }}>
                                <History />
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={intervention.type}
                              secondary={
                                <Box>
                                  <Typography variant="body2">
                                    {intervention.description}
                                  </Typography>
                                  <Typography variant="caption" display="block">
                                    {formatDate(intervention.createdAt)}
                                  </Typography>
                                  <Chip
                                    size="small"
                                    label={intervention.status}
                                    color={
                                      intervention.status === 'completed' ? 'success' :
                                      intervention.status === 'pending' ? 'warning' : 'default'
                                    }
                                  />
                                </Box>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          ) : (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 8 }}>
                <School sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  Select a student to view detailed analytics
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Create Intervention Dialog */}
      <Dialog
        open={interventionDialog}
        onClose={() => setInterventionDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Create Intervention for {selectedStudent?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              select
              fullWidth
              label="Intervention Type"
              value={interventionType}
              onChange={(e) => setInterventionType(e.target.value)}
              sx={{ mb: 2 }}
            >
              <MenuItem value="one-on-one">One-on-One Meeting</MenuItem>
              <MenuItem value="additional-resources">Additional Resources</MenuItem>
              <MenuItem value="peer-mentoring">Peer Mentoring</MenuItem>
              <MenuItem value="study-group">Study Group Assignment</MenuItem>
              <MenuItem value="deadline-extension">Deadline Extension</MenuItem>
              <MenuItem value="custom">Custom Intervention</MenuItem>
            </TextField>
            
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Description"
              value={interventionDescription}
              onChange={(e) => setInterventionDescription(e.target.value)}
              placeholder="Describe the intervention plan and expected outcomes..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInterventionDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateIntervention}
            variant="contained"
            disabled={!interventionType || !interventionDescription}
          >
            Create Intervention
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StudentDrillDown;