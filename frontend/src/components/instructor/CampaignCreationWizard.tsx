import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Box,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Autocomplete,
  Alert,
  LinearProgress,
  Divider
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Search as SearchIcon,
  Group as GroupIcon,
  EmojiEvents as TrophyIcon,
  Schedule as ScheduleIcon,
  Settings as SettingsIcon,
  Preview as PreviewIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useTheme } from '@mui/material/styles';
import { addDays, format } from 'date-fns';
import {
  Campaign,
  CampaignStatus,
  Competition,
  CompetitionType
} from '../../types/competition';
import { competitionApi } from '../../services/competitionApi';

interface CampaignCreationWizardProps {
  open: boolean;
  onClose: () => void;
  onCampaignCreated: (campaign: Campaign) => void;
  instructorId: string;
  classId?: string;
  courseId?: string;
  availableCompetitions: Competition[];
}

interface CampaignFormData {
  name: string;
  description: string;
  competitionIds: string[];
  invitedStudents: string[];
  startDate: Date;
  endDate: Date;
  registrationDeadline: Date;
  settings: {
    autoApprove: boolean;
    allowLateRegistration: boolean;
    sendReminders: boolean;
    trackProgress: boolean;
  };
}

interface Student {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  enrolled: boolean;
}

const steps = [
  'Campaign Details',
  'Select Competitions',
  'Invite Students',
  'Configure Settings',
  'Review & Create'
];

const CampaignCreationWizard: React.FC<CampaignCreationWizardProps> = ({
  open,
  onClose,
  onCampaignCreated,
  instructorId,
  classId,
  courseId,
  availableCompetitions
}) => {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    description: '',
    competitionIds: [],
    invitedStudents: [],
    startDate: new Date(),
    endDate: addDays(new Date(), 30),
    registrationDeadline: addDays(new Date(), 7),
    settings: {
      autoApprove: true,
      allowLateRegistration: false,
      sendReminders: true,
      trackProgress: true
    }
  });

  useEffect(() => {
    if (open) {
      loadStudents();
    }
  }, [open, classId, courseId]);

  const loadStudents = async () => {
    try {
      // Mock student data - in real implementation, this would come from an API
      const mockStudents: Student[] = [
        { id: '1', name: 'Alice Johnson', email: 'alice@example.com', enrolled: true },
        { id: '2', name: 'Bob Smith', email: 'bob@example.com', enrolled: true },
        { id: '3', name: 'Carol Davis', email: 'carol@example.com', enrolled: true },
        { id: '4', name: 'David Wilson', email: 'david@example.com', enrolled: true },
        { id: '5', name: 'Eva Brown', email: 'eva@example.com', enrolled: false },
        { id: '6', name: 'Frank Miller', email: 'frank@example.com', enrolled: true },
        { id: '7', name: 'Grace Lee', email: 'grace@example.com', enrolled: true },
        { id: '8', name: 'Henry Taylor', email: 'henry@example.com', enrolled: false }
      ];
      setStudents(mockStudents);
    } catch (err: any) {
      setError('Failed to load students');
    }
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setFormData({
      name: '',
      description: '',
      competitionIds: [],
      invitedStudents: [],
      startDate: new Date(),
      endDate: addDays(new Date(), 30),
      registrationDeadline: addDays(new Date(), 7),
      settings: {
        autoApprove: true,
        allowLateRegistration: false,
        sendReminders: true,
        trackProgress: true
      }
    });
    setError(null);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0:
        return formData.name.trim() !== '' && formData.description.trim() !== '';
      case 1:
        return formData.competitionIds.length > 0;
      case 2:
        return formData.invitedStudents.length > 0;
      case 3:
        return true; // Settings are optional
      default:
        return true;
    }
  };

  const handleCreateCampaign = async () => {
    try {
      setLoading(true);
      setError(null);

      const campaignData = {
        name: formData.name,
        description: formData.description,
        status: CampaignStatus.SCHEDULED,
        instructorId,
        classId,
        courseId,
        competitionIds: formData.competitionIds,
        invitedStudents: formData.invitedStudents,
        participatingStudents: [],
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString(),
        registrationDeadline: formData.registrationDeadline?.toISOString(),
        participationRate: 0,
        completionRate: 0,
        averageScore: 0
      };

      const createdCampaign = await competitionApi.createCampaign(campaignData);
      onCampaignCreated(createdCampaign);
      handleReset();
    } catch (err: any) {
      setError(err.message || 'Failed to create campaign');
    } finally {
      setLoading(false);
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

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Campaign Name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              margin="normal"
              required
              placeholder="e.g., Fall 2023 Hacktoberfest Challenge"
            />
            
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              margin="normal"
              multiline
              rows={3}
              required
              placeholder="Describe the goals and expectations for this campaign..."
            />

            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={4}>
                  <DatePicker
                    label="Start Date"
                    value={formData.startDate}
                    onChange={(date) => date && setFormData(prev => ({ ...prev, startDate: date }))}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <DatePicker
                    label="End Date"
                    value={formData.endDate}
                    onChange={(date) => date && setFormData(prev => ({ ...prev, endDate: date }))}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <DatePicker
                    label="Registration Deadline"
                    value={formData.registrationDeadline}
                    onChange={(date) => date && setFormData(prev => ({ ...prev, registrationDeadline: date }))}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
              </Grid>
            </LocalizationProvider>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Select competitions to include in this campaign. Students will be able to participate in any of the selected competitions.
            </Typography>
            
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {availableCompetitions.map((competition) => (
                <Grid item xs={12} sm={6} md={4} key={competition.id}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      border: formData.competitionIds.includes(competition.id)
                        ? `2px solid ${theme.palette.primary.main}`
                        : '1px solid rgba(255, 255, 255, 0.12)',
                      backgroundColor: formData.competitionIds.includes(competition.id)
                        ? 'rgba(63, 81, 181, 0.1)'
                        : 'inherit',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.05)'
                      }
                    }}
                    onClick={() => {
                      const isSelected = formData.competitionIds.includes(competition.id);
                      setFormData(prev => ({
                        ...prev,
                        competitionIds: isSelected
                          ? prev.competitionIds.filter(id => id !== competition.id)
                          : [...prev.competitionIds, competition.id]
                      }));
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, mr: 1, fontSize: '1rem' }}>
                          {getCompetitionTypeIcon(competition.type)}
                        </Avatar>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', flex: 1 }}>
                          {competition.name}
                        </Typography>
                        {formData.competitionIds.includes(competition.id) && (
                          <Chip
                            label="Selected"
                            size="small"
                            color="primary"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>
                      
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        {competition.description}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Chip
                          label={competition.difficultyLevel}
                          size="small"
                          sx={{ fontSize: '0.6rem' }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {competition.participantCount} participants
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
            
            {formData.competitionIds.length > 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                {formData.competitionIds.length} competition{formData.competitionIds.length > 1 ? 's' : ''} selected
              </Alert>
            )}
          </Box>
        );

      case 2:
        const enrolledStudents = students.filter(s => s.enrolled);
        const unenrolledStudents = students.filter(s => !s.enrolled);
        
        return (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Select students to invite to this campaign
              </Typography>
              <Box>
                <Button
                  size="small"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    invitedStudents: enrolledStudents.map(s => s.id)
                  }))}
                >
                  Select All Enrolled
                </Button>
                <Button
                  size="small"
                  onClick={() => setFormData(prev => ({ ...prev, invitedStudents: [] }))}
                  sx={{ ml: 1 }}
                >
                  Clear All
                </Button>
              </Box>
            </Box>

            {/* Enrolled Students */}
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              📚 Enrolled Students ({enrolledStudents.length})
            </Typography>
            <List dense sx={{ mb: 2 }}>
              {enrolledStudents.map((student) => (
                <ListItem
                  key={student.id}
                  sx={{
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 1,
                    mb: 0.5,
                    backgroundColor: formData.invitedStudents.includes(student.id)
                      ? 'rgba(76, 175, 80, 0.1)'
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
                      checked={formData.invitedStudents.includes(student.id)}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setFormData(prev => ({
                          ...prev,
                          invitedStudents: isChecked
                            ? [...prev.invitedStudents, student.id]
                            : prev.invitedStudents.filter(id => id !== student.id)
                        }));
                      }}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>

            {/* Unenrolled Students */}
            {unenrolledStudents.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  👥 Other Students ({unenrolledStudents.length})
                </Typography>
                <List dense>
                  {unenrolledStudents.map((student) => (
                    <ListItem
                      key={student.id}
                      sx={{
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 1,
                        mb: 0.5,
                        opacity: 0.7,
                        backgroundColor: formData.invitedStudents.includes(student.id)
                          ? 'rgba(76, 175, 80, 0.1)'
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
                        secondary={`${student.email} • Not enrolled`}
                      />
                      <ListItemSecondaryAction>
                        <Checkbox
                          checked={formData.invitedStudents.includes(student.id)}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setFormData(prev => ({
                              ...prev,
                              invitedStudents: isChecked
                                ? [...prev.invitedStudents, student.id]
                                : prev.invitedStudents.filter(id => id !== student.id)
                            }));
                          }}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </>
            )}

            {formData.invitedStudents.length > 0 && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {formData.invitedStudents.length} student{formData.invitedStudents.length > 1 ? 's' : ''} will be invited
              </Alert>
            )}
          </Box>
        );

      case 3:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Configure campaign settings and preferences
            </Typography>
            
            <FormGroup sx={{ mt: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.settings.autoApprove}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, autoApprove: e.target.checked }
                    }))}
                  />
                }
                label="Auto-approve student registrations"
              />
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.settings.allowLateRegistration}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, allowLateRegistration: e.target.checked }
                    }))}
                  />
                }
                label="Allow registration after deadline"
              />
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.settings.sendReminders}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, sendReminders: e.target.checked }
                    }))}
                  />
                }
                label="Send reminder notifications"
              />
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.settings.trackProgress}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, trackProgress: e.target.checked }
                    }))}
                  />
                }
                label="Track student progress automatically"
              />
            </FormGroup>
          </Box>
        );

      case 4:
        const selectedCompetitions = availableCompetitions.filter(c => 
          formData.competitionIds.includes(c.id)
        );
        const invitedStudentsList = students.filter(s => 
          formData.invitedStudents.includes(s.id)
        );
        
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              📋 Campaign Summary
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card sx={{ p: 2, backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Campaign Details
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Name:</strong> {formData.name}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Description:</strong> {formData.description}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Duration:</strong> {format(formData.startDate, 'MMM dd, yyyy')} - {format(formData.endDate, 'MMM dd, yyyy')}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Registration Deadline:</strong> {format(formData.registrationDeadline, 'MMM dd, yyyy')}
                  </Typography>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card sx={{ p: 2, backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Competitions ({selectedCompetitions.length})
                  </Typography>
                  {selectedCompetitions.map((comp) => (
                    <Box key={comp.id} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <Avatar sx={{ width: 20, height: 20, mr: 1, fontSize: '0.7rem' }}>
                        {getCompetitionTypeIcon(comp.type)}
                      </Avatar>
                      <Typography variant="body2">{comp.name}</Typography>
                    </Box>
                  ))}
                </Card>
              </Grid>
              
              <Grid item xs={12}>
                <Card sx={{ p: 2, backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Invited Students ({invitedStudentsList.length})
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {invitedStudentsList.slice(0, 10).map((student) => (
                      <Chip
                        key={student.id}
                        label={student.name}
                        size="small"
                        avatar={<Avatar sx={{ width: 20, height: 20 }}>{student.name.charAt(0)}</Avatar>}
                      />
                    ))}
                    {invitedStudentsList.length > 10 && (
                      <Chip
                        label={`+${invitedStudentsList.length - 10} more`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </Card>
              </Grid>
            </Grid>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, rgba(63, 81, 181, 0.05) 0%, rgba(156, 39, 176, 0.05) 100%)',
          backdropFilter: 'blur(10px)'
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            🚀 Create New Campaign
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
              <StepContent>
                {renderStepContent(index)}
                
                <Box sx={{ mb: 2, mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={index === steps.length - 1 ? handleCreateCampaign : handleNext}
                    disabled={!validateStep(index) || loading}
                    sx={{ mr: 1 }}
                  >
                    {index === steps.length - 1 ? 'Create Campaign' : 'Continue'}
                  </Button>
                  <Button
                    disabled={index === 0}
                    onClick={handleBack}
                    sx={{ mr: 1 }}
                  >
                    Back
                  </Button>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>

        {loading && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
              Creating campaign...
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {activeStep === steps.length && (
          <Button onClick={handleReset}>Reset</Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CampaignCreationWizard;