import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export const useAppStore = create(
  subscribeWithSelector((set, get) => ({
    // User state
    user: null,
    setUser: (user) => set({ user }),
    
    // Connection state
    connected: false,
    setConnected: (connected) => set({ connected }),
    
    // Notifications
    notifications: [],
    addNotification: (notification) => set((state) => ({
      notifications: [...state.notifications, notification]
    })),
    removeNotification: (id) => set((state) => ({
      notifications: state.notifications.filter(n => n.id !== id)
    })),
    clearNotifications: () => set({ notifications: [] }),
    
    // Dashboard data
    dashboardData: null,
    setDashboardData: (data) => set({ dashboardData: data }),
    
    // Leaderboard
    leaderboard: [],
    setLeaderboard: (leaderboard) => set({ leaderboard }),
    
    // Achievements
    achievements: [],
    setAchievements: (achievements) => set({ achievements }),
    
    // Submissions
    submissions: [],
    setSubmissions: (submissions) => set({ submissions }),
    
    // Analytics
    analytics: null,
    setAnalytics: (analytics) => set({ analytics }),
    
    // AI Feedback
    aiFeedback: [],
    setAiFeedback: (feedback) => set({ aiFeedback: feedback }),
    
    // Competitions
    competitions: [],
    setCompetitions: (competitions) => set({ competitions }),
    
    // Settings
    settings: {
      theme: 'cyberpunk',
      notifications: true,
      soundEffects: false,
      animations: true,
      language: 'en'
    },
    updateSettings: (newSettings) => set((state) => ({
      settings: { ...state.settings, ...newSettings }
    })),
    
    // Loading states
    loading: {
      dashboard: false,
      submissions: false,
      leaderboard: false,
      achievements: false,
      analytics: false,
      aiFeedback: false,
      competitions: false
    },
    setLoading: (key, value) => set((state) => ({
      loading: { ...state.loading, [key]: value }
    })),
    
    // Error states
    errors: {},
    setError: (key, error) => set((state) => ({
      errors: { ...state.errors, [key]: error }
    })),
    clearError: (key) => set((state) => {
      const newErrors = { ...state.errors };
      delete newErrors[key];
      return { errors: newErrors };
    }),
    
    // UI state
    sidebarOpen: false,
    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    
    // Modal state
    modals: {},
    openModal: (modalId, data = null) => set((state) => ({
      modals: { ...state.modals, [modalId]: { open: true, data } }
    })),
    closeModal: (modalId) => set((state) => ({
      modals: { ...state.modals, [modalId]: { open: false, data: null } }
    })),
    
    // Search state
    searchQuery: '',
    setSearchQuery: (query) => set({ searchQuery: query }),
    
    // Filters
    filters: {},
    setFilter: (key, value) => set((state) => ({
      filters: { ...state.filters, [key]: value }
    })),
    clearFilters: () => set({ filters: {} }),
  }))
);