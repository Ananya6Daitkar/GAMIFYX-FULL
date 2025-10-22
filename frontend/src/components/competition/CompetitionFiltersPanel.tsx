import React from 'react';
import {
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Button,
  Typography
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { 
  CompetitionFilters, 
  CompetitionType, 
  CompetitionStatus 
} from '../../types/competition';

interface CompetitionFiltersPanelProps {
  filters: CompetitionFilters;
  onFiltersChange: (filters: CompetitionFilters) => void;
}

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const CompetitionFiltersPanel: React.FC<CompetitionFiltersPanelProps> = ({
  filters,
  onFiltersChange
}) => {
  const theme = useTheme();

  const competitionTypes = [
    { value: CompetitionType.HACKTOBERFEST, label: '🎃 Hacktoberfest' },
    { value: CompetitionType.GITHUB_GAME_OFF, label: '🎮 GitHub Game Off' },
    { value: CompetitionType.GITLAB_HACKATHON, label: '🦊 GitLab Hackathon' },
    { value: CompetitionType.OPEN_SOURCE_CHALLENGE, label: '🌟 Open Source Challenge' },
    { value: CompetitionType.CUSTOM_COMPETITION, label: '🏆 Custom Competition' }
  ];

  const competitionStatuses = [
    { value: CompetitionStatus.UPCOMING, label: '⏳ Upcoming' },
    { value: CompetitionStatus.ACTIVE, label: '🔥 Active' },
    { value: CompetitionStatus.COMPLETED, label: '✅ Completed' },
    { value: CompetitionStatus.CANCELLED, label: '❌ Cancelled' }
  ];

  const difficultyLevels = [
    { value: 'beginner', label: '🟢 Beginner' },
    { value: 'intermediate', label: '🟡 Intermediate' },
    { value: 'advanced', label: '🟠 Advanced' },
    { value: 'expert', label: '🔴 Expert' }
  ];

  const popularTags = [
    'open-source',
    'hacktoberfest',
    'github',
    'gitlab',
    'programming',
    'web-development',
    'mobile',
    'ai-ml',
    'blockchain',
    'game-development',
    'documentation',
    'bug-fixes',
    'features',
    'community'
  ];

  const categories = [
    'Programming',
    'Open Source',
    'Game Development',
    'Web Development',
    'Mobile Development',
    'AI/ML',
    'Blockchain',
    'DevOps',
    'Security',
    'Documentation',
    'Community',
    'Education'
  ];

  const handleTypeChange = (event: any) => {
    const value = event.target.value;
    onFiltersChange({
      ...filters,
      type: typeof value === 'string' ? value.split(',') : value
    });
  };

  const handleStatusChange = (event: any) => {
    const value = event.target.value;
    onFiltersChange({
      ...filters,
      status: typeof value === 'string' ? value.split(',') : value
    });
  };

  const handleDifficultyChange = (event: any) => {
    const value = event.target.value;
    onFiltersChange({
      ...filters,
      difficultyLevel: typeof value === 'string' ? value.split(',') : value
    });
  };

  const handleTagsChange = (event: any) => {
    const value = event.target.value;
    onFiltersChange({
      ...filters,
      tags: typeof value === 'string' ? value.split(',') : value
    });
  };

  const handleCategoriesChange = (event: any) => {
    const value = event.target.value;
    onFiltersChange({
      ...filters,
      categories: typeof value === 'string' ? value.split(',') : value
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some(filter => 
    Array.isArray(filter) ? filter.length > 0 : filter !== undefined
  );

  return (
    <Box sx={{ p: 2, backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          🔍 Filter Competitions
        </Typography>
        {hasActiveFilters && (
          <Button
            variant="outlined"
            size="small"
            onClick={clearFilters}
            sx={{ 
              borderColor: theme.palette.error.main,
              color: theme.palette.error.main,
              '&:hover': {
                borderColor: theme.palette.error.dark,
                backgroundColor: 'rgba(255, 0, 0, 0.1)'
              }
            }}
          >
            Clear All
          </Button>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* Competition Type */}
        <Grid item xs={12} sm={6} md={4}>
          <FormControl fullWidth>
            <InputLabel>Competition Type</InputLabel>
            <Select
              multiple
              value={filters.type || []}
              onChange={handleTypeChange}
              input={<OutlinedInput label="Competition Type" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => {
                    const type = competitionTypes.find(t => t.value === value);
                    return (
                      <Chip
                        key={value}
                        label={type?.label || value}
                        size="small"
                        sx={{
                          backgroundColor: theme.palette.primary.main,
                          color: 'white'
                        }}
                      />
                    );
                  })}
                </Box>
              )}
              MenuProps={MenuProps}
            >
              {competitionTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  <Checkbox checked={(filters.type || []).indexOf(type.value) > -1} />
                  <ListItemText primary={type.label} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Status */}
        <Grid item xs={12} sm={6} md={4}>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              multiple
              value={filters.status || []}
              onChange={handleStatusChange}
              input={<OutlinedInput label="Status" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => {
                    const status = competitionStatuses.find(s => s.value === value);
                    return (
                      <Chip
                        key={value}
                        label={status?.label || value}
                        size="small"
                        sx={{
                          backgroundColor: theme.palette.secondary.main,
                          color: 'white'
                        }}
                      />
                    );
                  })}
                </Box>
              )}
              MenuProps={MenuProps}
            >
              {competitionStatuses.map((status) => (
                <MenuItem key={status.value} value={status.value}>
                  <Checkbox checked={(filters.status || []).indexOf(status.value) > -1} />
                  <ListItemText primary={status.label} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Difficulty Level */}
        <Grid item xs={12} sm={6} md={4}>
          <FormControl fullWidth>
            <InputLabel>Difficulty</InputLabel>
            <Select
              multiple
              value={filters.difficultyLevel || []}
              onChange={handleDifficultyChange}
              input={<OutlinedInput label="Difficulty" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => {
                    const difficulty = difficultyLevels.find(d => d.value === value);
                    return (
                      <Chip
                        key={value}
                        label={difficulty?.label || value}
                        size="small"
                        sx={{
                          backgroundColor: theme.palette.warning.main,
                          color: 'white'
                        }}
                      />
                    );
                  })}
                </Box>
              )}
              MenuProps={MenuProps}
            >
              {difficultyLevels.map((difficulty) => (
                <MenuItem key={difficulty.value} value={difficulty.value}>
                  <Checkbox checked={(filters.difficultyLevel || []).indexOf(difficulty.value) > -1} />
                  <ListItemText primary={difficulty.label} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Tags */}
        <Grid item xs={12} sm={6} md={4}>
          <FormControl fullWidth>
            <InputLabel>Tags</InputLabel>
            <Select
              multiple
              value={filters.tags || []}
              onChange={handleTagsChange}
              input={<OutlinedInput label="Tags" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip
                      key={value}
                      label={value}
                      size="small"
                      sx={{
                        backgroundColor: theme.palette.info.main,
                        color: 'white'
                      }}
                    />
                  ))}
                </Box>
              )}
              MenuProps={MenuProps}
            >
              {popularTags.map((tag) => (
                <MenuItem key={tag} value={tag}>
                  <Checkbox checked={(filters.tags || []).indexOf(tag) > -1} />
                  <ListItemText primary={tag} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Categories */}
        <Grid item xs={12} sm={6} md={4}>
          <FormControl fullWidth>
            <InputLabel>Categories</InputLabel>
            <Select
              multiple
              value={filters.categories || []}
              onChange={handleCategoriesChange}
              input={<OutlinedInput label="Categories" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip
                      key={value}
                      label={value}
                      size="small"
                      sx={{
                        backgroundColor: theme.palette.success.main,
                        color: 'white'
                      }}
                    />
                  ))}
                </Box>
              )}
              MenuProps={MenuProps}
            >
              {categories.map((category) => (
                <MenuItem key={category} value={category}>
                  <Checkbox checked={(filters.categories || []).indexOf(category) > -1} />
                  <ListItemText primary={category} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <Box sx={{ mt: 3, p: 2, backgroundColor: 'rgba(0, 255, 255, 0.1)', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Active Filters:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {filters.type?.map(type => (
              <Chip
                key={`type-${type}`}
                label={`Type: ${competitionTypes.find(t => t.value === type)?.label || type}`}
                size="small"
                onDelete={() => {
                  const newTypes = filters.type?.filter(t => t !== type) || [];
                  onFiltersChange({ ...filters, type: newTypes.length > 0 ? newTypes : undefined });
                }}
                sx={{ backgroundColor: theme.palette.primary.main, color: 'white' }}
              />
            ))}
            {filters.status?.map(status => (
              <Chip
                key={`status-${status}`}
                label={`Status: ${competitionStatuses.find(s => s.value === status)?.label || status}`}
                size="small"
                onDelete={() => {
                  const newStatuses = filters.status?.filter(s => s !== status) || [];
                  onFiltersChange({ ...filters, status: newStatuses.length > 0 ? newStatuses : undefined });
                }}
                sx={{ backgroundColor: theme.palette.secondary.main, color: 'white' }}
              />
            ))}
            {filters.difficultyLevel?.map(level => (
              <Chip
                key={`difficulty-${level}`}
                label={`Difficulty: ${difficultyLevels.find(d => d.value === level)?.label || level}`}
                size="small"
                onDelete={() => {
                  const newLevels = filters.difficultyLevel?.filter(l => l !== level) || [];
                  onFiltersChange({ ...filters, difficultyLevel: newLevels.length > 0 ? newLevels : undefined });
                }}
                sx={{ backgroundColor: theme.palette.warning.main, color: 'white' }}
              />
            ))}
            {filters.tags?.map(tag => (
              <Chip
                key={`tag-${tag}`}
                label={`Tag: ${tag}`}
                size="small"
                onDelete={() => {
                  const newTags = filters.tags?.filter(t => t !== tag) || [];
                  onFiltersChange({ ...filters, tags: newTags.length > 0 ? newTags : undefined });
                }}
                sx={{ backgroundColor: theme.palette.info.main, color: 'white' }}
              />
            ))}
            {filters.categories?.map(category => (
              <Chip
                key={`category-${category}`}
                label={`Category: ${category}`}
                size="small"
                onDelete={() => {
                  const newCategories = filters.categories?.filter(c => c !== category) || [];
                  onFiltersChange({ ...filters, categories: newCategories.length > 0 ? newCategories : undefined });
                }}
                sx={{ backgroundColor: theme.palette.success.main, color: 'white' }}
              />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default CompetitionFiltersPanel;