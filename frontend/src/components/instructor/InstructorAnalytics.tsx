import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  LinearProgress,
  Alert,
  Snackbar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Analytics as AnalyticsIcon,
  Campaign as CampaignIcon,
  Group as GroupIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Pause as PauseIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  EmojiEvents as TrophyIcon,
  School as SchoolIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { format, parseISO, differenceInDays } from 'date-fns';
import {
  Campaign,
  CampaignStatus,
  Competition,
  CompetitionType,
  Participation
} from '../../types/competition';
import { competitionApi } from '../../services/competitionApi';
import CampaignCreationWizard from './CampaignCreationWizard';

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
      id={`instructor-tabpanel-${index}`}
      aria-labelledby={`instructor-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

interface InstructorAnalyticsProps {
  instructorId: string;
  classId?: string;
  courseId?: string;
}

interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalStudents: number;
  averageParticipationRate: number;
  averageCompletionRate: number;
  totalPointsAwarded: number;
}

const InstructorAnalytics: React.FC<InstructorAnalyticsProps> = ({
  instructorId,
  classId,
  courseId
}) => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    loadInstructorData();
  }, [instructorId, classId, courseId]);

  const loadInstructorData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [campaignsData, competitionsData] = await Promise.all([
        competitionApi.getCampaigns(),
        competitionApi.getCompetitions({ limit: 100 })
      ]);

      // Filter campaigns by instructor
      const instructorCampaigns = campaignsData.filter(c => c.instructorId === instructorId);
      setCampaigns(instructorCampaigns);
      setCompetitions(competitionsData.items);

      // Calculate statistics
      const stats = calculateCampaignStats(instructorCampaigns);
      setStats(stats);

    } catch (err: any) {
      setError(err.message || 'Failed to load instructor data');
    } finally {
      setLoading(false);
    }
  };

  const calculateCampaignStats = (campaigns: Campaign[]): CampaignStats => {
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(c => c.status === CampaignStatus.ACTIVE).length;
    
    const totalStudents = campaigns.reduce((sum, c) => sum + c.invitedStudents.length, 0);
    const averageParticipationRate = totalCampaigns > 0 
      ? campaigns.reduce((sum, c) => sum + c.participationRate, 0) / totalCampaigns 
      : 0;
    const averageCompletionRate = totalCampaigns > 0 
      ? campaigns.reduce((sum, c) => sum + c.completionRate, 0) / totalCampaigns 
      : 0;
    const totalPointsAwarded = campaigns.reduce((sum, c) => sum + (c.averageScore * c.participatingStudents.length), 0);

    return {
      totalCampaigns,
      activeCampaigns,
      totalStudents,
      averageParticipationRate,
      averageCompletionRate,
      totalPointsAwarded
    };
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCreateCampaign = () => {
    setWizardOpen(true);
  };

  const handleCampaignCreated = (campaign: Campaign) => {
    setCampaigns(prev => [campaign, ...prev]);
    setWizardOpen(false);
    showNotification('Campaign created successfully!', 'success');
    loadInstructorData(); // Refresh data
  };

  const handleActionMenuOpen = (event: React.MouseEvent<HTMLElement>, campaign: Campaign) => {
    setActionMenuAnchor(event.currentTarget);
    setSelectedCampaign(campaign);
  };

  const handleActionMenuClose = () => {
    setActionMenuAnchor(null);
    setSelectedCampaign(null);
  };

  const handleCampaignAction = async (action: string) => {
    if (!selectedCampaign) return;

    try {
      switch (action) {
        case 'pause':
          await competitionApi.updateCampaign(selectedCampaign.id, { status: CampaignStatus.PAUSED });
          showNotification('Campaign paused', 'info');
          break;
        case 'resume':
          await competitionApi.updateCampaign(selectedCampaign.id, { status: CampaignStatus.ACTIVE });
          showNotification('Campaign resumed', 'success');
          break;
        case 'complete':
          await competitionApi.updateCampaign(selectedCampaign.id, { status: CampaignStatus.COMPLETED });
          showNotification('Campaign completed', 'success');
          break;
        case 'delete':
          await competitionApi.deleteCampaign(selectedCampaign.id);
          showNotification('Campaign deleted', 'info');
          break;
      }
      loadInstructorData();
    } catch (err: any) {
      showNotification(err.message || 'Action failed', 'error');
    }
    
    handleActionMenuClose();
  };

  const showNotification = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setNotification({ open: true, message, severity });
  };

  const getStatusColor = (status: CampaignStatus) => {
    switch (status) {
      case CampaignStatus.ACTIVE:
        return theme.palette.success.main;
      case CampaignStatus.PAUSED:
        return theme.palette.warning.main;
      case CampaignStatus.COMPLETED:
        return theme.palette.info.main;
      case CampaignStatus.CANCELLED:
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getCompetitionTypeIcon = (type: CompetitionType) => {
    switch (type) {
      case CompetitionType.HACKTOBERFEST:
        return '🎃';
      case CompetitionType.GITHUB_GAME_OFF:
        return '🎮';
      case CompetitionType.GITLAB_HACKATHON:
        return '🦊';
      case CompetitionType.OPEN_SOURCE_CHALLENGE:
        return '🌟';
      default:
        return '🏆';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <AnalyticsIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Instructor Analytics
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <Typography>Loading instructor dashboard...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Box sx={{ textAlign: 'center' }}>
            <Button onClick={loadInstructorData} variant="outlined">
              Retry
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card sx={{ 
        background: 'linear-gradient(135deg, rgba(63, 81, 181, 0.05) 0%, rgba(156, 39, 176, 0.05) 100%)',
        border: '1px solid rgba(63, 81, 181, 0.2)',
        backdropFilter: 'blur(10px)'
      }}>
        <CardContent>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <AnalyticsIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                📊 Instructor Analytics Dashboard
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateCampaign}
                sx={{ 
                  background: 'linear-gradient(45deg, #3f51b5, #9c27b0)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #303f9f, #7b1fa2)'
                  }
                }}
              >
                Create Campaign
              </Button>
              <IconButton onClick={loadInstructorData}>
                <RefreshIcon />
              </IconButton>
            </Box>
          </Box>

          {/* Statistics Overview */}
          {stats && (
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={2}>
                <Paper sx={{ 
                  p: 2, 
                  textAlign: 'center',
                  backgroundColor: 'rgba(63, 81, 181, 0.1)',
                  border: '1px solid rgba(63, 81, 181, 0.3)'
                }}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
                    {stats.totalCampaigns}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Campaigns
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} sm={6} md={2}>
                <Paper sx={{ 
                  p: 2, 
                  textAlign: 'center',
                  backgroundColor: 'rgba(76, 175, 80, 0.1)',
                  border: '1px solid rgba(76, 175, 80, 0.3)'
                }}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: theme.palette.success.main }}>
                    {stats.activeCampaigns}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Active
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} sm={6} md={2}>
                <Paper sx={{ 
                  p: 2, 
                  textAlign: 'center',
                  backgroundColor: 'rgba(156, 39, 176, 0.1)',
                  border: '1px solid rgba(156, 39, 176, 0.3)'
                }}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: theme.palette.secondary.main }}>
                    {stats.totalStudents}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Students Invited
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} sm={6} md={2}>
                <Paper sx={{ 
                  p: 2, 
                  textAlign: 'center',
                  backgroundColor: 'rgba(255, 152, 0, 0.1)',
                  border: '1px solid rgba(255, 152, 0, 0.3)'
                }}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: theme.palette.warning.main }}>
                    {Math.round(stats.averageParticipationRate)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Participation Rate
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} sm={6} md={2}>
                <Paper sx={{ 
                  p: 2, 
                  textAlign: 'center',
                  backgroundColor: 'rgba(33, 150, 243, 0.1)',
                  border: '1px solid rgba(33, 150, 243, 0.3)'
                }}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: theme.palette.info.main }}>
                    {Math.round(stats.averageCompletionRate)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Completion Rate
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} sm={6} md={2}>
                <Paper sx={{ 
                  p: 2, 
                  textAlign: 'center',
                  backgroundColor: 'rgba(244, 67, 54, 0.1)',
                  border: '1px solid rgba(244, 67, 54, 0.3)'
                }}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: theme.palette.error.main }}>
                    {Math.round(stats.totalPointsAwarded).toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Points Awarded
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* Tabs */}
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mb: 2 }}
          >
            <Tab icon={<CampaignIcon />} label="Campaigns" />
            <Tab icon={<AssessmentIcon />} label="Analytics" />
            <Tab icon={<GroupIcon />} label="Students" />
          </Tabs>

          {/* Campaign Management Tab */}
          <TabPanel value={tabValue} index={0}>
            {campaigns.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No campaigns created yet
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Create your first campaign to start managing student competitions
                </Typography>
                <Button 
                  variant="contained" 
                  startIcon={<AddIcon />}
                  onClick={handleCreateCampaign}
                  sx={{ mt: 2 }}
                >
                  Create First Campaign
                </Button>
              </Box>
            ) : (
              <TableContainer component={Paper} sx={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Campaign</TableCell>
                      <TableCell>Competitions</TableCell>
                      <TableCell>Students</TableCell>
                      <TableCell>Participation</TableCell>
                      <TableCell>Completion</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {campaigns.map((campaign) => {
                      const daysRemaining = differenceInDays(parseISO(campaign.endDate), new Date());
                      const campaignCompetitions = competitions.filter(c => 
                        campaign.competitionIds.includes(c.id)
                      );
                      
                      return (
                        <TableRow key={campaign.id} hover>
                          <TableCell>
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                {campaign.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {campaign.description}
                              </Typography>
                            </Box>
                          </TableCell>
                          
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {campaignCompetitions.slice(0, 3).map((comp) => (
                                <Tooltip key={comp.id} title={comp.name}>
                                  <Avatar sx={{ width: 24, height: 24, fontSize: '0.8rem' }}>
                                    {getCompetitionTypeIcon(comp.type)}
                                  </Avatar>
                                </Tooltip>
                              ))}
                              {campaign.competitionIds.length > 3 && (
                                <Typography variant="caption" color="text.secondary">
                                  +{campaign.competitionIds.length - 3}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          
                          <TableCell>
                            <Box>
                              <Typography variant="body2">
                                {campaign.participatingStudents.length}/{campaign.invitedStudents.length}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                participating
                              </Typography>
                            </Box>
                          </TableCell>
                          
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={campaign.participationRate}
                                sx={{ 
                                  width: 60, 
                                  height: 6,
                                  borderRadius: 3,
                                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                  '& .MuiLinearProgress-bar': {
                                    backgroundColor: theme.palette.success.main,
                                    borderRadius: 3
                                  }
                                }}
                              />
                              <Typography variant="caption">
                                {Math.round(campaign.participationRate)}%
                              </Typography>
                            </Box>
                          </TableCell>
                          
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={campaign.completionRate}
                                sx={{ 
                                  width: 60, 
                                  height: 6,
                                  borderRadius: 3,
                                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                  '& .MuiLinearProgress-bar': {
                                    backgroundColor: theme.palette.info.main,
                                    borderRadius: 3
                                  }
                                }}
                              />
                              <Typography variant="caption">
                                {Math.round(campaign.completionRate)}%
                              </Typography>
                            </Box>
                          </TableCell>
                          
                          <TableCell>
                            <Chip
                              label={campaign.status.toUpperCase()}
                              size="small"
                              sx={{
                                backgroundColor: getStatusColor(campaign.status),
                                color: 'white',
                                fontSize: '0.7rem'
                              }}
                            />
                          </TableCell>
                          
                          <TableCell>
                            <Typography variant="body2">
                              {daysRemaining > 0 ? `${daysRemaining} days left` : 'Ended'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {format(parseISO(campaign.startDate), 'MMM dd')} - {format(parseISO(campaign.endDate), 'MMM dd')}
                            </Typography>
                          </TableCell>
                          
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={(e) => handleActionMenuOpen(e, campaign)}
                            >
                              <MoreVertIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* Analytics Tab */}
          <TabPanel value={tabValue} index={1}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                  <Typography variant="h6" gutterBottom>
                    📈 Campaign Performance Trends
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Performance analytics and trends will be displayed here
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                  <Typography variant="h6" gutterBottom>
                    🎯 Student Engagement Metrics
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Student engagement and participation metrics will be displayed here
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Students Tab */}
          <TabPanel value={tabValue} index={2}>
            <Paper sx={{ p: 3, backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
              <Typography variant="h6" gutterBottom>
                👥 Student Management
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Student management and invitation system will be displayed here
              </Typography>
            </Paper>
          </TabPanel>
        </CardContent>
      </Card>

      {/* Campaign Creation Wizard */}
      <CampaignCreationWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCampaignCreated={handleCampaignCreated}
        instructorId={instructorId}
        classId={classId}
        courseId={courseId}
        availableCompetitions={competitions}
      />

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionMenuClose}
      >
        <MenuItem onClick={() => handleCampaignAction('view')}>
          <ListItemIcon>
            <ViewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => handleCampaignAction('edit')}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Campaign</ListItemText>
        </MenuItem>
        
        <Divider />
        
        {selectedCampaign?.status === CampaignStatus.ACTIVE && (
          <MenuItem onClick={() => handleCampaignAction('pause')}>
            <ListItemIcon>
              <PauseIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Pause Campaign</ListItemText>
          </MenuItem>
        )}
        
        {selectedCampaign?.status === CampaignStatus.PAUSED && (
          <MenuItem onClick={() => handleCampaignAction('resume')}>
            <ListItemIcon>
              <PlayArrowIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Resume Campaign</ListItemText>
          </MenuItem>
        )}
        
        <MenuItem onClick={() => handleCampaignAction('complete')}>
          <ListItemIcon>
            <StopIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Complete Campaign</ListItemText>
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={() => handleCampaignAction('download')}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export Data</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => handleCampaignAction('share')}>
          <ListItemIcon>
            <ShareIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Share Campaign</ListItemText>
        </MenuItem>
        
        <Divider />
        
        <MenuItem 
          onClick={() => handleCampaignAction('delete')}
          sx={{ color: theme.palette.error.main }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" sx={{ color: theme.palette.error.main }} />
          </ListItemIcon>
          <ListItemText>Delete Campaign</ListItemText>
        </MenuItem>
      </Menu>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setNotification(prev => ({ ...prev, open: false }))} 
          severity={notification.severity}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default InstructorAnalytics;