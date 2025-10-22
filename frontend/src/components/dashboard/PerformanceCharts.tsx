/**
 * Performance Charts Component - Shows performance metrics over time
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Chip
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend
} from 'recharts';
import { PerformanceMetric } from '../../types';

interface PerformanceChartsProps {
  data: PerformanceMetric[];
}

const PerformanceCharts: React.FC<PerformanceChartsProps> = ({ data }) => {
  const [chartType, setChartType] = useState<'trend' | 'radar'>('trend');

  const handleChartTypeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newType: 'trend' | 'radar' | null
  ) => {
    if (newType !== null) {
      setChartType(newType);
    }
  };

  // Prepare data for charts
  const trendData = data.map(item => ({
    date: new Date(item.timestamp).toLocaleDateString(),
    codeQuality: item.codeQuality,
    security: item.securityScore,
    testCoverage: item.testCoverage,
    completionTime: Math.max(0, 100 - (item.completionTime / 3600) * 100) // Convert to efficiency score
  }));

  // Calculate averages for radar chart
  const averages = data.length > 0 ? {
    codeQuality: Math.round(data.reduce((sum, item) => sum + item.codeQuality, 0) / data.length),
    security: Math.round(data.reduce((sum, item) => sum + item.securityScore, 0) / data.length),
    testCoverage: Math.round(data.reduce((sum, item) => sum + item.testCoverage, 0) / data.length),
    efficiency: Math.round(data.reduce((sum, item) => sum + Math.max(0, 100 - (item.completionTime / 3600) * 100), 0) / data.length)
  } : { codeQuality: 0, security: 0, testCoverage: 0, efficiency: 0 };

  const radarData = [
    { subject: 'Code Quality', A: averages.codeQuality, fullMark: 100 },
    { subject: 'Security', A: averages.security, fullMark: 100 },
    { subject: 'Test Coverage', A: averages.testCoverage, fullMark: 100 },
    { subject: 'Efficiency', A: averages.efficiency, fullMark: 100 }
  ];

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'warning';
    return 'error';
  };

  const formatTooltip = (value: number, name: string) => {
    if (name === 'completionTime') {
      return [`${Math.round(value)}%`, 'Efficiency'];
    }
    return [`${Math.round(value)}%`, name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())];
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Performance Metrics
          </Typography>
          <ToggleButtonGroup
            value={chartType}
            exclusive
            onChange={handleChartTypeChange}
            size="small"
          >
            <ToggleButton value="trend">Trend</ToggleButton>
            <ToggleButton value="radar">Overview</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {data.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography variant="body2" color="text.secondary">
              No performance data available yet. Complete some assignments to see your progress!
            </Typography>
          </Box>
        ) : (
          <Box>
            {chartType === 'trend' ? (
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={formatTooltip} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="codeQuality"
                      stroke="#1976d2"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="Code Quality"
                    />
                    <Line
                      type="monotone"
                      dataKey="security"
                      stroke="#d32f2f"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="Security"
                    />
                    <Line
                      type="monotone"
                      dataKey="testCoverage"
                      stroke="#2e7d32"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="Test Coverage"
                    />
                    <Line
                      type="monotone"
                      dataKey="completionTime"
                      stroke="#ed6c02"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="Efficiency"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis tick={{ fontSize: 12 }} />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fontSize: 10 }}
                    />
                    <Radar
                      name="Performance"
                      dataKey="A"
                      stroke="#1976d2"
                      fill="#1976d2"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </Box>
            )}

            {/* Performance Summary */}
            <Box mt={3}>
              <Typography variant="subtitle2" gutterBottom>
                Current Averages
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                <Chip
                  size="small"
                  label={`Code Quality: ${averages.codeQuality}%`}
                  color={getScoreColor(averages.codeQuality) as any}
                  variant="outlined"
                />
                <Chip
                  size="small"
                  label={`Security: ${averages.security}%`}
                  color={getScoreColor(averages.security) as any}
                  variant="outlined"
                />
                <Chip
                  size="small"
                  label={`Test Coverage: ${averages.testCoverage}%`}
                  color={getScoreColor(averages.testCoverage) as any}
                  variant="outlined"
                />
                <Chip
                  size="small"
                  label={`Efficiency: ${averages.efficiency}%`}
                  color={getScoreColor(averages.efficiency) as any}
                  variant="outlined"
                />
              </Box>
            </Box>

            {/* Insights */}
            <Box mt={2}>
              <Typography variant="caption" color="text.secondary">
                Based on {data.length} recent submissions
              </Typography>
              {averages.codeQuality < 70 && (
                <Typography variant="caption" display="block" color="warning.main">
                  💡 Focus on improving code quality by following best practices
                </Typography>
              )}
              {averages.security < 80 && (
                <Typography variant="caption" display="block" color="error.main">
                  🔒 Consider reviewing security guidelines to improve your security score
                </Typography>
              )}
              {averages.testCoverage < 70 && (
                <Typography variant="caption" display="block" color="info.main">
                  🧪 Increase test coverage by writing more comprehensive tests
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default PerformanceCharts;