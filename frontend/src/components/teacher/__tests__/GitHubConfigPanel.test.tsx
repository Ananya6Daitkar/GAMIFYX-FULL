/**
 * Tests for GitHubConfigPanel component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import GitHubConfigPanel from '../GitHubConfigPanel';

const theme = createTheme();

const mockRepositories = [
  {
    id: 'repo-1',
    name: 'web-app-project',
    fullName: 'teacher/web-app-project',
    url: 'https://github.com/teacher/web-app-project',
    owner: 'teacher',
    teacherId: 'teacher-456',
    isActive: true,
    syncStatus: 'completed' as const,
    lastSync: '2023-10-15T10:30:00Z'
  },
  {
    id: 'repo-2',
    name: 'api-backend',
    fullName: 'teacher/api-backend',
    url: 'https://github.com/teacher/api-backend',
    owner: 'teacher',
    teacherId: 'teacher-456',
    isActive: true,
    syncStatus: 'syncing' as const
  }
];

const mockStudentMappings = [
  {
    id: 'mapping-1',
    studentId: 'student-123',
    teacherId: 'teacher-456',
    githubUsername: 'alice_dev',
    isVerified: true,
    verificationMethod: 'manual' as const,
    createdAt: '2023-10-01T10:00:00Z',
    updatedAt: '2023-10-01T10:00:00Z'
  },
  {
    id: 'mapping-2',
    studentId: 'student-456',
    teacherId: 'teacher-456',
    githubUsername: 'bob_coder',
    isVerified: false,
    verificationMethod: 'oauth' as const,
    createdAt: '2023-10-02T11:00:00Z',
    updatedAt: '2023-10-02T11:00:00Z'
  }
];

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('GitHubConfigPanel', () => {
  const mockOnAddRepository = jest.fn();
  const mockOnRemoveRepository = jest.fn();
  const mockOnAddStudentMapping = jest.fn();
  const mockOnRemoveStudentMapping = jest.fn();
  const mockOnSaveToken = jest.fn();
  const mockOnTestConnection = jest.fn();
  const mockOnSyncRepositories = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders GitHub integration setup header', () => {
    renderWithTheme(
      <GitHubConfigPanel
        teacherId="teacher-456"
        repositories={[]}
        studentMappings={[]}
        onAddRepository={mockOnAddRepository}
        onRemoveRepository={mockOnRemoveRepository}
        onAddStudentMapping={mockOnAddStudentMapping}
        onRemoveStudentMapping={mockOnRemoveStudentMapping}
        onSaveToken={mockOnSaveToken}
      />
    );

    expect(screen.getByText('GitHub Integration Setup')).toBeInTheDocument();
    expect(screen.getByText('Setup Progress')).toBeInTheDocument();
  });

  it('displays setup progress stepper', () => {
    renderWithTheme(
      <GitHubConfigPanel
        teacherId="teacher-456"
        repositories={mockRepositories}
        studentMappings={mockStudentMappings}
        onAddRepository={mockOnAddRepository}
        onRemoveRepository={mockOnRemoveRepository}
        onAddStudentMapping={mockOnAddStudentMapping}
        onRemoveStudentMapping={mockOnRemoveStudentMapping}
        onSaveToken={mockOnSaveToken}
      />
    );

    expect(screen.getByText('Configure GitHub Token')).toBeInTheDocument();
    expect(screen.getByText('Add Repositories')).toBeInTheDocument();
    expect(screen.getByText('Map Students')).toBeInTheDocument();
    expect(screen.getByText('Complete Setup')).toBeInTheDocument();
  });

  it('shows GitHub token configuration tab', () => {
    renderWithTheme(
      <GitHubConfigPanel
        teacherId="teacher-456"
        repositories={[]}
        studentMappings={[]}
        onAddRepository={mockOnAddRepository}
        onRemoveRepository={mockOnRemoveRepository}
        onAddStudentMapping={mockOnAddStudentMapping}
        onRemoveStudentMapping={mockOnRemoveStudentMapping}
        onSaveToken={mockOnSaveToken}
      />
    );

    expect(screen.getByText('GitHub Token')).toBeInTheDocument();
    expect(screen.getByText('GitHub Personal Access Token')).toBeInTheDocument();
    expect(screen.getByLabelText('GitHub Token')).toBeInTheDocument();
  });

  it('handles token input and test connection', async () => {
    mockOnTestConnection.mockResolvedValue(true);

    renderWithTheme(
      <GitHubConfigPanel
        teacherId="teacher-456"
        repositories={[]}
        studentMappings={[]}
        onAddRepository={mockOnAddRepository}
        onRemoveRepository={mockOnRemoveRepository}
        onAddStudentMapping={mockOnAddStudentMapping}
        onRemoveStudentMapping={mockOnRemoveStudentMapping}
        onSaveToken={mockOnSaveToken}
        onTestConnection={mockOnTestConnection}
      />
    );

    const tokenInput = screen.getByLabelText('GitHub Token');
    fireEvent.change(tokenInput, { target: { value: 'ghp_test_token' } });

    const testButton = screen.getByText('Test Connection');
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(mockOnTestConnection).toHaveBeenCalled();
    });
  });

  it('shows/hides token visibility', () => {
    renderWithTheme(
      <GitHubConfigPanel
        teacherId="teacher-456"
        repositories={[]}
        studentMappings={[]}
        onAddRepository={mockOnAddRepository}
        onRemoveRepository={mockOnRemoveRepository}
        onAddStudentMapping={mockOnAddStudentMapping}
        onRemoveStudentMapping={mockOnRemoveStudentMapping}
        onSaveToken={mockOnSaveToken}
      />
    );

    const tokenInput = screen.getByLabelText('GitHub Token');
    expect(tokenInput).toHaveAttribute('type', 'password');

    const visibilityButton = screen.getByRole('button', { name: '' }); // Icon button
    fireEvent.click(visibilityButton);

    expect(tokenInput).toHaveAttribute('type', 'text');
  });

  it('displays repositories tab with existing repositories', () => {
    renderWithTheme(
      <GitHubConfigPanel
        teacherId="teacher-456"
        repositories={mockRepositories}
        studentMappings={[]}
        onAddRepository={mockOnAddRepository}
        onRemoveRepository={mockOnRemoveRepository}
        onAddStudentMapping={mockOnAddStudentMapping}
        onRemoveStudentMapping={mockOnRemoveStudentMapping}
        onSaveToken={mockOnSaveToken}
      />
    );

    fireEvent.click(screen.getByText('Repositories'));

    expect(screen.getByText('Monitored Repositories (2)')).toBeInTheDocument();
    expect(screen.getByText('web-app-project')).toBeInTheDocument();
    expect(screen.getByText('api-backend')).toBeInTheDocument();
    expect(screen.getByText('teacher/web-app-project')).toBeInTheDocument();
    expect(screen.getByText('teacher/api-backend')).toBeInTheDocument();
  });

  it('shows repository sync status', () => {
    renderWithTheme(
      <GitHubConfigPanel
        teacherId="teacher-456"
        repositories={mockRepositories}
        studentMappings={[]}
        onAddRepository={mockOnAddRepository}
        onRemoveRepository={mockOnRemoveRepository}
        onAddStudentMapping={mockOnAddStudentMapping}
        onRemoveStudentMapping={mockOnRemoveStudentMapping}
        onSaveToken={mockOnSaveToken}
      />
    );

    fireEvent.click(screen.getByText('Repositories'));

    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText('syncing')).toBeInTheDocument();
  });

  it('opens add repository dialog', () => {
    renderWithTheme(
      <GitHubConfigPanel
        teacherId="teacher-456"
        repositories={[]}
        studentMappings={[]}
        onAddRepository={mockOnAddRepository}
        onRemoveRepository={mockOnRemoveRepository}
        onAddStudentMapping={mockOnAddStudentMapping}
        onRemoveStudentMapping={mockOnRemoveStudentMapping}
        onSaveToken={mockOnSaveToken}
      />
    );

    fireEvent.click(screen.getByText('Repositories'));
    fireEvent.click(screen.getByText('Add Repository'));

    expect(screen.getByText('Add Repository')).toBeInTheDocument();
    expect(screen.getByLabelText('Repository URL')).toBeInTheDocument();
    expect(screen.getByLabelText('Owner')).toBeInTheDocument();
    expect(screen.getByLabelText('Repository Name')).toBeInTheDocument();
  });

  it('parses repository URL automatically', () => {
    renderWithTheme(
      <GitHubConfigPanel
        teacherId="teacher-456"
        repositories={[]}
        studentMappings={[]}
        onAddRepository={mockOnAddRepository}
        onRemoveRepository={mockOnRemoveRepository}
        onAddStudentMapping={mockOnAddStudentMapping}
        onRemoveStudentMapping={mockOnRemoveStudentMapping}
        onSaveToken={mockOnSaveToken}
      />
    );

    fireEvent.click(screen.getByText('Repositories'));
    fireEvent.click(screen.getByText('Add Repository'));

    const urlInput = screen.getByLabelText('Repository URL');
    fireEvent.change(urlInput, { 
      target: { value: 'https://github.com/testowner/testrepo' } 
    });

    expect(screen.getByLabelText('Owner')).toHaveValue('testowner');
    expect(screen.getByLabelText('Repository Name')).toHaveValue('testrepo');
  });

  it('adds repository when form is submitted', () => {
    renderWithTheme(
      <GitHubConfigPanel
        teacherId="teacher-456"
        repositories={[]}
        studentMappings={[]}
        onAddRepository={mockOnAddRepository}
        onRemoveRepository={mockOnRemoveRepository}
        onAddStudentMapping={mockOnAddStudentMapping}
        onRemoveStudentMapping={mockOnRemoveStudentMapping}
        onSaveToken={mockOnSaveToken}
      />
    );

    fireEvent.click(screen.getByText('Repositories'));
    fireEvent.click(screen.getByText('Add Repository'));

    fireEvent.change(screen.getByLabelText('Repository URL'), {
      target: { value: 'https://github.com/testowner/testrepo' }
    });
    fireEvent.change(screen.getByLabelText('Owner'), {
      target: { value: 'testowner' }
    });
    fireEvent.change(screen.getByLabelText('Repository Name'), {
      target: { value: 'testrepo' }
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(mockOnAddRepository).toHaveBeenCalledWith({
      name: 'testrepo',
      fullName: 'testowner/testrepo',
      url: 'https://github.com/testowner/testrepo',
      owner: 'testowner',
      teacherId: 'teacher-456',
      isActive: true,
      syncStatus: 'pending'
    });
  });

  it('removes repository when delete button is clicked', () => {
    renderWithTheme(
      <GitHubConfigPanel
        teacherId="teacher-456"
        repositories={mockRepositories}
        studentMappings={[]}
        onAddRepository={mockOnAddRepository}
        onRemoveRepository={mockOnRemoveRepository}
        onAddStudentMapping={mockOnAddStudentMapping}
        onRemoveStudentMapping={mockOnRemoveStudentMapping}
        onSaveToken={mockOnSaveToken}
      />
    );

    fireEvent.click(screen.getByText('Repositories'));

    const deleteButtons = screen.getAllByLabelText(/delete/i);
    fireEvent.click(deleteButtons[0]);

    expect(mockOnRemoveRepository).toHaveBeenCalledWith('repo-1');
  });

  it('displays student mappings tab', () => {
    renderWithTheme(
      <GitHubConfigPanel
        teacherId="teacher-456"
        repositories={[]}
        studentMappings={mockStudentMappings}
        onAddRepository={mockOnAddRepository}
        onRemoveRepository={mockOnRemoveRepository}
        onAddStudentMapping={mockOnAddStudentMapping}
        onRemoveStudentMapping={mockOnRemoveStudentMapping}
        onSaveToken={mockOnSaveToken}
      />
    );

    fireEvent.click(screen.getByText('Student Mappings'));

    expect(screen.getByText('Student GitHub Mappings (2)')).toBeInTheDocument();
    expect(screen.getByText('alice_dev')).toBeInTheDocument();
    expect(screen.getByText('bob_coder')).toBeInTheDocument();
    expect(screen.getByText('Student ID: student-123')).toBeInTheDocument();
    expect(screen.getByText('Student ID: student-456')).toBeInTheDocument();
  });

  it('shows verification status for student mappings', () => {
    renderWithTheme(
      <GitHubConfigPanel
        teacherId="teacher-456"
        repositories={[]}
        studentMappings={mockStudentMappings}
        onAddRepository={mockOnAddRepository}
        onRemoveRepository={mockOnRemoveRepository}
        onAddStudentMapping={mockOnAddStudentMapping}
        onRemoveStudentMapping={mockOnRemoveStudentMapping}
        onSaveToken={mockOnSaveToken}
      />
    );

    fireEvent.click(screen.getByText('Student Mappings'));

    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('Unverified')).toBeInTheDocument();
  });

  it('opens add student mapping dialog', () => {
    renderWithTheme(
      <GitHubConfigPanel
        teacherId="teacher-456"
        repositories={[]}
        studentMappings={[]}
        onAddRepository={mockOnAddRepository}
        onRemoveRepository={mockOnRemoveRepository}
        onAddStudentMapping={mockOnAddStudentMapping}
        onRemoveStudentMapping={mockOnRemoveStudentMapping}
        onSaveToken={mockOnSaveToken}
      />
    );

    fireEvent.click(screen.getByText('Student Mappings'));
    fireEvent.click(screen.getByText('Add Mapping'));

    expect(screen.getByText('Add Student Mapping')).toBeInTheDocument();
    expect(screen.getByLabelText('Student ID')).toBeInTheDocument();
    expect(screen.getByLabelText('GitHub Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Verification Method')).toBeInTheDocument();
  });

  it('adds student mapping when form is submitted', () => {
    renderWithTheme(
      <GitHubConfigPanel
        teacherId="teacher-456"
        repositories={[]}
        studentMappings={[]}
        onAddRepository={mockOnAddRepository}
        onRemoveRepository={mockOnRemoveRepository}
        onAddStudentMapping={mockOnAddStudentMapping}
        onRemoveStudentMapping={mockOnRemoveStudentMapping}
        onSaveToken={mockOnSaveToken}
      />
    );

    fireEvent.click(screen.getByText('Student Mappings'));
    fireEvent.click(screen.getByText('Add Mapping'));

    fireEvent.change(screen.getByLabelText('Student ID'), {
      target: { value: 'student-789' }
    });
    fireEvent.change(screen.getByLabelText('GitHub Username'), {
      target: { value: 'new_student' }
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(mockOnAddStudentMapping).toHaveBeenCalledWith(
      expect.objectContaining({
        studentId: 'student-789',
        teacherId: 'teacher-456',
        githubUsername: 'new_student',
        isVerified: true,
        verificationMethod: 'manual'
      })
    );
  });

  it('opens bulk import dialog', () => {
    renderWithTheme(
      <GitHubConfigPanel
        teacherId="teacher-456"
        repositories={[]}
        studentMappings={[]}
        onAddRepository={mockOnAddRepository}
        onRemoveRepository={mockOnRemoveRepository}
        onAddStudentMapping={mockOnAddStudentMapping}
        onRemoveStudentMapping={mockOnRemoveStudentMapping}
        onSaveToken={mockOnSaveToken}
      />
    );

    fireEvent.click(screen.getByText('Student Mappings'));
    fireEvent.click(screen.getByText('Bulk Import'));

    expect(screen.getByText('Bulk Import Student Mappings')).toBeInTheDocument();
    expect(screen.getByLabelText('CSV Data')).toBeInTheDocument();
  });

  it('processes bulk import CSV data', () => {
    renderWithTheme(
      <GitHubConfigPanel
        teacherId="teacher-456"
        repositories={[]}
        studentMappings={[]}
        onAddRepository={mockOnAddRepository}
        onRemoveRepository={mockOnRemoveRepository}
        onAddStudentMapping={mockOnAddStudentMapping}
        onRemoveStudentMapping={mockOnRemoveStudentMapping}
        onSaveToken={mockOnSaveToken}
      />
    );

    fireEvent.click(screen.getByText('Student Mappings'));
    fireEvent.click(screen.getByText('Bulk Import'));

    const csvData = 'student_id,github_username\nstudent1,alice\nstudent2,bob';
    fireEvent.change(screen.getByLabelText('CSV Data'), {
      target: { value: csvData }
    });

    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    expect(mockOnAddStudentMapping).toHaveBeenCalledTimes(2);
    expect(mockOnAddStudentMapping).toHaveBeenCalledWith(
      expect.objectContaining({
        studentId: 'student1',
        githubUsername: 'alice'
      })
    );
    expect(mockOnAddStudentMapping).toHaveBeenCalledWith(
      expect.objectContaining({
        studentId: 'student2',
        githubUsername: 'bob'
      })
    );
  });

  it('displays settings tab with sync options', () => {
    renderWithTheme(
      <GitHubConfigPanel
        teacherId="teacher-456"
        repositories={[]}
        studentMappings={[]}
        onAddRepository={mockOnAddRepository}
        onRemoveRepository={mockOnRemoveRepository}
        onAddStudentMapping={mockOnAddStudentMapping}
        onRemoveStudentMapping={mockOnRemoveStudentMapping}
        onSaveToken={mockOnSaveToken}
      />
    );

    fireEvent.click(screen.getByText('Settings'));

    expect(screen.getByText('Sync Settings')).toBeInTheDocument();
    expect(screen.getByText('Auto-sync repositories')).toBeInTheDocument();
    expect(screen.getByText('Real-time webhooks')).toBeInTheDocument();
    expect(screen.getByText('Export/Import')).toBeInTheDocument();
  });

  it('exports configuration when export button is clicked', () => {
    // Mock URL.createObjectURL and related functions
    const mockCreateObjectURL = jest.fn(() => 'mock-url');
    const mockRevokeObjectURL = jest.fn();
    const mockClick = jest.fn();
    
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;
    
    // Mock document.createElement
    const mockAnchor = {
      href: '',
      download: '',
      click: mockClick
    };
    jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);

    renderWithTheme(
      <GitHubConfigPanel
        teacherId="teacher-456"
        repositories={mockRepositories}
        studentMappings={mockStudentMappings}
        onAddRepository={mockOnAddRepository}
        onRemoveRepository={mockOnRemoveRepository}
        onAddStudentMapping={mockOnAddStudentMapping}
        onRemoveStudentMapping={mockOnRemoveStudentMapping}
        onSaveToken={mockOnSaveToken}
      />
    );

    fireEvent.click(screen.getByText('Settings'));
    fireEvent.click(screen.getByText('Export Config'));

    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalled();
  });

  it('calls sync repositories when sync button is clicked', () => {
    renderWithTheme(
      <GitHubConfigPanel
        teacherId="teacher-456"
        repositories={[]}
        studentMappings={[]}
        onAddRepository={mockOnAddRepository}
        onRemoveRepository={mockOnRemoveRepository}
        onAddStudentMapping={mockOnAddStudentMapping}
        onRemoveStudentMapping={mockOnRemoveStudentMapping}
        onSaveToken={mockOnSaveToken}
        onSyncRepositories={mockOnSyncRepositories}
      />
    );

    fireEvent.click(screen.getByText('Sync All'));
    expect(mockOnSyncRepositories).toHaveBeenCalled();
  });

  it('shows error message when form validation fails', () => {
    renderWithTheme(
      <GitHubConfigPanel
        teacherId="teacher-456"
        repositories={[]}
        studentMappings={[]}
        onAddRepository={mockOnAddRepository}
        onRemoveRepository={mockOnRemoveRepository}
        onAddStudentMapping={mockOnAddStudentMapping}
        onRemoveStudentMapping={mockOnRemoveStudentMapping}
        onSaveToken={mockOnSaveToken}
      />
    );

    fireEvent.click(screen.getByText('Repositories'));
    fireEvent.click(screen.getByText('Add Repository'));
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByText('Please fill in all repository fields')).toBeInTheDocument();
  });

  it('shows success message after successful operations', () => {
    renderWithTheme(
      <GitHubConfigPanel
        teacherId="teacher-456"
        repositories={[]}
        studentMappings={[]}
        onAddRepository={mockOnAddRepository}
        onRemoveRepository={mockOnRemoveRepository}
        onAddStudentMapping={mockOnAddStudentMapping}
        onRemoveStudentMapping={mockOnRemoveStudentMapping}
        onSaveToken={mockOnSaveToken}
      />
    );

    fireEvent.click(screen.getByText('Repositories'));
    fireEvent.click(screen.getByText('Add Repository'));

    fireEvent.change(screen.getByLabelText('Repository URL'), {
      target: { value: 'https://github.com/test/repo' }
    });
    fireEvent.change(screen.getByLabelText('Owner'), {
      target: { value: 'test' }
    });
    fireEvent.change(screen.getByLabelText('Repository Name'), {
      target: { value: 'repo' }
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByText('Repository added successfully!')).toBeInTheDocument();
  });

  it('handles token connection failure', async () => {
    mockOnTestConnection.mockResolvedValue(false);

    renderWithTheme(
      <GitHubConfigPanel
        teacherId="teacher-456"
        repositories={[]}
        studentMappings={[]}
        onAddRepository={mockOnAddRepository}
        onRemoveRepository={mockOnRemoveRepository}
        onAddStudentMapping={mockOnAddStudentMapping}
        onRemoveStudentMapping={mockOnRemoveStudentMapping}
        onSaveToken={mockOnSaveToken}
        onTestConnection={mockOnTestConnection}
      />
    );

    fireEvent.change(screen.getByLabelText('GitHub Token'), {
      target: { value: 'invalid_token' }
    });
    fireEvent.click(screen.getByText('Test Connection'));

    await waitFor(() => {
      expect(screen.getByText('Invalid Token')).toBeInTheDocument();
    });
  });
});