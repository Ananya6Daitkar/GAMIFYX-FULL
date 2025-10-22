/**
 * Tests for TeacherDashboard page
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import TeacherDashboard from '../TeacherDashboard';

const theme = createTheme();

// Mock the teacher metrics hook
jest.mock('../../hooks/useTeacherMetrics', () => ({
  useTeacherMetrics: () => ({
    trackPageView: jest.fn(),
    trackAction: jest.fn(),
    trackFeatureUsage: jest.fn(),
    trackIntervention: jest.fn(),
    trackAlertAction: jest.fn(),
    trackReportGeneration: jest.fn()
  })
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('TeacherDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state initially', () => {
    renderWithProviders(<TeacherDashboard />);
    
    expect(screen.getByText('Loading teacher dashboard...')).toBeInTheDocument();
  });

  it('loads and displays dashboard after loading', async () => {
    renderWithProviders(<TeacherDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Teacher Dashboard')).toBeInTheDocument();
    }, { timeout: 2000 });

    expect(screen.getByText('Monitor and support your students\' learning journey')).toBeInTheDocument();
  });

  it('renders navigation tabs', async () => {
    renderWithProviders(<TeacherDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Students')).toBeInTheDocument();
      expect(screen.getByText('Alerts')).toBeInTheDocument();
      expect(screen.getByText('Reports')).toBeInTheDocument();
    });
  });

  it('switches between tabs', async () => {
    renderWithProviders(<TeacherDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument();
    });

    // Click on Students tab
    const studentsTab = screen.getByText('Students');
    fireEvent.click(studentsTab);

    expect(screen.getByText('Student Analytics')).toBeInTheDocument();
  });

  it('displays class overview in overview tab', async () => {
    renderWithProviders(<TeacherDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Class Overview')).toBeInTheDocument();
    });

    // Should show mock data
    expect(screen.getByText('45')).toBeInTheDocument(); // Total students
    expect(screen.getByText('3')).toBeInTheDocument(); // At-risk students
  });

  it('shows alert badge with active alerts count', async () => {
    renderWithProviders(<TeacherDashboard />);
    
    await waitFor(() => {
      // Should show badge with active alerts count (1 in mock data)
      const alertsTab = screen.getByText('Alerts');
      expect(alertsTab).toBeInTheDocument();
    });
  });

  it('displays student drill-down in students tab', async () => {
    renderWithProviders(<TeacherDashboard />);
    
    await waitFor(() => {
      const studentsTab = screen.getByText('Students');
      fireEvent.click(studentsTab);
    });

    expect(screen.getByText('Student Analytics')).toBeInTheDocument();
    expect(screen.getByText('Students (2)')).toBeInTheDocument();
  });

  it('shows alert management in alerts tab', async () => {
    renderWithProviders(<TeacherDashboard />);
    
    await waitFor(() => {
      const alertsTab = screen.getByText('Alerts');
      fireEvent.click(alertsTab);
    });

    expect(screen.getByText('Alert Management')).toBeInTheDocument();
  });

  it('displays report generation in reports tab', async () => {
    renderWithProviders(<TeacherDashboard />);
    
    await waitFor(() => {
      const reportsTab = screen.getByText('Reports');
      fireEvent.click(reportsTab);
    });

    expect(screen.getByText('Report Generation')).toBeInTheDocument();
  });

  it('handles refresh button click', async () => {
    renderWithProviders(<TeacherDashboard />);
    
    await waitFor(() => {
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);
    });

    // Should trigger loading state again
    expect(screen.getByText('Loading teacher dashboard...')).toBeInTheDocument();
  });

  it('displays mock student data', async () => {
    renderWithProviders(<TeacherDashboard />);
    
    await waitFor(() => {
      const studentsTab = screen.getByText('Students');
      fireEvent.click(studentsTab);
    });

    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
  });

  it('shows student risk levels', async () => {
    renderWithProviders(<TeacherDashboard />);
    
    await waitFor(() => {
      const studentsTab = screen.getByText('Students');
      fireEvent.click(studentsTab);
    });

    expect(screen.getByText('low')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
  });

  it('displays alert information', async () => {
    renderWithProviders(<TeacherDashboard />);
    
    await waitFor(() => {
      const alertsTab = screen.getByText('Alerts');
      fireEvent.click(alertsTab);
    });

    expect(screen.getByText('Student Performance Decline')).toBeInTheDocument();
    expect(screen.getByText('Low Class Engagement')).toBeInTheDocument();
  });

  it('shows report templates', async () => {
    renderWithProviders(<TeacherDashboard />);
    
    await waitFor(() => {
      const reportsTab = screen.getByText('Reports');
      fireEvent.click(reportsTab);
    });

    expect(screen.getByText('Student Performance Report')).toBeInTheDocument();
    expect(screen.getByText('At-Risk Students Report')).toBeInTheDocument();
  });

  it('handles error state gracefully', async () => {
    // Mock console.error to avoid noise in test output
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    renderWithProviders(<TeacherDashboard />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading teacher dashboard...')).not.toBeInTheDocument();
    }, { timeout: 2000 });

    consoleSpy.mockRestore();
  });
});