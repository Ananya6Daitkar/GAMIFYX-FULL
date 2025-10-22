/**
 * Notification Center Component - Shows notifications with real-time updates
 */

import React, { useState } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  // MenuItem,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Button,
  Divider,
  Tooltip
} from '@mui/material';
import {
  Notifications,
  NotificationsActive,
  EmojiEvents,
  TrendingUp,
  Assignment,
  Feedback,
  Star,
  MarkEmailRead
} from '@mui/icons-material';
import { NotificationMessage } from '../../types';

interface NotificationCenterProps {
  notifications: NotificationMessage[];
  onMarkAsRead: (notificationIds: string[]) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  onMarkAsRead
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const unreadNotifications = notifications.filter(n => !n.isRead);
  const unreadCount = unreadNotifications.length;

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAllAsRead = () => {
    const unreadIds = unreadNotifications.map(n => n.id);
    if (unreadIds.length > 0) {
      onMarkAsRead(unreadIds);
    }
  };

  const handleMarkAsRead = (notificationId: string) => {
    onMarkAsRead([notificationId]);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'badge':
        return <EmojiEvents color="warning" />;
      case 'achievement':
        return <Star color="success" />;
      case 'level_up':
        return <TrendingUp color="primary" />;
      case 'milestone':
        return <EmojiEvents color="secondary" />;
      case 'feedback':
        return <Feedback color="info" />;
      default:
        return <Assignment />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'badge':
        return 'warning';
      case 'achievement':
        return 'success';
      case 'level_up':
        return 'primary';
      case 'milestone':
        return 'secondary';
      case 'feedback':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffMinutes = Math.ceil(diffTime / (1000 * 60));
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          onClick={handleClick}
          color={unreadCount > 0 ? 'primary' : 'default'}
        >
          <Badge badgeContent={unreadCount} color="error">
            {unreadCount > 0 ? <NotificationsActive /> : <Notifications />}
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 500,
            overflow: 'visible'
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* Header */}
        <Box sx={{ p: 2, pb: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Notifications
            </Typography>
            {unreadCount > 0 && (
              <Button
                size="small"
                startIcon={<MarkEmailRead />}
                onClick={handleMarkAllAsRead}
              >
                Mark all read
              </Button>
            )}
          </Box>
          {unreadCount > 0 && (
            <Typography variant="caption" color="text.secondary">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </Typography>
          )}
        </Box>

        <Divider />

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No notifications yet
            </Typography>
          </Box>
        ) : (
          <List sx={{ maxHeight: 350, overflow: 'auto', p: 0 }}>
            {notifications.slice(0, 10).map((notification) => (
              <ListItem
                key={notification.id}
                sx={{
                  bgcolor: notification.isRead ? 'transparent' : 'action.hover',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'action.selected'
                  }
                }}
                onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
              >
                <ListItemAvatar>
                  <Avatar
                    sx={{
                      bgcolor: `${getNotificationColor(notification.type)}.main`,
                      width: 32,
                      height: 32
                    }}
                  >
                    {getNotificationIcon(notification.type)}
                  </Avatar>
                </ListItemAvatar>
                
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography
                        variant="subtitle2"
                        fontWeight={notification.isRead ? 'normal' : 'bold'}
                      >
                        {notification.title}
                      </Typography>
                      {!notification.isRead && (
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: 'primary.main'
                          }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {notification.message}
                      </Typography>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mt={0.5}>
                        <Chip
                          size="small"
                          label={notification.type}
                          color={getNotificationColor(notification.type) as any}
                          variant="outlined"
                          sx={{ height: 16, fontSize: '0.6rem' }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {formatTimeAgo(notification.createdAt)}
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}

        {notifications.length > 10 && (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Button size="small" color="primary">
              View All Notifications
            </Button>
          </Box>
        )}
      </Menu>
    </>
  );
};

export default NotificationCenter;