import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  Alert,
  Snackbar,
  LinearProgress,
  Tabs,
  Tab,
  Divider,
  Tooltip,
  Menu,
  MenuItem as MenuItemComponent,
  ListItemIcon
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Group as GroupIcon,
  Email as EmailIcon,
  Message as MessageIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Visibility as ViewIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { format, parseISO } from 'date-fns';
import {
  Campaign,
  CampaignStatus,
  Competition,
  CompetitionType
} from '../../types/competition';
import { competitionApi } from '../../services/competitionApi';

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
      id={`campaign-tabpanel-${index}`}
      aria-labelledby={`campaign-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

interface CampaignManagementProps {
  campaignId: string;
  onClose?: () => void;
}

interface Student {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: 'invited' | 'registered' | 'active' | 'completed' | 'withdrawn';
  invitedAt: string;
  registeredAt?: string;
  progress: number;
  score: number;
  lastActivity?: string;
}

interface InvitationData {
  studentIds: string[];
  message: string;
  sendEmail: boolean;
  sendReminder: boolean;
  reminderDate?: Date;
}

const CampaignManagement: React.FC<CampaignManagementProps> = ({
  campaignId,
  onClose
}) => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({ open: false, message: '', severity: 'info' });
  const [invitationData, setInvitationData] = useState<InvitationData>({
    studentIds: [],
    message: '',
    sendEmail: true,
    sendReminder: false
  });

  useEffect(() => {
    loadCampaignData();
  }, [campaignId]);

  const loadCampaignData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [campaignData, competitionsData] = await Promise.all([
        competitionApi.getCampaign(campaignId),
        competitionApi.getCompetitions({ limit: 100 })
      ]);

      setCampaign(campaignData);
      setCompetitions(competitionsData.items);

      // Load campaign students (mock data for now)
      const mockStudents: Student[] = [
        {
          id: '1',
          name: 'Alice Johnson',
          email: 'alice@example.com',
          status: 'active',
          invitedAt: '2023-10-01T10:00:00Z',
          registeredAt: '2023-10-02T14:30:00Z',
          progress: 75,
          score: 850,
          lastActivity: '2023-10-15T16:45:00Z'
        },
        {
          id: '2',
          name: 'Bob Smith',
          email: 'bob@example.com',
          status: 'registered',
          invitedAt: '2023-10-01T10:00:00Z',
          registeredAt: '2023-10-03T09:15:00Z',
          progress: 25,
          score: 200,
          lastActivity: '2023-10-10T11:20:00Z'
        },
        {
          id: '3',
          name: 'Carol Davis',
          email: 'carol@example.com',
          status: 'invited',
          invitedAt: '2023-10-01T10:00:00Z',
          progress: 0,
          score: 0
        },
        {
          id: '4',
          name: 'David Wilson',
          email: 'david@example.com',
          status: 'completed',
          invitedAt: '2023-10-01T10:00:00Z',
          registeredAt: '2023-10-02T16:00:00Z',
          progress: 100,
          score: 1200,
          lastActivity: '2023-10-14T18:30:00Z'
        }
      ];

      setStudents(mockStudents);

      // Mock available students for invitation
      const mockAvailableStudents: Student[] = [
        {
          id: '5',
          name: 'Eva Brown',
          email: 'eva@example.com',
          status: 'invited',
          invitedAt: new Date().toISOString(),
          progress: 0,
          score: 0
        },
        {
          id: '6',
          name: 'Frank Miller',
          email: 'frank@example.com',
          status: 'invited',
          invitedAt: new Date().toISOString(),
          progress: 0,
          score: 0
        }
      ];

      setAvailableStudents(mockAvailableStudents);

    } catch (err: any) {
      setError(err.message || 'Failed to load campaign data');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleInviteStudents = async () => {
    try {
      setLoading(true);
      
      // Mock API call to invite students
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Add invited students to the campaign
      const newStudents = availableStudents
        .filter(s => invitationData.studentIds.includes(s.id))
        .map(s => ({
          ...s,
          invitedAt: new Date().toISOString(),
          status: 'invited' as const
        }));

      setStudents(prev => [...prev, ...newStudents]);
      setAvailableStudents(prev => 
        prev.filter(s => !invitationData.studentIds.includes(s.id))
      );

      showNotification(
        `Successfully invited ${invitationData.studentIds.length} student${invitationData.studentIds.length > 1 ? 's' : ''}`,
        'success'
      );

      setInviteDialogOpen(false);
      setInvitationData({
        studentIds: [],
        message: '',
        sendEmail: true,
        sendReminder: false
      });

    } catch (err: any) {
      showNotification(err.message || 'Failed to invite students', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    try {
      // Mock API call to remove student
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const removedStudent = students.find(s => s.id === studentId);
      if (removedStudent) {
        setStudents(prev => prev.filter(s => s.id !== studentId));
        setAvailableStudents(prev => [...prev, { ...removedStudent, status: 'invited' }]);
        showNotification('Student removed from campaign', 'info');
      }
    } catch (err: any) {
      showNotification(err.message || 'Failed to remove student', 'error');
    }
  };

  const handleSendMessage = async () => {
    try {
      setLoading(true);
      
      // Mock API call to send message
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      showNotification(
        `Message sent to ${selectedStudents.length} student${selectedStudents.length > 1 ? 's' : ''}`,
        'success'
      );

      setMessageDialogOpen(false);
      setSelectedStudents([]);

    } catch (err: any) {
      showNotification(err.message || 'Failed to send message', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setNotification({ open: true, message, severity });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return theme.palette.success.main;
      case 'registered':
        return theme.palette.info.main;
      case 'completed':
        return theme.palette.primary.main;
      case 'invited':
        return theme.palette.warning.main;
      case 'withdrawn':
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

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || student.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading && !campaign) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <Typography>Loading campaign management...</Typography>
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
            <Button onClick={loadCampaignData} variant="outlined">
              Retry
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!campaign) {
    return null;
  }

  const campaignCompetitions = competitions.filter(c => 
    campaign.competitionIds.includes(c.id)
  );

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
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                📋 {campaign.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {campaign.description}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <Chip
                  label={campaign.status.toUpperCase()}
                  size="small"
                  sx={{
                    backgroundColor: getStatusColor(campaign.status),
                    color: 'white',
                    fontSize: '0.7rem'
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {format(parseISO(campaign.startDate), 'MMM dd')} - {format(parseISO(campaign.endDate), 'MMM dd, yyyy')}
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={() => setInviteDialogOpen(true)}
                size="small"
              >
                Invite Students
              </Button>
              <IconButton onClick={loadCampaignData}>
                <RefreshIcon />
              </IconButton>
              {onClose && (
                <IconButton onClick={onClose}>
                  <CancelIcon />
                </IconButton>
              )}
            </Box>
          </Box>

          {/* Campaign Overview */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'rgba(63, 81, 181, 0.1)' }}>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
                  {students.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total Students
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'rgba(76, 175, 80, 0.1)' }}>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: theme.palette.success.main }}>
                  {students.filter(s => s.status === 'active' || s.status === 'registered').length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Active
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'rgba(33, 150, 243, 0.1)' }}>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: theme.palette.info.main }}>
                  {students.filter(s => s.status === 'completed').length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Completed
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'rgba(255, 152, 0, 0.1)' }}>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: theme.palette.warning.main }}>
                  {campaignCompetitions.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Competitions
                </Typography>
              </Paper>
            </Grid>
          </Grid>

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
            <Tab icon={<GroupIcon />} label="Students" />
            <Tab icon={<MessageIcon />} label="Communications" />
            <Tab icon={<ScheduleIcon />} label="Schedule" />
          </Tabs>

          {/* Students Tab */}
          <TabPanel value={tabValue} index={0}>
            {/* Filters and Actions */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TextField
                  size="small"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
                
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    label="Status"
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="invited">Invited</MenuItem>
                    <MenuItem value="registered">Registered</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="withdrawn">Withdrawn</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {selectedStudents.length > 0 && (
                  <Button
                    variant="outlined"
                    startIcon={<MessageIcon />}
                    onClick={() => setMessageDialogOpen(true)}
                    size="small"
                  >
                    Message ({selectedStudents.length})
                  </Button>
                )}
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  size="small"
                >
                  Export
                </Button>
              </Box>
            </Box>

            {/* Students Table */}
            <TableContainer component={Paper} sx={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={selectedStudents.length > 0 && selectedStudents.length < filteredStudents.length}
                        checked={filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudents(filteredStudents.map(s => s.id));
                          } else {
                            setSelectedStudents([]);
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>Student</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Progress</TableCell>
                    <TableCell>Score</TableCell>
                    <TableCell>Last Activity</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id} hover>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedStudents.includes(student.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudents(prev => [...prev, student.id]);
                            } else {
                              setSelectedStudents(prev => prev.filter(id => id !== student.id));
                            }
                          }}
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ width: 32, height: 32, mr: 2 }}>
                            {student.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              {student.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {student.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Chip
                          label={student.status.toUpperCase()}
                          size="small"
                          sx={{
                            backgroundColor: getStatusColor(student.status),
                            color: 'white',
                            fontSize: '0.7rem'
                          }}
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={student.progress}
                            sx={{ 
                              width: 80, 
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: theme.palette.primary.main,
                                borderRadius: 3
                              }
                            }}
                          />
                          <Typography variant="caption">
                            {student.progress}%
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2">
                          {student.score.toLocaleString()}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {student.lastActivity 
                            ? format(parseISO(student.lastActivity), 'MMM dd, HH:mm')
                            : 'Never'
                          }
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            setActionMenuAnchor(e.currentTarget);
                            setSelectedStudent(student);
                          }}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Communications Tab */}
          <TabPanel value={tabValue} index={1}>
            <Paper sx={{ p: 3, backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
              <Typography variant="h6" gutterBottom>
                📧 Communication Center
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Send messages, announcements, and reminders to campaign participants
              </Typography>
              
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  startIcon={<EmailIcon />}
                  onClick={() => setMessageDialogOpen(true)}
                  sx={{ mr: 2 }}
                >
                  Send Message
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ScheduleIcon />}
                >
                  Schedule Reminder
                </Button>
              </Box>
            </Paper>
          </TabPanel>

          {/* Schedule Tab */}
          <TabPanel value={tabValue} index={2}>
            <Paper sx={{ p: 3, backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
              <Typography variant="h6" gutterBottom>
                📅 Campaign Schedule
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage campaign timeline, deadlines, and milestones
              </Typography>
              
              <Grid container spacing={3} sx={{ mt: 2 }}>
                {campaignCompetitions.map((competition) => (
                  <Grid item xs={12} md={6} key={competition.id}>
                    <Card sx={{ p: 2, backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, mr: 2 }}>
                          {getCompetitionTypeIcon(competition.type)}
                        </Avatar>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                          {competition.name}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {format(parseISO(competition.startDate), 'MMM dd')} - {format(parseISO(competition.endDate), 'MMM dd, yyyy')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {competition.participantCount} participants
                      </Typography>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </TabPanel>
        </CardContent>
      </Card>

      {/* Student Invitation Dialog */}
      <Dialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            👥 Invite Students to Campaign
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Select students to invite to this campaign
          </Typography>
          
          <List sx={{ mt: 2 }}>
            {availableStudents.map((student) => (
              <ListItem
                key={student.id}
                sx={{
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 1,
                  mb: 1,
                  backgroundColor: invitationData.studentIds.includes(student.id)
                    ? 'rgba(63, 81, 181, 0.1)'
                    : 'inherit'
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ width: 32, height: 32 }}>
                    {student.name.charAt(0)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={student.name}
                  secondary={student.email}
                />
                <ListItemSecondaryAction>
                  <Checkbox
                    checked={invitationData.studentIds.includes(student.id)}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      setInvitationData(prev => ({
                        ...prev,
                        studentIds: isChecked
                          ? [...prev.studentIds, student.id]
                          : prev.studentIds.filter(id => id !== student.id)
                      }));
                    }}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>

          <TextField
            fullWidth
            label="Invitation Message"
            multiline
            rows={3}
            value={invitationData.message}
            onChange={(e) => setInvitationData(prev => ({ ...prev, message: e.target.value }))}
            placeholder="Add a personal message to the invitation..."
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleInviteStudents}
            disabled={invitationData.studentIds.length === 0 || loading}
          >
            Invite {invitationData.studentIds.length} Student{invitationData.studentIds.length !== 1 ? 's' : ''}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Message Dialog */}
      <Dialog
        open={messageDialogOpen}
        onClose={() => setMessageDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            📧 Send Message
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Send a message to {selectedStudents.length} selected student{selectedStudents.length !== 1 ? 's' : ''}
          </Typography>
          
          <TextField
            fullWidth
            label="Subject"
            margin="normal"
            placeholder="Message subject..."
          />
          
          <TextField
            fullWidth
            label="Message"
            multiline
            rows={4}
            margin="normal"
            placeholder="Type your message here..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMessageDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSendMessage}
            disabled={loading}
          >
            Send Message
          </Button>
        </DialogActions>
      </Dialog>

      {/* Student Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={() => {
          setActionMenuAnchor(null);
          setSelectedStudent(null);
        }}
      >
        <MenuItemComponent onClick={() => console.log('View student')}>
          <ListItemIcon>
            <ViewIcon fontSize="small" />
          </ListItemIcon>
          View Details
        </MenuItemComponent>
        
        <MenuItemComponent onClick={() => console.log('Message student')}>
          <ListItemIcon>
            <MessageIcon fontSize="small" />
          </ListItemIcon>
          Send Message
        </MenuItemComponent>
        
        <Divider />
        
        <MenuItemComponent 
          onClick={() => {
            if (selectedStudent) {
              handleRemoveStudent(selectedStudent.id);
            }
            setActionMenuAnchor(null);
            setSelectedStudent(null);
          }}
          sx={{ color: theme.palette.error.main }}
        >
          <ListItemIcon>
            <PersonRemoveIcon fontSize="small" sx={{ color: theme.palette.error.main }} />
          </ListItemIcon>
          Remove from Campaign
        </MenuItemComponent>
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

export default CampaignManagement;