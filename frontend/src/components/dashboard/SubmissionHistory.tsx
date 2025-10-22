/**
 * Submission History Component - Shows recent submissions with feedback
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  IconButton,
  Collapse,
  // LinearProgress,
  // Tooltip,
  Button,
  Divider
} from '@mui/material';
import {
  Assignment,
  CheckCircle,
  Error,
  Warning,
  Info,
  ExpandMore,
  ExpandLess,
  Visibility,
  Code,
  Security,
  Speed,
  BugReport
} from '@mui/icons-material';
import { Submission } from '../../types';

interface SubmissionHistoryProps {
  submissions: Submission[];
  onViewDetails: (submissionId: string) => void;
}

const SubmissionHistory: React.FC<SubmissionHistoryProps> = ({
  submissions,
  onViewDetails
}) => {
  const [expandedSubmission, setExpandedSubmission] = useState<string | null>(null);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle color="success" />;
      case 'failed':
        return <Error color="error" />;
      case 'pending':
        return <Warning color="warning" />;
      default:
        return <Assignment />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'warning';
    return 'error';
  };

  const getFeedbackIcon = (type: string) => {
    switch (type) {
      case 'security':
        return <Security fontSize="small" />;
      case 'performance':
        return <Speed fontSize="small" />;
      case 'code_quality':
        return <Code fontSize="small" />;
      case 'best_practices':
        return <Info fontSize="small" />;
      case 'style':
        return <BugReport fontSize="small" />;
      default:
        return <Info fontSize="small" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const handleToggleExpand = (submissionId: string) => {
    setExpandedSubmission(
      expandedSubmission === submissionId ? null : submissionId
    );
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Recent Submissions ({submissions.length})
        </Typography>

        {submissions.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography variant="body2" color="text.secondary">
              No submissions yet. Start coding to see your submission history here!
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {submissions.map((submission, index) => (
              <Box key={submission.id}>
                <ListItem
                  sx={{
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    mb: 1,
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: `${getStatusColor(submission.status)}.main` }}>
                      {getStatusIcon(submission.status)}
                    </Avatar>
                  </ListItemAvatar>
                  
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {submission.title}
                        </Typography>
                        <Chip
                          size="small"
                          label={submission.status}
                          color={getStatusColor(submission.status) as any}
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          {submission.description}
                        </Typography>
                        
                        <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                          <Chip
                            size="small"
                            label={`Overall: ${submission.overallScore}%`}
                            color={getScoreColor(submission.overallScore) as any}
                          />
                          <Chip
                            size="small"
                            label={`Quality: ${submission.codeQualityScore}%`}
                            variant="outlined"
                          />
                          <Chip
                            size="small"
                            label={`Security: ${submission.securityScore}%`}
                            variant="outlined"
                          />
                          <Chip
                            size="small"
                            label={`Coverage: ${submission.testCoverage}%`}
                            variant="outlined"
                          />
                          <Chip
                            size="small"
                            label={formatDuration(submission.completionTime)}
                            variant="outlined"
                          />
                        </Box>
                        
                        <Typography variant="caption" color="text.secondary">
                          Submitted {new Date(submission.submittedAt).toLocaleDateString()} at{' '}
                          {new Date(submission.submittedAt).toLocaleTimeString()}
                        </Typography>
                      </Box>
                    }
                  />
                  
                  <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                    <Button
                      size="small"
                      startIcon={<Visibility />}
                      onClick={() => onViewDetails(submission.id)}
                    >
                      Details
                    </Button>
                    
                    {submission.feedback.length > 0 && (
                      <IconButton
                        size="small"
                        onClick={() => handleToggleExpand(submission.id)}
                      >
                        {expandedSubmission === submission.id ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    )}
                  </Box>
                </ListItem>

                {/* Feedback Section */}
                {submission.feedback.length > 0 && (
                  <Collapse in={expandedSubmission === submission.id}>
                    <Box sx={{ ml: 2, mr: 2, mb: 2 }}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle2" gutterBottom>
                            Feedback ({submission.feedback.length} items)
                          </Typography>
                          
                          <List dense>
                            {submission.feedback.slice(0, 5).map((feedback, feedbackIndex) => (
                              <ListItem key={feedbackIndex} disableGutters>
                                <ListItemAvatar>
                                  <Avatar
                                    sx={{
                                      width: 24,
                                      height: 24,
                                      bgcolor: `${getSeverityColor(feedback.severity)}.main`
                                    }}
                                  >
                                    {getFeedbackIcon(feedback.type)}
                                  </Avatar>
                                </ListItemAvatar>
                                
                                <ListItemText
                                  primary={
                                    <Box display="flex" alignItems="center" gap={1}>
                                      <Typography variant="body2">
                                        {feedback.message}
                                      </Typography>
                                      <Chip
                                        size="small"
                                        label={feedback.severity}
                                        color={getSeverityColor(feedback.severity) as any}
                                        sx={{ height: 16, fontSize: '0.6rem' }}
                                      />
                                    </Box>
                                  }
                                  secondary={
                                    <Box>
                                      {feedback.lineNumber && (
                                        <Typography variant="caption" color="text.secondary">
                                          Line {feedback.lineNumber}
                                        </Typography>
                                      )}
                                      {feedback.suggestion && (
                                        <Typography variant="caption" display="block" color="info.main">
                                          💡 {feedback.suggestion}
                                        </Typography>
                                      )}
                                    </Box>
                                  }
                                />
                              </ListItem>
                            ))}
                          </List>
                          
                          {submission.feedback.length > 5 && (
                            <Typography variant="caption" color="text.secondary">
                              ... and {submission.feedback.length - 5} more feedback items
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Box>
                  </Collapse>
                )}

                {index < submissions.length - 1 && <Divider />}
              </Box>
            ))}
          </List>
        )}

        {/* Summary Stats */}
        {submissions.length > 0 && (
          <Box mt={3} pt={2} borderTop={1} borderColor="divider">
            <Typography variant="subtitle2" gutterBottom>
              Submission Summary
            </Typography>
            
            <Box display="flex" gap={2} flexWrap="wrap">
              <Typography variant="caption" color="text.secondary">
                Average Score: {Math.round(submissions.reduce((sum, s) => sum + s.overallScore, 0) / submissions.length)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Completed: {submissions.filter(s => s.status === 'completed').length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total Feedback: {submissions.reduce((sum, s) => sum + s.feedback.length, 0)} items
              </Typography>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default SubmissionHistory;