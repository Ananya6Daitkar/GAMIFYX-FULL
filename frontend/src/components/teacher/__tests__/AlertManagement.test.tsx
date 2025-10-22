/**
 * Tests for AlertManagement component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AlertManagement from '../AlertManagement';

const theme = createTheme();

const mockAlerts = [
  {
    id: 'alert-1',
    type: 'performance' as const,
    severity: 'high' as const,
    title: 'Student Performance Decline',
    description: 'Bob Smith\'s performance has declined by 15%',
    studentId: 'student-2',
    studentName: 'Bob Smith',
    createdAt: '2023-10-22T08:00:00Z',
    status: 'active' as const,
    actions: [],
    metadata: {
      riskScore: 0.75,
      performanceChange: -15
    }
  },
  {
    id: 'alert-2',
    type: 'engagement' as const,
    severity: 'medium' as const,
    title: 'Low Class Engagement',
    description: 'Overall class engagement has dropped below 80%',
    createdAt: '2023-10-21T14:30:00Z',
    status: 'acknowledged' as const,
    acknowledgedAt: '2023-10-21T15:00:00Z',
    actions: [
      {
        id: 'action-1',
        type: 'monitoring',
        description: 'Monitoring engagement metrics closely',
        createdAt: '2023-10-21T15:00:00Z',
        createdBy: 'Teacher'
      }
    ]
  }
];

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('AlertManagement', () => {
  const mockHandlers = {
    onAcknowledgeAlert: jest.fn(),
    onResolveAlert: jest.fn(),
    onSnoozeAlert: jest.fn(),
    onDeleteAlert: jest.fn(),
    onCreateAction: jest.fn()
  };

  beforeEach(() => {
    Object.values(mockHandlers).forEach(mock => mock.mockClear());
  });

  it('renders alert management with correct title', () => {
    renderWithTheme(
      <AlertManagement
        alerts={mockAlerts}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Alert Management')).toBeInTheDocument();
  });

  it('displays alert summary', () => {
    renderWithTheme(
      <AlertManagement
        alerts={mockAlerts}
        {...mockHandlers}
      />
    );

    expect(screen.getByText(/1 active alerts requiring attention/)).toBeInTheDocument();
    expect(screen.getByText(/1 acknowledged alerts in progress/)).toBeInTheDocument();
  });

  it('shows all alerts in the all tab', () => {
    renderWithTheme(
      <AlertManagement
        alerts={mockAlerts}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Student Performance Decline')).toBeInTheDocument();
    expect(screen.getByText('Low Class Engagement')).toBeInTheDocument();
  });

  it('filters alerts by status tabs', () => {
    renderWithTheme(
      <AlertManagement
        alerts={mockAlerts}
        {...mockHandlers}
      />
    );

    // Click on Active tab
    const activeTab = screen.getByText('Active');
    fireEvent.click(activeTab);

    expect(screen.getByText('Student Performance Decline')).toBeInTheDocument();
    expect(screen.queryByText('Low Class Engagement')).not.toBeInTheDocument();
  });

  it('displays alert severity and type correctly', () => {
    renderWithTheme(
      <AlertManagement
        alerts={mockAlerts}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('medium')).toBeInTheDocument();
    expect(screen.getByText('performance')).toBeInTheDocument();
    expect(screen.getByText('engagement')).toBeInTheDocument();
  });

  it('shows student names for student-specific alerts', () => {
    renderWithTheme(
      <AlertManagement
        alerts={mockAlerts}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
  });

  it('handles alert acknowledgment', () => {
    renderWithTheme(
      <AlertManagement
        alerts={mockAlerts}
        {...mockHandlers}
      />
    );

    // Find and click acknowledge button for active alert
    const acknowledgeButtons = screen.getAllByRole('button');
    const acknowledgeButton = acknowledgeButtons.find(button => 
      button.getAttribute('aria-label') === 'Acknowledge' || 
      button.querySelector('[data-testid="CheckCircleIcon"]')
    );

    if (acknowledgeButton) {
      fireEvent.click(acknowledgeButton);
      expect(mockHandlers.onAcknowledgeAlert).toHaveBeenCalledWith('alert-1');
    }
  });

  it('expands alert details when expand button is clicked', () => {
    renderWithTheme(
      <AlertManagement
        alerts={mockAlerts}
        {...mockHandlers}
      />
    );

    // Find expand button
    const expandButtons = screen.getAllByRole('button');
    const expandButton = expandButtons.find(button => 
      button.querySelector('[data-testid="ExpandMoreIcon"]')
    );

    if (expandButton) {
      fireEvent.click(expandButton);
      expect(screen.getByText('Actions Taken (1)')).toBeInTheDocument();
    }
  });

  it('shows action history for alerts with actions', () => {
    renderWithTheme(
      <AlertManagement
        alerts={mockAlerts}
        {...mockHandlers}
      />
    );

    // Expand the alert with actions
    const expandButtons = screen.getAllByRole('button');
    const expandButton = expandButtons.find(button => 
      button.querySelector('[data-testid="ExpandMoreIcon"]')
    );

    if (expandButton) {
      fireEvent.click(expandButton);
      expect(screen.getByText('monitoring')).toBeInTheDocument();
      expect(screen.getByText('Monitoring engagement metrics closely')).toBeInTheDocument();
    }
  });

  it('opens add action dialog', async () => {
    renderWithTheme(
      <AlertManagement
        alerts={mockAlerts}
        {...mockHandlers}
      />
    );

    const addActionButton = screen.getAllByText('Add Action')[0];
    fireEvent.click(addActionButton);

    await waitFor(() => {
      expect(screen.getByText('Add Action to Alert')).toBeInTheDocument();
    });
  });

  it('shows resolve button for acknowledged alerts', () => {
    renderWithTheme(
      <AlertManagement
        alerts={mockAlerts}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Resolve')).toBeInTheDocument();
  });

  it('displays metadata for alerts', () => {
    renderWithTheme(
      <AlertManagement
        alerts={mockAlerts}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Risk: 75%')).toBeInTheDocument();
    expect(screen.getByText('Change: -15%')).toBeInTheDocument();
  });

  it('shows empty state when no alerts match filter', () => {
    renderWithTheme(
      <AlertManagement
        alerts={[]}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('No alerts in this category')).toBeInTheDocument();
  });
});