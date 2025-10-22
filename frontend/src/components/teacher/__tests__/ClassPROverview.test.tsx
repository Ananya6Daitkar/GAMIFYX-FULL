/**
 * Tests for ClassPROverview component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ClassPROverview from '../ClassPROverview';

const theme = createTheme();

// Mock fetch globally
global.fetch = jest.fn();

// Mock recharts components to avoid canvas issues in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  Pie: () => <div data-testid="pie" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  Cell: () => <div data-testid="cell" />
}));

const mockClassOverview = {
  teacherId: 'teacher-456',
  totalStudents: 25,
  studentsWithPRs: 18,
  totalPRs: 142,
  prsThisWeek: 23,
  prsThisMonth: 89,
  averagePRsPerStudent: 5.7,
  topContributors: [
    { studentId: 'student1', githubUsername: 'alice_dev', prCount: 15 },
    { studentId: 'student2', githubUsername: 'bob_coder', prCount: 12 },
    { studentId: 'student3', githubUsername: 'charlie_git', prCount: 10 }
  ],
  repositoryStats: [
    { repositoryName: 'web-app-project', prCount: 45, activeContributors: 12 },
    { repositoryName: 'api-backend', prCount: 38, activeContributors: 10 },
    { repositoryName: 'mobile-app', prCount: 32, activeContributors: 8 }
  ],
  generatedAt: '2023-10-15T10:30:00Z'
};

const mockTrendData = [
  { date: '2023-10-01', prs: 8, merged: 6, open: 2 },
  { date: '2023-10-02', prs: 12, merged: 9, open: 3 },
  { date: '2023-10-03', prs: 6, merged: 4, open: 2 }
];

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('ClassPROverview', () => {
  const mockOnTimeframeChange = jest.fn();
  const mockOnRefresh = jest.fn();
  const mockOnConfigureGitHub = jest.fn();

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
      <ClassPROverview teacherId="teacher-456" />
    );

    expect(screen.getByText('Loading class overview...')).toBeInTheDocument();
  });

  it('renders class overview with correct metrics', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockClassOverview
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrendData
      });

    renderWithTheme(
      <ClassPROverview teacherId="teacher-456" />
    );

    await waitFor(() => {
      expect(screen.getByText('Class GitHub Activity')).toBeInTheDocument();
    });

    expect(screen.getByText('142')).toBeInTheDocument(); // Total PRs
    expect(screen.getByText('18')).toBeInTheDocument(); // Active students
    expect(screen.getByText('5.7')).toBeInTheDocument(); // Avg PRs per student
    expect(screen.getByText('3')).toBeInTheDocument(); // Repositories count
  });

  it('displays engagement percentage correctly', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockClassOverview
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrendData
      });

    renderWithTheme(
      <ClassPROverview teacherId="teacher-456" />
    );

    await waitFor(() => {
      // 18/25 = 72%
      expect(screen.getByText('72.0% engagement')).toBeInTheDocument();
    });
  });

  it('shows this week and this month statistics', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockClassOverview
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrendData
      });

    renderWithTheme(
      <ClassPROverview teacherId="teacher-456" />
    );

    await waitFor(() => {
      expect(screen.getByText('23 this week')).toBeInTheDocument();
      expect(screen.getByText('89 this month')).toBeInTheDocument();
    });
  });

  it('handles timeframe changes', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockClassOverview
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrendData
      });

    renderWithTheme(
      <ClassPROverview
        teacherId="teacher-456"
        onTimeframeChange={mockOnTimeframeChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('7 Days')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('7 Days'));
    expect(mockOnTimeframeChange).toHaveBeenCalledWith('7d');
  });

  it('calls refresh when refresh button is clicked', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockClassOverview
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrendData
      });

    renderWithTheme(
      <ClassPROverview
        teacherId="teacher-456"
        onRefresh={mockOnRefresh}
      />
    );

    await waitFor(() => {
      const refreshButton = screen.getByLabelText(/refresh/i);
      expect(refreshButton).toBeInTheDocument();
    });

    const refreshButton = screen.getByLabelText(/refresh/i);
    fireEvent.click(refreshButton);
    expect(mockOnRefresh).toHaveBeenCalled();
  });

  it('displays top contributors list', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockClassOverview
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrendData
      });

    renderWithTheme(
      <ClassPROverview teacherId="teacher-456" />
    );

    await waitFor(() => {
      expect(screen.getByText('Top Contributors')).toBeInTheDocument();
      expect(screen.getByText('alice_dev')).toBeInTheDocument();
      expect(screen.getByText('bob_coder')).toBeInTheDocument();
      expect(screen.getByText('charlie_git')).toBeInTheDocument();
    });

    expect(screen.getByText('15 PRs')).toBeInTheDocument();
    expect(screen.getByText('12 PRs')).toBeInTheDocument();
    expect(screen.getByText('10 PRs')).toBeInTheDocument();
  });

  it('displays repository statistics', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockClassOverview
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrendData
      });

    renderWithTheme(
      <ClassPROverview teacherId="teacher-456" />
    );

    await waitFor(() => {
      expect(screen.getByText('Repository Statistics')).toBeInTheDocument();
      expect(screen.getByText('web-app-project')).toBeInTheDocument();
      expect(screen.getByText('api-backend')).toBeInTheDocument();
      expect(screen.getByText('mobile-app')).toBeInTheDocument();
    });

    expect(screen.getByText('45 PRs')).toBeInTheDocument();
    expect(screen.getByText('38 PRs')).toBeInTheDocument();
    expect(screen.getByText('32 PRs')).toBeInTheDocument();
  });

  it('shows activity level indicators for repositories', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockClassOverview
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrendData
      });

    renderWithTheme(
      <ClassPROverview teacherId="teacher-456" />
    );

    await waitFor(() => {
      expect(screen.getByText('High Activity')).toBeInTheDocument(); // For repos with >5 contributors
    });
  });

  it('handles API error gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

    renderWithTheme(
      <ClassPROverview teacherId="teacher-456" />
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to load class PR overview/)).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows configuration prompt when no data available', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => null
    });

    renderWithTheme(
      <ClassPROverview
        teacherId="teacher-456"
        onConfigureGitHub={mockOnConfigureGitHub}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/No GitHub data available/)).toBeInTheDocument();
      expect(screen.getByText('Configure')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Configure'));
    expect(mockOnConfigureGitHub).toHaveBeenCalled();
  });

  it('shows low engagement warning when engagement is below 70%', async () => {
    const lowEngagementOverview = {
      ...mockClassOverview,
      studentsWithPRs: 15 // 15/25 = 60%
    };

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => lowEngagementOverview
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrendData
      });

    renderWithTheme(
      <ClassPROverview teacherId="teacher-456" />
    );

    await waitFor(() => {
      expect(screen.getByText(/Low GitHub Engagement/)).toBeInTheDocument();
      expect(screen.getByText(/Only 15 out of 25 students/)).toBeInTheDocument();
    });
  });

  it('opens GitHub profile in new tab when contributor is clicked', async () => {
    const mockWindowOpen = jest.fn();
    window.open = mockWindowOpen;

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockClassOverview
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrendData
      });

    renderWithTheme(
      <ClassPROverview teacherId="teacher-456" />
    );

    await waitFor(() => {
      const openButtons = screen.getAllByLabelText(/open/i);
      expect(openButtons.length).toBeGreaterThan(0);
    });

    const openButtons = screen.getAllByLabelText(/open/i);
    fireEvent.click(openButtons[0]);

    expect(mockWindowOpen).toHaveBeenCalledWith(
      'https://github.com/alice_dev',
      '_blank'
    );
  });

  it('renders charts components', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockClassOverview
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrendData
      });

    renderWithTheme(
      <ClassPROverview teacherId="teacher-456" />
    );

    await waitFor(() => {
      expect(screen.getByText('PR Activity Trends')).toBeInTheDocument();
      expect(screen.getByText('Repository Activity')).toBeInTheDocument();
    });

    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('handles different timeframe props correctly', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockClassOverview
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrendData
      });

    renderWithTheme(
      <ClassPROverview
        teacherId="teacher-456"
        timeframe="7d"
      />
    );

    await waitFor(() => {
      const sevenDaysButton = screen.getByText('7 Days');
      expect(sevenDaysButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('shows GitHub settings button when onConfigureGitHub is provided', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockClassOverview
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrendData
      });

    renderWithTheme(
      <ClassPROverview
        teacherId="teacher-456"
        onConfigureGitHub={mockOnConfigureGitHub}
      />
    );

    await waitFor(() => {
      const settingsButton = screen.getByLabelText(/GitHub Settings/i);
      expect(settingsButton).toBeInTheDocument();
    });

    const settingsButton = screen.getByLabelText(/GitHub Settings/i);
    fireEvent.click(settingsButton);
    expect(mockOnConfigureGitHub).toHaveBeenCalled();
  });

  it('displays contributor count for each repository', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockClassOverview
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrendData
      });

    renderWithTheme(
      <ClassPROverview teacherId="teacher-456" />
    );

    await waitFor(() => {
      expect(screen.getByText('12 contributors')).toBeInTheDocument();
      expect(screen.getByText('10 contributors')).toBeInTheDocument();
      expect(screen.getByText('8 contributors')).toBeInTheDocument();
    });
  });

  it('handles empty top contributors list', async () => {
    const emptyContributorsOverview = {
      ...mockClassOverview,
      topContributors: []
    };

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => emptyContributorsOverview
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrendData
      });

    renderWithTheme(
      <ClassPROverview teacherId="teacher-456" />
    );

    await waitFor(() => {
      expect(screen.getByText('Top Contributors')).toBeInTheDocument();
    });

    // Should not crash with empty contributors list
    expect(screen.queryByText('alice_dev')).not.toBeInTheDocument();
  });

  it('retries data fetch when retry button is clicked', async () => {
    (fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockClassOverview
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrendData
      });

    renderWithTheme(
      <ClassPROverview teacherId="teacher-456" />
    );

    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Retry'));

    await waitFor(() => {
      expect(screen.getByText('Class GitHub Activity')).toBeInTheDocument();
    });
  });
});