/**
 * Tests for BadgeShowcase component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import BadgeShowcase from '../BadgeShowcase';
import { Badge, BadgeCategory, BadgeRarity } from '../../../types';

const theme = createTheme();

const mockBadges: Badge[] = [
  {
    id: 'badge-1',
    name: 'First Submission',
    description: 'Completed your first code submission',
    iconUrl: '/icons/first-submission.png',
    category: BadgeCategory.MILESTONE,
    rarity: BadgeRarity.COMMON,
    points: 50,
    earnedAt: '2023-10-15T10:00:00Z'
  },
  {
    id: 'badge-2',
    name: 'Security Expert',
    description: 'Achieved 100% security score on 5 submissions',
    iconUrl: '/icons/security-expert.png',
    category: BadgeCategory.SECURITY,
    rarity: BadgeRarity.RARE,
    points: 200,
    earnedAt: '2023-10-18T14:30:00Z'
  },
  {
    id: 'badge-3',
    name: 'Code Quality Master',
    description: 'Maintained high code quality across multiple submissions',
    iconUrl: '/icons/quality-master.png',
    category: BadgeCategory.CODING,
    rarity: BadgeRarity.EPIC,
    points: 300,
    earnedAt: '2023-10-20T09:15:00Z'
  }
];

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('BadgeShowcase', () => {
  it('renders badge collection with correct count', () => {
    renderWithTheme(<BadgeShowcase badges={mockBadges} />);
    
    expect(screen.getByText('Badge Collection (3)')).toBeInTheDocument();
  });

  it('displays all badges by default', () => {
    renderWithTheme(<BadgeShowcase badges={mockBadges} />);
    
    expect(screen.getByText('First Submission')).toBeInTheDocument();
    expect(screen.getByText('Security Expert')).toBeInTheDocument();
    expect(screen.getByText('Code Quality Master')).toBeInTheDocument();
  });

  it('filters badges by category', () => {
    renderWithTheme(<BadgeShowcase badges={mockBadges} />);
    
    const securityButton = screen.getByText('Security');
    fireEvent.click(securityButton);
    
    expect(screen.getByText('Security Expert')).toBeInTheDocument();
    expect(screen.queryByText('First Submission')).not.toBeInTheDocument();
  });

  it('shows badge details in dialog when clicked', () => {
    renderWithTheme(<BadgeShowcase badges={mockBadges} />);
    
    const badge = screen.getByText('Security Expert');
    fireEvent.click(badge.closest('.MuiCard-root')!);
    
    expect(screen.getByText('Achieved 100% security score on 5 submissions')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument(); // Points
  });

  it('displays rarity correctly', () => {
    renderWithTheme(<BadgeShowcase badges={mockBadges} />);
    
    expect(screen.getByText('common')).toBeInTheDocument();
    expect(screen.getByText('rare')).toBeInTheDocument();
    expect(screen.getByText('epic')).toBeInTheDocument();
  });

  it('shows earned dates', () => {
    renderWithTheme(<BadgeShowcase badges={mockBadges} />);
    
    // Check for formatted dates (will vary based on locale)
    expect(screen.getByText(/10\/15\/2023|15\/10\/2023|2023-10-15/)).toBeInTheDocument();
  });

  it('displays collection statistics', () => {
    renderWithTheme(<BadgeShowcase badges={mockBadges} />);
    
    expect(screen.getByText('Collection Statistics')).toBeInTheDocument();
    expect(screen.getByText('By Category')).toBeInTheDocument();
    expect(screen.getByText('By Rarity')).toBeInTheDocument();
  });

  it('shows category statistics correctly', () => {
    renderWithTheme(<BadgeShowcase badges={mockBadges} />);
    
    expect(screen.getByText('milestone: 1')).toBeInTheDocument();
    expect(screen.getByText('security: 1')).toBeInTheDocument();
    expect(screen.getByText('coding: 1')).toBeInTheDocument();
  });

  it('shows rarity statistics correctly', () => {
    renderWithTheme(<BadgeShowcase badges={mockBadges} />);
    
    expect(screen.getByText('common: 1')).toBeInTheDocument();
    expect(screen.getByText('rare: 1')).toBeInTheDocument();
    expect(screen.getByText('epic: 1')).toBeInTheDocument();
  });

  it('displays empty state when no badges', () => {
    renderWithTheme(<BadgeShowcase badges={[]} />);
    
    expect(screen.getByText('No badges earned yet. Keep learning to unlock your first badge!')).toBeInTheDocument();
  });

  it('shows category-specific empty state', () => {
    renderWithTheme(<BadgeShowcase badges={mockBadges} />);
    
    const learningButton = screen.getByText('Learning');
    fireEvent.click(learningButton);
    
    expect(screen.getByText('No learning badges earned yet.')).toBeInTheDocument();
  });

  it('closes badge detail dialog', () => {
    renderWithTheme(<BadgeShowcase badges={mockBadges} />);
    
    // Open dialog
    const badge = screen.getByText('Security Expert');
    fireEvent.click(badge.closest('.MuiCard-root')!);
    
    // Close dialog
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);
    
    expect(screen.queryByText('Achieved 100% security score on 5 submissions')).not.toBeInTheDocument();
  });

  it('calculates total points from badges', () => {
    renderWithTheme(<BadgeShowcase badges={mockBadges} />);
    
    const totalPoints = mockBadges.reduce((sum, badge) => sum + badge.points, 0);
    expect(screen.getByText(`Total Points from Achievements: ${totalPoints}`)).toBeInTheDocument();
  });
});