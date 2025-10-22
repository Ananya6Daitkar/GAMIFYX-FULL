import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/appStore';
import './NotificationSystem.css';

const NotificationSystem = ({ notifications }) => {
  const { removeNotification } = useAppStore();

  useEffect(() => {
    notifications.forEach(notification => {
      if (notification.id) {
        const timer = setTimeout(() => {
          removeNotification(notification.id);
        }, 5000);

        return () => clearTimeout(timer);
      }
    });
  }, [notifications, removeNotification]);

  return (
    <div className="notification-system">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            className={`notification notification-${notification.type}`}
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={() => removeNotification(notification.id)}
          >
            <div className="notification-content">
              <div className="notification-icon">
                {notification.icon || getDefaultIcon(notification.type)}
              </div>
              <div className="notification-text">
                <div className="notification-title">
                  {notification.title}
                </div>
                <div className="notification-message">
                  {notification.message}
                </div>
              </div>
              <button 
                className="notification-close"
                onClick={(e) => {
                  e.stopPropagation();
                  removeNotification(notification.id);
                }}
              >
                ✕
              </button>
            </div>
            <motion.div
              className="notification-progress"
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 5, ease: "linear" }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

const getDefaultIcon = (type) => {
  switch (type) {
    case 'achievement':
      return '🏆';
    case 'success':
      return '✅';
    case 'warning':
      return '⚠️';
    case 'error':
      return '❌';
    case 'info':
      return 'ℹ️';
    default:
      return '🔔';
  }
};

export default NotificationSystem;