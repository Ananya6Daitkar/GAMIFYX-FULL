/**
 * Alert Management Component - Manage and track alerts with actions
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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Tooltip,
  Badge,
  Tabs,
  Tab,
  Alert as MuiAlert,
  Collapse,
  Divider
} from '@mui/material';
import {
  Warning,
  Error,
  Info,
  CheckCircle,
  ExpandMore,
  ExpandLess,
  // Visibility,
  // Done,
  Snooze,
  // Delete,
  Person,
  TrendingDown,
  School,
  Assignment
} from '@mui/icons-material';

interface AlertData {
  id: string;
  type: 'performance' | 'engagement' | 'submission' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  studentId?: string;
  studentName?: string;
  createdAt: string;
  status: 'active' | 'acknowledged' | 'resolved' | 'snoozed';
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  actions: Array<{
    id: string;
    type: string;
    description: string;
    createdAt: string;
    createdBy: string;
  }>;
  metadata?: {
    riskScore?: number;
    performanceChange?: number;
    submissionCount?: number;
    lastActivity?: string;
  };
}

interface AlertManagementProps {
  alerts: AlertData[];
  onAcknowledgeAlert: (alertId: string, note?: string) => void;
  onResolveAlert: (alertId: string, resolution: string) => void;
  onSnoozeAlert: (alertId: string, duration: number) => void;
  onDeleteAlert: (alertId: string) => void;
  onCreateAction: (alertId: string, action: any) => void;
}

const AlertManagement: React.FC<AlertManagementProps> = ({
  alerts,
  onAcknowledgeAlert,
  onResolveAlert,
  onSnoozeAlert,
  // onDeleteAlert,
  onCreateAction
}) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [actionDialog, setActionDialog] = useState<string | null>(null);
  const [actionType, setActionType] = useState('');
  const [actionDescription, setActionDescription] = useState('');
  const [resolveDialog, setResolveDialog] = useState<string | null>(null);
  const [resolution, setResolution] = useState('');

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <Error color="error" />;
      case 'high': return <Warning color="error" />;
      case 'medium': return <Warning color="warning" />;
      case 'low': return <Info color="info" />;
      default: return <Info />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'performance': return <TrendingDown />;
      case 'engagement': return <Person />;
      case 'submission': return <Assignment />;
      case 'system': return <School />;
      default: return <Info />;
    }
  };

  const filterAlerts = (status: string) => {
    switch (status) {
      case 'active':
        return alerts.filter(alert => alert.status === 'active');
      case 'acknowledged':
        return alerts.filter(alert => alert.status === 'acknowledged');
      case 'resolved':
        return alerts.filter(alert => alert.status === 'resolved');
      case 'snoozed':
        return alerts.filter(alert => alert.status === 'snoozed');
      default:
        return alerts;
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleExpandAlert = (alertId: string) => {
    setExpandedAlert(expandedAlert === alertId ? null : alertId);
  };

  const handleCreateAction = (alertId: string) => {
    if (actionType && actionDescription) {
      onCreateAction(alertId, {
        type: actionType,
        description: actionDescription
      });
      setActionDialog(null);
      setActionType('');
      setActionDescription('');
    }
  };

  const handleResolveAlert = (alertId: string) => {
    if (resolution) {
      onResolveAlert(alertId, resolution);
      setResolveDialog(null);
      setResolution('');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getFilteredAlerts = () => {
    const tabNames = ['all', 'active', 'acknowledged', 'resolved', 'snoozed'];
    return filterAlerts(tabNames[selectedTab] || 'all');
  };

  const activeAlertsCount = alerts.filter(a => a.status === 'active').length;
  const acknowledgedAlertsCount = alerts.filter(a => a.status === 'acknowledged').length;

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>
        Alert Management
      </Typography>

      {/* Alert Summary */}
      <Box mb={3}>
        <MuiAlert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            {activeAlertsCount} active alerts requiring attention • {acknowledgedAlertsCount} acknowledged alerts in progress
          </Typography>
        </MuiAlert>
      </Box>

      {/* Alert Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={selectedTab} onChange={handleTabChange}>
            <Tab 
              label={
                <Badge badgeContent={alerts.length} color="primary">
                  All Alerts
                </Badge>
              } 
            />
            <Tab 
              label={
                <Badge badgeContent={activeAlertsCount} color="error">
                  Active
                </Badge>
              } 
            />
            <Tab 
              label={
                <Badge badgeContent={acknowledgedAlertsCount} color="warning">
                  Acknowledged
                </Badge>
              } 
            />
            <Tab label="Resolved" />
            <Tab label="Snoozed" />
          </Tabs>
        </Box>

        <CardContent>
          <List>
            {getFilteredAlerts().map((alert, index) => (
              <React.Fragment key={alert.id}>
                <ListItem
                  sx={{
                    bgcolor: alert.status === 'active' ? 'error.50' : 
                             alert.status === 'acknowledged' ? 'warning.50' : 'transparent',
                    borderRadius: 1,
                    mb: 1
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: `${getSeverityColor(alert.severity)}.main` }}>
                      {getSeverityIcon(alert.severity)}
                    </Avatar>
                  </ListItemAvatar>
                  
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {alert.title}
                        </Typography>
                        <Chip
                          size="small"
                          label={alert.severity}
                          color={getSeverityColor(alert.severity) as any}
                        />
                        <Chip
                          size="small"
                          label={alert.type}
                          variant="outlined"
                          icon={getTypeIcon(alert.type)}
                        />
                        {alert.studentName && (
                          <Chip
                            size="small"
                            label={alert.studentName}
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {alert.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Created: {formatDate(alert.createdAt)}
                          {alert.acknowledgedAt && ` • Acknowledged: ${formatDate(alert.acknowledgedAt)}`}
                        </Typography>
                        
                        {/* Metadata */}
                        {alert.metadata && (
                          <Box display="flex" gap={1} mt={0.5}>
                            {alert.metadata.riskScore && (
                              <Chip
                                size="small"
                                label={`Risk: ${(alert.metadata.riskScore * 100).toFixed(0)}%`}
                                color="error"
                                variant="outlined"
                              />
                            )}
                            {alert.metadata.performanceChange && (
                              <Chip
                                size="small"
                                label={`Change: ${alert.metadata.performanceChange > 0 ? '+' : ''}${alert.metadata.performanceChange}%`}
                                color={alert.metadata.performanceChange > 0 ? 'success' : 'error'}
                                variant="outlined"
                              />
                            )}
                          </Box>
                        )}
                      </Box>
                    }
                  />
                  
                  <Box display="flex" alignItems="center" gap={1}>
                    {/* Action Buttons */}
                    {alert.status === 'active' && (
                      <>
                        <Tooltip title="Acknowledge">
                          <IconButton
                            size="small"
                            onClick={() => onAcknowledgeAlert(alert.id)}
                          >
                            <CheckCircle />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Snooze">
                          <IconButton
                            size="small"
                            onClick={() => onSnoozeAlert(alert.id, 3600000)} // 1 hour
                          >
                            <Snooze />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                    
                    {alert.status === 'acknowledged' && (
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        onClick={() => setResolveDialog(alert.id)}
                      >
                        Resolve
                      </Button>
                    )}
                    
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setActionDialog(alert.id)}
                    >
                      Add Action
                    </Button>
                    
                    <IconButton
                      size="small"
                      onClick={() => handleExpandAlert(alert.id)}
                    >
                      {expandedAlert === alert.id ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  </Box>
                </ListItem>

                {/* Expanded Alert Details */}
                <Collapse in={expandedAlert === alert.id}>
                  <Box sx={{ ml: 8, mr: 2, mb: 2 }}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom>
                          Actions Taken ({alert.actions.length})
                        </Typography>
                        {alert.actions.length > 0 ? (
                          <List dense>
                            {alert.actions.map((action) => (
                              <ListItem key={action.id}>
                                <ListItemText
                                  primary={action.type}
                                  secondary={
                                    <Box>
                                      <Typography variant="body2">
                                        {action.description}
                                      </Typography>
                                      <Typography variant="caption">
                                        {formatDate(action.createdAt)} by {action.createdBy}
                                      </Typography>
                                    </Box>
                                  }
                                />
                              </ListItem>
                            ))}
                          </List>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No actions taken yet
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Box>
                </Collapse>

                {index < getFilteredAlerts().length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>

          {getFilteredAlerts().length === 0 && (
            <Box textAlign="center" py={4}>
              <CheckCircle sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No alerts in this category
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Add Action Dialog */}
      <Dialog
        open={!!actionDialog}
        onClose={() => setActionDialog(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Action to Alert</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              select
              fullWidth
              label="Action Type"
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              sx={{ mb: 2 }}
            >
              <MenuItem value="contacted-student">Contacted Student</MenuItem>
              <MenuItem value="scheduled-meeting">Scheduled Meeting</MenuItem>
              <MenuItem value="sent-resources">Sent Resources</MenuItem>
              <MenuItem value="escalated">Escalated to Supervisor</MenuItem>
              <MenuItem value="monitoring">Monitoring Progress</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </TextField>
            
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Action Description"
              value={actionDescription}
              onChange={(e) => setActionDescription(e.target.value)}
              placeholder="Describe the action taken..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog(null)}>Cancel</Button>
          <Button
            onClick={() => handleCreateAction(actionDialog!)}
            variant="contained"
            disabled={!actionType || !actionDescription}
          >
            Add Action
          </Button>
        </DialogActions>
      </Dialog>

      {/* Resolve Alert Dialog */}
      <Dialog
        open={!!resolveDialog}
        onClose={() => setResolveDialog(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Resolve Alert</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Resolution Details"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Describe how this alert was resolved and any outcomes..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResolveDialog(null)}>Cancel</Button>
          <Button
            onClick={() => handleResolveAlert(resolveDialog!)}
            variant="contained"
            color="success"
            disabled={!resolution}
          >
            Resolve Alert
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AlertManagement;