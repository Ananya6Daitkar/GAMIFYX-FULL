/**
 * GitHub Configuration Panel - Allows teachers to set up monitored repositories and student mappings
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  TextField,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Divider,
  Tooltip,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import {
  Add,
  Delete,
  Edit,
  GitHub,
  Visibility,
  VisibilityOff,
  Save,
  Cancel,
  CheckCircle,
  Warning,
  Info,
  Refresh,
  Upload,
  Download
} from '@mui/icons-material';
import { GitHubRepository, StudentGitHubProfile } from '../../types/github';

interface GitHubConfigPanelProps {
  teacherId: string;
  repositories: GitHubRepository[];
  studentMappings: StudentGitHubProfile[];
  onAddRepository: (repository: Omit<GitHubRepository, 'id'>) => void;
  onRemoveRepository: (repositoryId: string) => void;
  onAddStudentMapping: (mapping: Omit<StudentGitHubProfile, 'id'>) => void;
  onRemoveStudentMapping: (mappingId: string) => void;
  onSaveToken: (token: string) => void;
  onTestConnection?: () => Promise<boolean>;
  onSyncRepositories?: () => Promise<void>;
}

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
      id={`config-tabpanel-${index}`}
      aria-labelledby={`config-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const GitHubConfigPanel: React.FC<GitHubConfigPanelProps> = ({
  teacherId,
  repositories,
  studentMappings,
  onAddRepository,
  onRemoveRepository,
  onAddStudentMapping,
  onRemoveStudentMapping,
  onSaveToken,
  onTestConnection,
  onSyncRepositories
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [setupStep, setSetupStep] = useState(0);
  
  // Token management
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<'none' | 'valid' | 'invalid' | 'testing'>('none');
  
  // Repository management
  const [repoDialog, setRepoDialog] = useState(false);
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoOwner, setNewRepoOwner] = useState('');
  
  // Student mapping management
  const [mappingDialog, setMappingDialog] = useState(false);
  const [newStudentId, setNewStudentId] = useState('');
  const [newGithubUsername, setNewGithubUsername] = useState('');
  const [verificationMethod, setVerificationMethod] = useState<'manual' | 'oauth' | 'email'>('manual');
  
  // Bulk import
  const [bulkImportDialog, setBulkImportDialog] = useState(false);
  const [bulkImportData, setBulkImportData] = useState('');
  
  // Status and loading
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Check if setup is complete
    if (repositories.length > 0 && studentMappings.length > 0 && tokenStatus === 'valid') {
      setSetupStep(3);
    } else if (studentMappings.length > 0 && tokenStatus === 'valid') {
      setSetupStep(2);
    } else if (repositories.length > 0 && tokenStatus === 'valid') {
      setSetupStep(2);
    } else if (tokenStatus === 'valid') {
      setSetupStep(1);
    }
  }, [repositories, studentMappings, tokenStatus]);

  const handleTestConnection = async () => {
    if (!token.trim()) {
      setError('Please enter a GitHub token');
      return;
    }

    setTokenStatus('testing');
    setError(null);

    try {
      const isValid = onTestConnection ? await onTestConnection() : true;
      setTokenStatus(isValid ? 'valid' : 'invalid');
      
      if (isValid) {
        setSuccess('GitHub connection successful!');
        onSaveToken(token);
      } else {
        setError('Invalid GitHub token or insufficient permissions');
      }
    } catch (err) {
      setTokenStatus('invalid');
      setError('Failed to test GitHub connection');
    }
  };

  const handleAddRepository = () => {
    if (!newRepoUrl.trim() || !newRepoName.trim() || !newRepoOwner.trim()) {
      setError('Please fill in all repository fields');
      return;
    }

    const repository: Omit<GitHubRepository, 'id'> = {
      name: newRepoName,
      fullName: `${newRepoOwner}/${newRepoName}`,
      url: newRepoUrl,
      owner: newRepoOwner,
      teacherId,
      isActive: true,
      syncStatus: 'pending'
    };

    onAddRepository(repository);
    setRepoDialog(false);
    setNewRepoUrl('');
    setNewRepoName('');
    setNewRepoOwner('');
    setSuccess('Repository added successfully!');
  };

  const handleAddStudentMapping = () => {
    if (!newStudentId.trim() || !newGithubUsername.trim()) {
      setError('Please fill in all mapping fields');
      return;
    }

    const mapping: Omit<StudentGitHubProfile, 'id'> = {
      studentId: newStudentId,
      teacherId,
      githubUsername: newGithubUsername,
      isVerified: verificationMethod === 'manual',
      verificationMethod,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onAddStudentMapping(mapping);
    setMappingDialog(false);
    setNewStudentId('');
    setNewGithubUsername('');
    setSuccess('Student mapping added successfully!');
  };

  const handleBulkImport = () => {
    if (!bulkImportData.trim()) {
      setError('Please enter CSV data for bulk import');
      return;
    }

    try {
      const lines = bulkImportData.trim().split('\n');
      const mappings: Omit<StudentGitHubProfile, 'id'>[] = [];

      for (let i = 1; i < lines.length; i++) { // Skip header
        const [studentId, githubUsername] = lines[i].split(',').map(s => s.trim());
        if (studentId && githubUsername) {
          mappings.push({
            studentId,
            teacherId,
            githubUsername,
            isVerified: true,
            verificationMethod: 'manual',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }

      mappings.forEach(mapping => onAddStudentMapping(mapping));
      setBulkImportDialog(false);
      setBulkImportData('');
      setSuccess(`Successfully imported ${mappings.length} student mappings!`);
    } catch (err) {
      setError('Failed to parse CSV data. Please check the format.');
    }
  };

  const parseRepoUrl = (url: string) => {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (match) {
      setNewRepoOwner(match[1]);
      setNewRepoName(match[2].replace('.git', ''));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'syncing': return 'info';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const steps = [
    'Configure GitHub Token',
    'Add Repositories',
    'Map Students',
    'Complete Setup'
  ];

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          GitHub Integration Setup
        </Typography>
        <Box display="flex" gap={1}>
          {onSyncRepositories && (
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={onSyncRepositories}
              disabled={tokenStatus !== 'valid'}
            >
              Sync All
            </Button>
          )}
        </Box>
      </Box>

      {/* Status Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Setup Progress */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Setup Progress
          </Typography>
          <Stepper activeStep={setupStep} orientation="horizontal">
            {steps.map((label, index) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Configuration Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="GitHub Token" />
          <Tab label="Repositories" />
          <Tab label="Student Mappings" />
          <Tab label="Settings" />
        </Tabs>

        {/* GitHub Token Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    GitHub Personal Access Token
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Enter your GitHub Personal Access Token to enable repository monitoring.
                    The token needs 'repo' permissions to access private repositories.
                  </Typography>
                  
                  <TextField
                    fullWidth
                    label="GitHub Token"
                    type={showToken ? 'text' : 'password'}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowToken(!showToken)}>
                            {showToken ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                    sx={{ mb: 2 }}
                  />
                  
                  <Box display="flex" gap={2} alignItems="center">
                    <Button
                      variant="contained"
                      onClick={handleTestConnection}
                      disabled={!token.trim() || tokenStatus === 'testing'}
                      startIcon={tokenStatus === 'testing' ? <Refresh /> : <GitHub />}
                    >
                      {tokenStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                    </Button>
                    
                    {tokenStatus === 'valid' && (
                      <Chip
                        icon={<CheckCircle />}
                        label="Connected"
                        color="success"
                      />
                    )}
                    {tokenStatus === 'invalid' && (
                      <Chip
                        icon={<Warning />}
                        label="Invalid Token"
                        color="error"
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    How to Create a Token
                  </Typography>
                  <Typography variant="body2" paragraph>
                    1. Go to GitHub Settings → Developer settings → Personal access tokens
                  </Typography>
                  <Typography variant="body2" paragraph>
                    2. Click "Generate new token (classic)"
                  </Typography>
                  <Typography variant="body2" paragraph>
                    3. Select 'repo' scope for repository access
                  </Typography>
                  <Typography variant="body2" paragraph>
                    4. Copy the generated token and paste it here
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => window.open('https://github.com/settings/tokens', '_blank')}
                  >
                    Open GitHub Settings
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Repositories Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Monitored Repositories ({repositories.length})
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setRepoDialog(true)}
              disabled={tokenStatus !== 'valid'}
            >
              Add Repository
            </Button>
          </Box>

          <Grid container spacing={2}>
            {repositories.map((repo) => (
              <Grid item xs={12} md={6} key={repo.id}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                      <Typography variant="h6" noWrap>
                        {repo.name}
                      </Typography>
                      <Box display="flex" gap={1}>
                        <Chip
                          size="small"
                          label={repo.syncStatus}
                          color={getStatusColor(repo.syncStatus) as any}
                        />
                        <IconButton
                          size="small"
                          onClick={() => onRemoveRepository(repo.id)}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {repo.fullName}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Owner: {repo.owner}
                    </Typography>
                    {repo.lastSync && (
                      <Typography variant="caption" display="block">
                        Last sync: {new Date(repo.lastSync).toLocaleString()}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {repositories.length === 0 && (
            <Alert severity="info">
              No repositories configured. Add repositories to start monitoring student pull requests.
            </Alert>
          )}
        </TabPanel>

        {/* Student Mappings Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Student GitHub Mappings ({studentMappings.length})
            </Typography>
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                startIcon={<Upload />}
                onClick={() => setBulkImportDialog(true)}
              >
                Bulk Import
              </Button>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setMappingDialog(true)}
              >
                Add Mapping
              </Button>
            </Box>
          </Box>

          <List>
            {studentMappings.map((mapping) => (
              <React.Fragment key={mapping.id}>
                <ListItem>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle2">
                          {mapping.githubUsername}
                        </Typography>
                        <Chip
                          size="small"
                          label={mapping.isVerified ? 'Verified' : 'Unverified'}
                          color={mapping.isVerified ? 'success' : 'warning'}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2">
                          Student ID: {mapping.studentId}
                        </Typography>
                        <Typography variant="caption">
                          Method: {mapping.verificationMethod} • 
                          Added: {new Date(mapping.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => onRemoveStudentMapping(mapping.id)}
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>

          {studentMappings.length === 0 && (
            <Alert severity="info">
              No student mappings configured. Add mappings to connect students with their GitHub usernames.
            </Alert>
          )}
        </TabPanel>

        {/* Settings Tab */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Sync Settings
                  </Typography>
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="Auto-sync repositories"
                  />
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Automatically sync repository data every hour
                  </Typography>
                  
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="Real-time webhooks"
                  />
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Enable real-time PR updates via GitHub webhooks
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Export/Import
                  </Typography>
                  <Box display="flex" gap={2} mb={2}>
                    <Button
                      variant="outlined"
                      startIcon={<Download />}
                      onClick={() => {
                        const data = {
                          repositories,
                          studentMappings
                        };
                        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'github-config.json';
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      Export Config
                    </Button>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Export your GitHub configuration for backup or sharing
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Add Repository Dialog */}
      <Dialog open={repoDialog} onClose={() => setRepoDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Repository</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Repository URL"
            value={newRepoUrl}
            onChange={(e) => {
              setNewRepoUrl(e.target.value);
              parseRepoUrl(e.target.value);
            }}
            placeholder="https://github.com/owner/repository"
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            label="Owner"
            value={newRepoOwner}
            onChange={(e) => setNewRepoOwner(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Repository Name"
            value={newRepoName}
            onChange={(e) => setNewRepoName(e.target.value)}
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRepoDialog(false)}>Cancel</Button>
          <Button onClick={handleAddRepository} variant="contained">Add</Button>
        </DialogActions>
      </Dialog>

      {/* Add Student Mapping Dialog */}
      <Dialog open={mappingDialog} onClose={() => setMappingDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Student Mapping</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Student ID"
            value={newStudentId}
            onChange={(e) => setNewStudentId(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            label="GitHub Username"
            value={newGithubUsername}
            onChange={(e) => setNewGithubUsername(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Verification Method</InputLabel>
            <Select
              value={verificationMethod}
              onChange={(e) => setVerificationMethod(e.target.value as any)}
            >
              <MenuItem value="manual">Manual</MenuItem>
              <MenuItem value="oauth">OAuth</MenuItem>
              <MenuItem value="email">Email</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMappingDialog(false)}>Cancel</Button>
          <Button onClick={handleAddStudentMapping} variant="contained">Add</Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={bulkImportDialog} onClose={() => setBulkImportDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Bulk Import Student Mappings</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            Import multiple student mappings using CSV format. First line should be headers.
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Format: student_id,github_username
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={8}
            label="CSV Data"
            value={bulkImportData}
            onChange={(e) => setBulkImportData(e.target.value)}
            placeholder="student_id,github_username&#10;student1,alice_dev&#10;student2,bob_coder"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkImportDialog(false)}>Cancel</Button>
          <Button onClick={handleBulkImport} variant="contained">Import</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GitHubConfigPanel;