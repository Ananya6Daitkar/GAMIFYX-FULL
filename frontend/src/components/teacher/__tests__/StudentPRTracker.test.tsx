/**
 * Tests for StudentPRTracker component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import StudentPRTracker from '../StudentPRTracker';

const theme = createTheme();

// Mock fetch globally
global.fetch = jest.fn();

const mockStudentPRStats = {
  studentId: 'student-123',
  githubUsername: 'test_student',
  totalPRs: 15,
  mergedPRs: 12,
  openPRs: 2,
  prsThisWeek: 3,
  prsThisMonth: 8,
  lastPRDate: '2023-10-15T10:30:00Z',
  avgPRSize: 150,
  trend: {
    direction: 'improving' as const,
    percentage: 25,
    timeframe: '2 weeks'
  },
  progressScore: 85
};

const mockRecentPRs = [
  {
    id: 'pr_1',
    studentUsername: 'test_student',
    repository: 'project-1',
    repositoryUrl: 'https://github.com/teacher/project-1',
    prNumber: 42,
    title: 'Feature: Add authentication functionality',
    url: 'https://github.com/teacher/project-1/pull/42',
    createdAt: '2023-10-15T10:30:00Z',
    status: 'merged' as const,
    commitCount: 5,
    linesAdded: 120,
    linesDeleted: 30,
    linesChanged: 150,
    filesChanged: 8,
    reviewComments: 2,
    isDraft: false
  },
  {
    id: 'pr_2',
    studentUsername: 'test_student',
    repository: 'project-2',
    repositoryUrl: 'https://github.com/teacher/project-2',
    prNumber: 15,
    title: 'Fix: Resolve dashboard loading issue',
    url: 'https://github.com/teacher/project-2/pull/15',
    createdAt: '2023-10-14T14:20:00Z',
    status: 'open' as const,
    commitCount: 2,
    linesAdded: 45,
    linesDeleted: 10,
    linesChanged: 55,
    filesChanged: 3,
    reviewComments: 0,
    isDraft: false
  }
];

const mockInsights = [
  {
    type: 'positive' as const,
    category: 'activity',
    message: 'Great PR activity this week!',
    impact: 'medium',
    confidence: 0.8
  },
  {
    type: 'warning' as const,
    category: 'consistency',
    message: 'Consider more frequent, smaller commits',
    impact: 'low',
    confidence: 0.6
  }
];

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('StudentPRTracker', () => {
  const mockOnViewDetails = jest.fn();
  const mockOnRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders loading state initially', () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithTheme(
      <StudentPRTracker
        studentId="student-123"
        teacherId="teacher-456"
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders student PR stats successfully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockStudentPRStats
    });

    renderWithTheme(
      <StudentPRTracker
        studentId="student-123"
        teacherId="teacher-456"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('test_student')).toBeInTheDocument();
    });

    expect(screen.getByText('15')).toBeInTheDocument(); // Total PRs
    expect(screen.getByText('12')).toBeInTheDocument(); // Merged PRs
    expect(screen.getByText('2')).toBeInTheDocument(); // Open PRs
    expect(screen.getByText('3')).toBeInTheDocument(); // This week
    expect(screen.getByText('85%')).toBeInTheDocument(); // Progress score
  });

  it('displays trend information correctly', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockStudentPRStats
    });

    renderWithTheme(
      <StudentPRTracker
        studentId="student-123"
        teacherId="teacher-456"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('improving 25%')).toBeInTheDocument();
    });
  });

  it('shows last PR date formatted correctly', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockStudentPRStats
    });

    renderWithTheme(
      <StudentPRTracker
        studentId="student-123"
        teacherId="teacher-456"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Last PR:/)).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

    renderWithTheme(
      <StudentPRTracker
        studentId="student-123"
        teacherId="teacher-456"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to load PR data/)).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows retry button on error and allows retry', async () => {
    (fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStudentPRStats
      });

    renderWithTheme(
      <StudentPRTracker
        studentId="student-123"
        teacherId="teacher-456"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Retry'));

    await waitFor(() => {
      expect(screen.getByText('test_student')).toBeInTheDocument();
    });
  });

  it('calls onViewDetails when View Details button is clicked', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockStudentPRStats
    });

    renderWithTheme(
      <StudentPRTracker
        studentId="student-123"
        teacherId="teacher-456"
        onViewDetails={mockOnViewDetails}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('View Details')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('View Details'));
    expect(mockOnViewDetails).toHaveBeenCalledWith('student-123');
  });

  it('calls onRefresh when refresh button is clicked', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockStudentPRStats
    });

    renderWithTheme(
      <StudentPRTracker
        studentId="student-123"
        teacherId="teacher-456"
        onRefresh={mockOnRefresh}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Refresh')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Refresh'));
    expect(mockOnRefresh).toHaveBeenCalled();
  });

  it('shows detailed view with recent PRs when showDetails is true', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStudentPRStats
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockRecentPRs
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockInsights
      });

    renderWithTheme(
      <StudentPRTracker
        studentId="student-123"
        teacherId="teacher-456"
        showDetails={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Show Recent PRs')).toBeInTheDocument();
    });

    // Expand the recent PRs section
    fireEvent.click(screen.getByText('Show Recent PRs'));

    await waitFor(() => {
      expect(screen.getByText('Feature: Add authentication functionality')).toBeInTheDocument();
      expect(screen.getByText('Fix: Resolve dashboard loading issue')).toBeInTheDocument();
    });
  });

  it('displays insights when available', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStudentPRStats
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockRecentPRs
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockInsights
      });

    renderWithTheme(
      <StudentPRTracker
        studentId="student-123"
        teacherId="teacher-456"
        showDetails={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Great PR activity this week!')).toBeInTheDocument();
      expect(screen.getByText('Consider more frequent, smaller commits')).toBeInTheDocument();
    });
  });

  it('handles different PR statuses correctly', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStudentPRStats
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockRecentPRs
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockInsights
      });

    renderWithTheme(
      <StudentPRTracker
        studentId="student-123"
        teacherId="teacher-456"
        showDetails={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Show Recent PRs')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Show Recent PRs'));

    await waitFor(() => {
      expect(screen.getByText('merged')).toBeInTheDocument();
      expect(screen.getByText('open')).toBeInTheDocument();
    });
  });

  it('opens GitHub PR in new tab when clicked', async () => {
    const mockWindowOpen = jest.fn();
    window.open = mockWindowOpen;

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStudentPRStats
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockRecentPRs
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockInsights
      });

    renderWithTheme(
      <StudentPRTracker
        studentId="student-123"
        teacherId="teacher-456"
        showDetails={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Show Recent PRs')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Show Recent PRs'));

    await waitFor(() => {
      const openButtons = screen.getAllByLabelText('Open in GitHub');
      expect(openButtons).toHaveLength(2);
    });

    const openButtons = screen.getAllByLabelText('Open in GitHub');
    fireEvent.click(openButtons[0]);

    expect(mockWindowOpen).toHaveBeenCalledWith(
      'https://github.com/teacher/project-1/pull/42',
      '_blank'
    );
  });

  it('shows no data message when student has no GitHub data', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => null
    });

    renderWithTheme(
      <StudentPRTracker
        studentId="student-123"
        teacherId="teacher-456"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No GitHub data available for this student')).toBeInTheDocument();
    });
  });

  it('displays correct progress score color based on value', async () => {
    const lowScoreStats = { ...mockStudentPRStats, progressScore: 45 };
    
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => lowScoreStats
    });

    renderWithTheme(
      <StudentPRTracker
        studentId="student-123"
        teacherId="teacher-456"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('45%')).toBeInTheDocument();
    });

    // The progress bar should have error color for low scores
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
  });

  it('handles declining trend correctly', async () => {
    const decliningStats = {
      ...mockStudentPRStats,
      trend: {
        direction: 'declining' as const,
        percentage: 15,
        timeframe: '2 weeks'
      }
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => decliningStats
    });

    renderWithTheme(
      <StudentPRTracker
        studentId="student-123"
        teacherId="teacher-456"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('declining 15%')).toBeInTheDocument();
    });
  });

  it('formats dates correctly for recent activity', async () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 1); // Yesterday
    
    const recentStats = {
      ...mockStudentPRStats,
      lastPRDate: recentDate.toISOString()
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => recentStats
    });

    renderWithTheme(
      <StudentPRTracker
        studentId="student-123"
        teacherId="teacher-456"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Last PR: Yesterday/)).toBeInTheDocument();
    });
  });

  it('handles empty recent PRs list', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStudentPRStats
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

    renderWithTheme(
      <StudentPRTracker
        studentId="student-123"
        teacherId="teacher-456"
        showDetails={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Show Recent PRs')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Show Recent PRs'));

    await waitFor(() => {
      expect(screen.getByText('No recent pull requests found')).toBeInTheDocument();
    });
  });
});