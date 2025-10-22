/**
 * Report Generation Component - Generate and export various reports
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Button,
  TextField,
  MenuItem,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  // DatePicker,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Chip
} from '@mui/material';
import {
  GetApp,
  PictureAsPdf,
  TableChart,
  Assessment,
  Schedule,
  // Visibility,
  Delete,
  Refresh,
  TrendingUp,
  Healing
} from '@mui/icons-material';
import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'performance' | 'engagement' | 'progress' | 'intervention' | 'custom';
  format: 'pdf' | 'csv' | 'excel';
  fields: string[];
  lastGenerated?: string;
  generatedCount: number;
}

interface GeneratedReport {
  id: string;
  name: string;
  type: string;
  format: string;
  generatedAt: string;
  generatedBy: string;
  fileSize: string;
  downloadUrl: string;
  parameters: any;
}

interface ReportGenerationProps {
  templates: ReportTemplate[];
  generatedReports: GeneratedReport[];
  onGenerateReport: (template: ReportTemplate, parameters: any) => void;
  onDownloadReport: (reportId: string) => void;
  onDeleteReport: (reportId: string) => void;
  onRefreshReports: () => void;
}

const ReportGeneration: React.FC<ReportGenerationProps> = ({
  templates,
  generatedReports,
  onGenerateReport,
  onDownloadReport,
  onDeleteReport,
  onRefreshReports
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [generateDialog, setGenerateDialog] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reportParameters, setReportParameters] = useState({
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: new Date()
    },
    students: 'all',
    includeFields: [] as string[],
    groupBy: 'student',
    format: 'pdf'
  });

  const availableFields = [
    'student_info',
    'performance_scores',
    'submission_history',
    'engagement_metrics',
    'risk_scores',
    'interventions',
    'progress_trends',
    'skill_assessments',
    'attendance',
    'feedback_summary'
  ];

  const handleGenerateReport = async () => {
    if (!selectedTemplate) return;

    setGenerating(true);
    try {
      await onGenerateReport(selectedTemplate, reportParameters);
      setGenerateDialog(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleFieldToggle = (field: string) => {
    setReportParameters(prev => ({
      ...prev,
      includeFields: prev.includeFields.includes(field)
        ? prev.includeFields.filter(f => f !== field)
        : [...prev.includeFields, field]
    }));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'performance': return <Assessment />;
      case 'engagement': return <Schedule />;
      case 'progress': return <TrendingUp />;
      case 'intervention': return <Healing />;
      default: return <Assessment />;
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf': return <PictureAsPdf />;
      case 'csv': return <TableChart />;
      case 'excel': return <TableChart />;
      default: return <GetApp />;
    }
  };

  const formatFileSize = (bytes: string) => {
    const size = parseInt(bytes);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Typography variant="h5" component="h2" gutterBottom>
          Report Generation
        </Typography>

        <Grid container spacing={3}>
          {/* Report Templates */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    Report Templates
                  </Typography>
                  <Button
                    startIcon={<Refresh />}
                    onClick={onRefreshReports}
                    size="small"
                  >
                    Refresh
                  </Button>
                </Box>

                <Grid container spacing={2}>
                  {templates.map((template) => (
                    <Grid item xs={12} sm={6} key={template.id}>
                      <Card
                        variant="outlined"
                        sx={{
                          cursor: 'pointer',
                          '&:hover': {
                            boxShadow: 2
                          }
                        }}
                        onClick={() => {
                          setSelectedTemplate(template);
                          setReportParameters(prev => ({
                            ...prev,
                            format: template.format,
                            includeFields: template.fields
                          }));
                          setGenerateDialog(true);
                        }}
                      >
                        <CardContent>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            {getTypeIcon(template.type)}
                            <Typography variant="subtitle1" fontWeight="bold">
                              {template.name}
                            </Typography>
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary" mb={2}>
                            {template.description}
                          </Typography>
                          
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Chip
                              size="small"
                              label={template.format.toUpperCase()}
                              icon={getFormatIcon(template.format)}
                              variant="outlined"
                            />
                            <Typography variant="caption" color="text.secondary">
                              Generated {template.generatedCount} times
                            </Typography>
                          </Box>
                          
                          {template.lastGenerated && (
                            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                              Last: {new Date(template.lastGenerated).toLocaleDateString()}
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Generated Reports */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Generated Reports ({generatedReports.length})
                </Typography>

                <List>
                  {generatedReports.slice(0, 10).map((report) => (
                    <ListItem
                      key={report.id}
                      secondaryAction={
                        <Box display="flex" gap={1}>
                          <IconButton
                            size="small"
                            onClick={() => onDownloadReport(report.id)}
                          >
                            <GetApp />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => onDeleteReport(report.id)}
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      }
                    >
                      <ListItemIcon>
                        {getFormatIcon(report.format)}
                      </ListItemIcon>
                      <ListItemText
                        primary={report.name}
                        secondary={
                          <Box>
                            <Typography variant="caption" display="block">
                              {new Date(report.generatedAt).toLocaleString()} • {formatFileSize(report.fileSize)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              by {report.generatedBy}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>

                {generatedReports.length === 0 && (
                  <Box textAlign="center" py={4}>
                    <Assessment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                      No reports generated yet
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Generate Report Dialog */}
        <Dialog
          open={generateDialog}
          onClose={() => setGenerateDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Generate Report: {selectedTemplate?.name}
          </DialogTitle>
          
          <DialogContent>
            {generating && (
              <Box mb={2}>
                <Alert severity="info">
                  Generating report... This may take a few moments.
                </Alert>
                <LinearProgress sx={{ mt: 1 }} />
              </Box>
            )}

            <Grid container spacing={3}>
              {/* Date Range */}
              <Grid item xs={12} sm={6}>
                <MuiDatePicker
                  label="Start Date"
                  value={reportParameters.dateRange.start}
                  onChange={(date) => setReportParameters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, start: date || new Date() }
                  }))}
                  slots={{ textField: TextField }}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <MuiDatePicker
                  label="End Date"
                  value={reportParameters.dateRange.end}
                  onChange={(date) => setReportParameters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, end: date || new Date() }
                  }))}
                  slots={{ textField: TextField }}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>

              {/* Student Selection */}
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Students"
                  value={reportParameters.students}
                  onChange={(e) => setReportParameters(prev => ({
                    ...prev,
                    students: e.target.value
                  }))}
                >
                  <MenuItem value="all">All Students</MenuItem>
                  <MenuItem value="at-risk">At-Risk Students Only</MenuItem>
                  <MenuItem value="high-performers">High Performers Only</MenuItem>
                  <MenuItem value="custom">Custom Selection</MenuItem>
                </TextField>
              </Grid>

              {/* Group By */}
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Group By"
                  value={reportParameters.groupBy}
                  onChange={(e) => setReportParameters(prev => ({
                    ...prev,
                    groupBy: e.target.value
                  }))}
                >
                  <MenuItem value="student">By Student</MenuItem>
                  <MenuItem value="skill">By Skill</MenuItem>
                  <MenuItem value="assignment">By Assignment</MenuItem>
                  <MenuItem value="time">By Time Period</MenuItem>
                </TextField>
              </Grid>

              {/* Format */}
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Export Format"
                  value={reportParameters.format}
                  onChange={(e) => setReportParameters(prev => ({
                    ...prev,
                    format: e.target.value
                  }))}
                >
                  <MenuItem value="pdf">PDF Report</MenuItem>
                  <MenuItem value="csv">CSV Data</MenuItem>
                  <MenuItem value="excel">Excel Spreadsheet</MenuItem>
                </TextField>
              </Grid>

              {/* Include Fields */}
              <Grid item xs={12}>
                <FormControl component="fieldset">
                  <FormLabel component="legend">Include Data Fields</FormLabel>
                  <FormGroup>
                    <Grid container>
                      {availableFields.map((field) => (
                        <Grid item xs={12} sm={6} key={field}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={reportParameters.includeFields.includes(field)}
                                onChange={() => handleFieldToggle(field)}
                              />
                            }
                            label={field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </FormGroup>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setGenerateDialog(false)} disabled={generating}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerateReport}
              variant="contained"
              disabled={generating || reportParameters.includeFields.length === 0}
              startIcon={<GetApp />}
            >
              {generating ? 'Generating...' : 'Generate Report'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default ReportGeneration;