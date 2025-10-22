/**
 * Tests for ClassOverview component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ClassOverview from '../ClassOverview';

const theme = createTheme();

const mockClassMetrics = {
  totalStudents: 45,
  activeStudents: 42,
  atRiskStudents: 3,
  averagePerformance: 78,
  completionRate: 85,
  engagementScore: 82,
  trendsData: [
    { date: '2023-10-01', performance: 75, engagement: 80, submissions: 35 },
    { date: '2023-10-08', performance: 77, engagement: 82, submissions: 38 }
  ],
  performanceDistribution: [
    { range: '90-100%', count: 8, color: '#4CAF50' },
    { range: '80-89%', count: 15, color: '#FF9800' }
  ],
  skillsProgress: [
    { skill: 'DevOps', average: 75, improvement: 5 },
    { skill: 'Security', average: 82, improvement: 8 }
  ]
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('ClassOverview', () => {
  const mockOnRefresh = jest.fn();

  beforeEach(() => {
    mockOnRefresh.mockClear();
  });

  it('renders class overview with correct metrics', () => {
    renderWithTheme(
      <ClassOverview
        classId="class-1"
        metrics={mockClassMetrics}
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText('Class Overview')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument(); // Total students
    expect(screen.getByText('3')).toBeInTheDocument(); // At-risk students
    expect(screen.getByText('78%')).toBeInTheDocument(); // Average performance
    expect(screen.getByText('85%')).toBeInTheDocument(); // Completion rate
  });

  it('displays active students count', () => {
    renderWithTheme(
      <ClassOverview
        classId="class-1"
        metrics={mockClassMetrics}
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText('42 active this week')).toBeInTheDocument();
  });

  it('shows at-risk percentage', () => {
    renderWithTheme(
      <ClassOverview
        classId="class-1"
        metrics={mockClassMetrics}
        onRefresh={mockOnRefresh}
      />
    );

    // 3/45 = 6.7%
    expect(screen.getByText('6.7% of class')).toBeInTheDocument();
  });

  it('handles timeframe changes', () => {
    renderWithTheme(
      <ClassOverview
        classId="class-1"
        metrics={mockClassMetrics}
        onRefresh={mockOnRefresh}
      />
    );

    const weeklyButton = screen.getByText('7 Days');
    fireEvent.click(weeklyButton);

    // Should still show the same data (timeframe change doesn't affect mock data)
    expect(screen.getByText('45')).toBeInTheDocument();
  });

  it('calls refresh when refresh button is clicked', () => {
    renderWithTheme(
      <ClassOverview
        classId="class-1"
        metrics={mockClassMetrics}
        onRefresh={mockOnRefresh}
      />
    );

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    expect(mockOnRefresh).toHaveBeenCalled();
  });

  it('displays performance trends chart', () => {
    renderWithTheme(
      <ClassOverview
        classId="class-1"
        metrics={mockClassMetrics}
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText('Performance Trends')).toBeInTheDocument();
  });

  it('shows skills progress overview', () => {
    renderWithTheme(
      <ClassOverview
        classId="class-1"
        metrics={mockClassMetrics}
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText('Skills Progress Overview')).toBeInTheDocument();
    expect(screen.getByText('DevOps: 75%')).toBeInTheDocument();
    expect(screen.getByText('Security: 82%')).toBeInTheDocument();
  });

  it('handles zero at-risk students', () => {
    const metricsWithNoRisk = {
      ...mockClassMetrics,
      atRiskStudents: 0
    };

    renderWithTheme(
      <ClassOverview
        classId="class-1"
        metrics={metricsWithNoRisk}
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('0.0% of class')).toBeInTheDocument();
  });

  it('displays performance distribution', () => {
    renderWithTheme(
      <ClassOverview
        classId="class-1"
        metrics={mockClassMetrics}
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText('Performance Distribution')).toBeInTheDocument();
  });
});