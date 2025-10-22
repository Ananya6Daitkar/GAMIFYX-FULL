/**
 * Real-Time Updates Component - Shows WebSocket connection status and handles reconnection
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  Typography
} from '@mui/material';
import {
  Wifi,
  WifiOff,
  Refresh,
  Circle
} from '@mui/icons-material';
import { webSocketService } from '../../services/websocket';

interface RealTimeUpdatesProps {
  isConnected: boolean;
  onReconnect: () => void;
}

const RealTimeUpdates: React.FC<RealTimeUpdatesProps> = ({
  isConnected,
  onReconnect
}) => {
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [showConnectionAlert, setShowConnectionAlert] = useState(false);
  const [lastConnectionChange, setLastConnectionChange] = useState<Date>(new Date());

  useEffect(() => {
    const handleConnect = () => {
      setConnectionStatus('connected');
      setLastConnectionChange(new Date());
      if (!isConnected) {
        setShowConnectionAlert(true);
      }
    };

    const handleDisconnect = () => {
      setConnectionStatus('disconnected');
      setLastConnectionChange(new Date());
      setShowConnectionAlert(true);
    };

    const handleConnecting = () => {
      setConnectionStatus('connecting');
      setLastConnectionChange(new Date());
    };

    // Listen to WebSocket events
    webSocketService.on('connect', handleConnect);
    webSocketService.on('disconnect', handleDisconnect);
    webSocketService.on('connecting', handleConnecting);

    // Set initial status
    setConnectionStatus(isConnected ? 'connected' : 'disconnected');

    return () => {
      webSocketService.off('connect', handleConnect);
      webSocketService.off('disconnect', handleDisconnect);
      webSocketService.off('connecting', handleConnecting);
    };
  }, [isConnected]);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'success';
      case 'disconnected':
        return 'error';
      case 'connecting':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi />;
      case 'disconnected':
        return <WifiOff />;
      case 'connecting':
        return <Circle sx={{ animation: 'pulse 1.5s infinite' }} />;
      default:
        return <WifiOff />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Real-time updates active';
      case 'disconnected':
        return 'Real-time updates offline';
      case 'connecting':
        return 'Connecting...';
      default:
        return 'Unknown status';
    }
  };

  const handleReconnect = () => {
    setConnectionStatus('connecting');
    onReconnect();
  };

  const handleCloseAlert = () => {
    setShowConnectionAlert(false);
  };

  const formatLastUpdate = () => {
    const now = new Date();
    const diff = now.getTime() - lastConnectionChange.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s ago`;
    }
    return `${seconds}s ago`;
  };

  return (
    <>
      {/* Connection Status Indicator */}
      <Box
        position="fixed"
        bottom={16}
        left={16}
        zIndex={1000}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          px: 2,
          py: 1,
          boxShadow: 2
        }}
      >
        <Tooltip title={getStatusText()}>
          <Chip
            icon={getStatusIcon()}
            label={connectionStatus}
            color={getStatusColor() as any}
            size="small"
            variant="outlined"
          />
        </Tooltip>

        {connectionStatus === 'disconnected' && (
          <Tooltip title="Reconnect">
            <IconButton size="small" onClick={handleReconnect}>
              <Refresh />
            </IconButton>
          </Tooltip>
        )}

        <Typography variant="caption" color="text.secondary">
          {formatLastUpdate()}
        </Typography>
      </Box>

      {/* Connection Status Alerts */}
      <Snackbar
        open={showConnectionAlert}
        autoHideDuration={4000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseAlert}
          severity={connectionStatus === 'connected' ? 'success' : 'warning'}
          variant="filled"
        >
          {connectionStatus === 'connected'
            ? '🎉 Real-time updates reconnected! You\'ll now receive live notifications.'
            : '⚠️ Real-time updates disconnected. Some features may not work properly.'
          }
        </Alert>
      </Snackbar>

      {/* Styles for pulse animation */}
      <style>
        {`
          @keyframes pulse {
            0% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
            100% {
              opacity: 1;
            }
          }
        `}
      </style>
    </>
  );
};

export default RealTimeUpdates;