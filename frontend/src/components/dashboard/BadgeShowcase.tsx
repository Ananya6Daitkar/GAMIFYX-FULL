/**
 * Badge Showcase Component - Displays earned badges with categories and rarity
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Chip,
  Avatar,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Badge as MuiBadge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider
} from '@mui/material';
import {
  EmojiEvents,
  Security,
  Speed,
  Group,
  School,
  Star,
  WorkspacePremium
} from '@mui/icons-material';
import { Badge, BadgeCategory, BadgeRarity } from '../../types';

interface BadgeShowcaseProps {
  badges: Badge[];
}

const BadgeShowcase: React.FC<BadgeShowcaseProps> = ({ badges }) => {
  const [selectedCategory, setSelectedCategory] = useState<BadgeCategory | 'all'>('all');
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  const getCategoryIcon = (category: BadgeCategory) => {
    switch (category) {
      case BadgeCategory.CODING:
        return <School />;
      case BadgeCategory.SECURITY:
        return <Security />;
      case BadgeCategory.PERFORMANCE:
        return <Speed />;
      case BadgeCategory.COLLABORATION:
        return <Group />;
      case BadgeCategory.LEARNING:
        return <School />;
      case BadgeCategory.MILESTONE:
        return <EmojiEvents />;
      case BadgeCategory.SPECIAL:
        return <Star />;
      default:
        return <WorkspacePremium />;
    }
  };

  const getRarityColor = (rarity: BadgeRarity) => {
    switch (rarity) {
      case BadgeRarity.COMMON:
        return '#9E9E9E';
      case BadgeRarity.UNCOMMON:
        return '#4CAF50';
      case BadgeRarity.RARE:
        return '#2196F3';
      case BadgeRarity.EPIC:
        return '#9C27B0';
      case BadgeRarity.LEGENDARY:
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  const getRarityGlow = (rarity: BadgeRarity) => {
    const color = getRarityColor(rarity);
    return `0 0 20px ${color}40`;
  };

  const handleCategoryChange = (
    _event: React.MouseEvent<HTMLElement>,
    newCategory: BadgeCategory | 'all' | null
  ) => {
    if (newCategory !== null) {
      setSelectedCategory(newCategory);
    }
  };

  const filteredBadges = selectedCategory === 'all' 
    ? badges 
    : badges.filter(badge => badge.category === selectedCategory);

  const badgesByCategory = badges.reduce((acc, badge) => {
    acc[badge.category] = (acc[badge.category] || 0) + 1;
    return acc;
  }, {} as Record<BadgeCategory, number>);

  const badgesByRarity = badges.reduce((acc, badge) => {
    acc[badge.rarity] = (acc[badge.rarity] || 0) + 1;
    return acc;
  }, {} as Record<BadgeRarity, number>);

  return (
    <>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Badge Collection ({badges.length})
          </Typography>

          {/* Category Filter */}
          <Box mb={3}>
            <ToggleButtonGroup
              value={selectedCategory}
              exclusive
              onChange={handleCategoryChange}
              size="small"
              sx={{ flexWrap: 'wrap' }}
            >
              <ToggleButton value="all">All</ToggleButton>
              {Object.values(BadgeCategory).map(category => (
                <ToggleButton key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          {/* Badge Grid */}
          <Grid container spacing={2} mb={3}>
            {filteredBadges.map((badge) => (
              <Grid item xs={6} sm={4} md={3} key={badge.id}>
                <Tooltip title={badge.description}>
                  <Card
                    variant="outlined"
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: getRarityGlow(badge.rarity),
                        borderColor: getRarityColor(badge.rarity)
                      }
                    }}
                    onClick={() => setSelectedBadge(badge)}
                  >
                    <CardContent sx={{ textAlign: 'center', p: 2 }}>
                      <MuiBadge
                        badgeContent={badge.points}
                        color="primary"
                        anchorOrigin={{
                          vertical: 'top',
                          horizontal: 'right',
                        }}
                      >
                        <Avatar
                          sx={{
                            width: 60,
                            height: 60,
                            bgcolor: getRarityColor(badge.rarity),
                            mx: 'auto',
                            mb: 1,
                            boxShadow: getRarityGlow(badge.rarity)
                          }}
                        >
                          {getCategoryIcon(badge.category)}
                        </Avatar>
                      </MuiBadge>
                      
                      <Typography variant="caption" display="block" fontWeight="bold">
                        {badge.name}
                      </Typography>
                      
                      <Chip
                        size="small"
                        label={badge.rarity}
                        sx={{
                          bgcolor: getRarityColor(badge.rarity),
                          color: 'white',
                          fontSize: '0.6rem',
                          height: 16,
                          mt: 0.5
                        }}
                      />
                      
                      {badge.earnedAt && (
                        <Typography variant="caption" display="block" color="text.secondary" mt={0.5}>
                          {new Date(badge.earnedAt).toLocaleDateString()}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Tooltip>
              </Grid>
            ))}
          </Grid>

          {filteredBadges.length === 0 && (
            <Box textAlign="center" py={4}>
              <Typography variant="body2" color="text.secondary">
                {selectedCategory === 'all' 
                  ? 'No badges earned yet. Keep learning to unlock your first badge!'
                  : `No ${selectedCategory} badges earned yet.`
                }
              </Typography>
            </Box>
          )}

          {/* Statistics */}
          {badges.length > 0 && (
            <Box>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Collection Statistics
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">
                    By Category
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
                    {Object.entries(badgesByCategory).map(([category, count]) => (
                      <Chip
                        key={category}
                        size="small"
                        label={`${category}: ${count}`}
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">
                    By Rarity
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
                    {Object.entries(badgesByRarity).map(([rarity, count]) => (
                      <Chip
                        key={rarity}
                        size="small"
                        label={`${rarity}: ${count}`}
                        sx={{
                          bgcolor: getRarityColor(rarity as BadgeRarity),
                          color: 'white'
                        }}
                      />
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Badge Detail Dialog */}
      <Dialog
        open={!!selectedBadge}
        onClose={() => setSelectedBadge(null)}
        maxWidth="sm"
        fullWidth
      >
        {selectedBadge && (
          <>
            <DialogTitle sx={{ textAlign: 'center' }}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: getRarityColor(selectedBadge.rarity),
                  mx: 'auto',
                  mb: 2,
                  boxShadow: getRarityGlow(selectedBadge.rarity)
                }}
              >
                {getCategoryIcon(selectedBadge.category)}
              </Avatar>
              <Typography variant="h5" gutterBottom>
                {selectedBadge.name}
              </Typography>
              <Chip
                label={selectedBadge.rarity}
                sx={{
                  bgcolor: getRarityColor(selectedBadge.rarity),
                  color: 'white'
                }}
              />
            </DialogTitle>
            
            <DialogContent>
              <Typography variant="body1" paragraph>
                {selectedBadge.description}
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Category
                  </Typography>
                  <Typography variant="body2">
                    {selectedBadge.category.charAt(0).toUpperCase() + selectedBadge.category.slice(1)}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Points
                  </Typography>
                  <Typography variant="body2">
                    {selectedBadge.points}
                  </Typography>
                </Grid>
                
                {selectedBadge.earnedAt && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Earned On
                    </Typography>
                    <Typography variant="body2">
                      {new Date(selectedBadge.earnedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            
            <DialogActions>
              <Button onClick={() => setSelectedBadge(null)}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
};

export default BadgeShowcase;