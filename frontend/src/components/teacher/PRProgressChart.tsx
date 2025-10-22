/**
 * PR Progress Chart Component - Visualizes PR submission trends over time
 */

import React from 'react';
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
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Legend,
  ComposedChart
} from 'recharts';

interface PRProgressChartProps {
  data: Array<{
    date: string;
    prs: number;
    merged: number;
    open: number;
    closed?: number;
  }>;
  height?: number;
  title?: string;
  chartType?: 'line' | 'area' | 'bar' | 'composed';
  showControls?: boolean;
  onChartTypeChange?: (type: 'line' | 'area' | 'bar' | 'composed') => void;
}

const PRProgressChart: React.FC<PRProgressChartProps> = ({
  data,
  height = 300,
  title = "PR Progress Over Time",
  chartType = 'area',
  showControls = true,
  onChartTypeChange
}) => {
  const handleChartTypeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newType: 'line' | 'area' | 'bar' | 'composed' | null
  ) => {
    if (newType !== null) {
      onChartTypeChange?.(newType);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTooltipDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTotalPRs = () => {
    return data.reduce((sum, item) => sum + item.prs, 0);
  };

  const getTotalMerged = () => {
    return data.reduce((sum, item) => sum + item.merged, 0);
  };

  const getMergeRate = () => {
    const total = getTotalPRs();
    const merged = getTotalMerged();
    return total > 0 ? ((merged / total) * 100).toFixed(1) : '0';
  };

  const getAveragePRsPerDay = () => {
    const total = getTotalPRs();
    return data.length > 0 ? (total / data.length).toFixed(1) : '0';
  };

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              interval="preserveStartEnd"
            />
            <YAxis />
            <RechartsTooltip 
              labelFormatter={formatTooltipDate}
              formatter={(value, name) => [value, name === 'prs' ? 'Total PRs' : name === 'merged' ? 'Merged PRs' : 'Open PRs']}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="prs"
              stroke="#1976d2"
              strokeWidth={2}
              name="Total PRs"
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="merged"
              stroke="#2e7d32"
              strokeWidth={2}
              name="Merged PRs"
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="open"
              stroke="#ed6c02"
              strokeWidth={2}
              name="Open PRs"
              dot={{ r: 4 }}
            />
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              interval="preserveStartEnd"
            />
            <YAxis />
            <RechartsTooltip 
              labelFormatter={formatTooltipDate}
              formatter={(value, name) => [value, name === 'prs' ? 'Total PRs' : name === 'merged' ? 'Merged PRs' : 'Open PRs']}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="prs"
              stackId="1"
              stroke="#1976d2"
              fill="#1976d2"
              fillOpacity={0.3}
              name="Total PRs"
            />
            <Area
              type="monotone"
              dataKey="merged"
              stackId="2"
              stroke="#2e7d32"
              fill="#2e7d32"
              fillOpacity={0.3}
              name="Merged PRs"
            />
            <Area
              type="monotone"
              dataKey="open"
              stackId="3"
              stroke="#ed6c02"
              fill="#ed6c02"
              fillOpacity={0.3}
              name="Open PRs"
            />
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              interval="preserveStartEnd"
            />
            <YAxis />
            <RechartsTooltip 
              labelFormatter={formatTooltipDate}
              formatter={(value, name) => [value, name === 'prs' ? 'Total PRs' : name === 'merged' ? 'Merged PRs' : 'Open PRs']}
            />
            <Legend />
            <Bar dataKey="prs" fill="#1976d2" name="Total PRs" />
            <Bar dataKey="merged" fill="#2e7d32" name="Merged PRs" />
            <Bar dataKey="open" fill="#ed6c02" name="Open PRs" />
          </BarChart>
        );

      case 'composed':
        return (
          <ComposedChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              interval="preserveStartEnd"
            />
            <YAxis />
            <RechartsTooltip 
              labelFormatter={formatTooltipDate}
              formatter={(value, name) => [value, name === 'prs' ? 'Total PRs' : name === 'merged' ? 'Merged PRs' : 'Open PRs']}
            />
            <Legend />
            <Bar dataKey="prs" fill="#1976d2" name="Total PRs" />
            <Line
              type="monotone"
              dataKey="merged"
              stroke="#2e7d32"
              strokeWidth={3}
              name="Merged PRs"
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="open"
              stroke="#ed6c02"
              strokeWidth={3}
              name="Open PRs"
              dot={{ r: 4 }}
            />
          </ComposedChart>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            {title}
          </Typography>
          {showControls && (
            <ToggleButtonGroup
              value={chartType}
              exclusive
              onChange={handleChartTypeChange}
              size="small"
            >
              <ToggleButton value="line">Line</ToggleButton>
              <ToggleButton value="area">Area</ToggleButton>
              <ToggleButton value="bar">Bar</ToggleButton>
              <ToggleButton value="composed">Mixed</ToggleButton>
            </ToggleButtonGroup>
          )}
        </Box>

        {/* Summary Stats */}
        <Box display="flex" gap={2} mb={3} flexWrap="wrap">
          <Chip
            label={`Total: ${getTotalPRs()}`}
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`Merged: ${getTotalMerged()}`}
            color="success"
            variant="outlined"
          />
          <Chip
            label={`Merge Rate: ${getMergeRate()}%`}
            color="info"
            variant="outlined"
          />
          <Chip
            label={`Avg/Day: ${getAveragePRsPerDay()}`}
            color="secondary"
            variant="outlined"
          />
        </Box>

        {/* Chart */}
        <Box height={height}>
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </Box>

        {/* Chart Description */}
        <Box mt={2}>
          <Typography variant="caption" color="text.secondary">
            {chartType === 'line' && 'Line chart shows PR trends over time with clear trend visualization.'}
            {chartType === 'area' && 'Area chart displays cumulative PR activity with filled regions.'}
            {chartType === 'bar' && 'Bar chart compares PR counts across different time periods.'}
            {chartType === 'composed' && 'Mixed chart combines bars for totals with lines for specific metrics.'}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PRProgressChart;