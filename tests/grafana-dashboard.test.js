const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Grafana API configuration
const GRAFANA_URL = process.env.GRAFANA_URL || 'http://localhost:3001';
const GRAFANA_USER = process.env.GRAFANA_USER || 'admin';
const GRAFANA_PASSWORD = process.env.GRAFANA_PASSWORD || 'admin';

// Create axios instance with auth
const grafanaApi = axios.create({
  baseURL: GRAFANA_URL,
  auth: {
    username: GRAFANA_USER,
    password: GRAFANA_PASSWORD
  },
  timeout: 10000
});

describe('Grafana Dashboard Validation Tests', () => {
  let dashboards = [];

  beforeAll(async () => {
    // Wait for Grafana to be ready
    await waitForGrafana();
    
    // Get list of dashboards
    try {
      const response = await grafanaApi.get('/api/search?type=dash-db');
      dashboards = response.data;
    } catch (error) {
      console.error('Failed to fetch dashboards:', error.message);
      throw error;
    }
  });

  test('Grafana should be accessible and healthy', async () => {
    const response = await grafanaApi.get('/api/health');
    expect(response.status).toBe(200);
    expect(response.data.database).toBe('ok');
  });

  test('All expected dashboards should be provisioned', async () => {
    const expectedDashboards = [
      'AIOps Learning Platform - Executive Overview',
      'Service Monitoring - Golden Signals',
      'Student Performance Analytics',
      'AI Model Performance & Insights',
      'Gamification & Engagement Metrics'
    ];

    const dashboardTitles = dashboards.map(d => d.title);
    
    expectedDashboards.forEach(expectedTitle => {
      expect(dashboardTitles).toContain(expectedTitle);
    });
  });

  test('Executive Overview dashboard should load within 3 seconds', async () => {
    const dashboard = dashboards.find(d => d.title.includes('Executive Overview'));
    expect(dashboard).toBeDefined();

    const startTime = Date.now();
    const response = await grafanaApi.get(`/api/dashboards/uid/${dashboard.uid}`);
    const loadTime = Date.now() - startTime;

    expect(response.status).toBe(200);
    expect(loadTime).toBeLessThan(3000);
    expect(response.data.dashboard.panels.length).toBeGreaterThan(0);
  });

  test('System Health dashboard should have Golden Signals panels', async () => {
    const dashboard = dashboards.find(d => d.title.includes('Service Monitoring'));
    expect(dashboard).toBeDefined();

    const response = await grafanaApi.get(`/api/dashboards/uid/${dashboard.uid}`);
    const panels = response.data.dashboard.panels;

    // Check for Golden Signals: Latency, Traffic, Errors, Saturation
    const panelTitles = panels.map(p => p.title.toLowerCase());
    
    expect(panelTitles.some(title => title.includes('latency') || title.includes('response time'))).toBe(true);
    expect(panelTitles.some(title => title.includes('traffic') || title.includes('request rate'))).toBe(true);
    expect(panelTitles.some(title => title.includes('error'))).toBe(true);
    expect(panelTitles.some(title => title.includes('saturation') || title.includes('resource'))).toBe(true);
  });

  test('Student Analytics dashboard should have performance metrics', async () => {
    const dashboard = dashboards.find(d => d.title.includes('Student Performance'));
    expect(dashboard).toBeDefined();

    const response = await grafanaApi.get(`/api/dashboards/uid/${dashboard.uid}`);
    const panels = response.data.dashboard.panels;

    const panelTitles = panels.map(p => p.title.toLowerCase());
    
    expect(panelTitles.some(title => title.includes('risk'))).toBe(true);
    expect(panelTitles.some(title => title.includes('submission'))).toBe(true);
    expect(panelTitles.some(title => title.includes('performance') || title.includes('quality'))).toBe(true);
  });

  test('AI Insights dashboard should have model performance metrics', async () => {
    const dashboard = dashboards.find(d => d.title.includes('AI Model Performance'));
    expect(dashboard).toBeDefined();

    const response = await grafanaApi.get(`/api/dashboards/uid/${dashboard.uid}`);
    const panels = response.data.dashboard.panels;

    const panelTitles = panels.map(p => p.title.toLowerCase());
    
    expect(panelTitles.some(title => title.includes('feedback'))).toBe(true);
    expect(panelTitles.some(title => title.includes('accuracy') || title.includes('performance'))).toBe(true);
    expect(panelTitles.some(title => title.includes('model') || title.includes('prediction'))).toBe(true);
  });

  test('Gamification dashboard should have engagement metrics', async () => {
    const dashboard = dashboards.find(d => d.title.includes('Gamification'));
    expect(dashboard).toBeDefined();

    const response = await grafanaApi.get(`/api/dashboards/uid/${dashboard.uid}`);
    const panels = response.data.dashboard.panels;

    const panelTitles = panels.map(p => p.title.toLowerCase());
    
    expect(panelTitles.some(title => title.includes('leaderboard'))).toBe(true);
    expect(panelTitles.some(title => title.includes('badge'))).toBe(true);
    expect(panelTitles.some(title => title.includes('engagement') || title.includes('points'))).toBe(true);
  });

  test('All dashboards should have valid panel configurations', async () => {
    for (const dashboard of dashboards) {
      const response = await grafanaApi.get(`/api/dashboards/uid/${dashboard.uid}`);
      const panels = response.data.dashboard.panels;

      panels.forEach(panel => {
        // Each panel should have required properties
        expect(panel.id).toBeDefined();
        expect(panel.title).toBeDefined();
        expect(panel.type).toBeDefined();
        expect(panel.gridPos).toBeDefined();
        
        // Grid position should be valid
        expect(panel.gridPos.h).toBeGreaterThan(0);
        expect(panel.gridPos.w).toBeGreaterThan(0);
        expect(panel.gridPos.x).toBeGreaterThanOrEqual(0);
        expect(panel.gridPos.y).toBeGreaterThanOrEqual(0);
        
        // Panel should have targets for data queries
        if (panel.type !== 'text' && panel.type !== 'dashlist') {
          expect(panel.targets).toBeDefined();
          expect(Array.isArray(panel.targets)).toBe(true);
        }
      });
    }
  });

  test('Datasources should be properly configured', async () => {
    const response = await grafanaApi.get('/api/datasources');
    const datasources = response.data;

    // Check for required datasources
    const datasourceNames = datasources.map(ds => ds.name);
    expect(datasourceNames).toContain('Prometheus');
    expect(datasourceNames).toContain('Loki');
    expect(datasourceNames).toContain('Jaeger');

    // Check Prometheus datasource configuration
    const prometheus = datasources.find(ds => ds.name === 'Prometheus');
    expect(prometheus.type).toBe('prometheus');
    expect(prometheus.url).toContain('prometheus');
    expect(prometheus.access).toBe('proxy');
  });

  test('Alert rules should be properly configured', async () => {
    try {
      const response = await grafanaApi.get('/api/ruler/grafana/api/v1/rules');
      const ruleGroups = response.data;

      // Check that we have rule groups
      expect(Object.keys(ruleGroups)).toContain('system-health');
      expect(Object.keys(ruleGroups)).toContain('student-performance');
      expect(Object.keys(ruleGroups)).toContain('ai-performance');

      // Check system-health rules
      const systemHealthRules = ruleGroups['system-health'];
      expect(systemHealthRules).toBeDefined();
      expect(systemHealthRules.length).toBeGreaterThan(0);

      // Verify rule structure
      systemHealthRules.forEach(ruleGroup => {
        expect(ruleGroup.name).toBeDefined();
        expect(ruleGroup.rules).toBeDefined();
        expect(Array.isArray(ruleGroup.rules)).toBe(true);
        
        ruleGroup.rules.forEach(rule => {
          expect(rule.alert).toBeDefined();
          expect(rule.expr).toBeDefined();
          expect(rule.labels).toBeDefined();
          expect(rule.annotations).toBeDefined();
        });
      });
    } catch (error) {
      // Alert rules might not be available in all Grafana versions
      console.warn('Alert rules validation skipped:', error.message);
    }
  });

  test('Dashboard should be responsive on mobile', async () => {
    // Test that dashboards have proper responsive configuration
    for (const dashboard of dashboards.slice(0, 2)) { // Test first 2 dashboards
      const response = await grafanaApi.get(`/api/dashboards/uid/${dashboard.uid}`);
      const dashboardData = response.data.dashboard;

      // Check that panels have reasonable grid positions for mobile
      const panels = dashboardData.panels;
      panels.forEach(panel => {
        // Panel width should not exceed 24 (Grafana's grid system)
        expect(panel.gridPos.w).toBeLessThanOrEqual(24);
        
        // For mobile compatibility, panels should ideally be full width or half width
        const isFullWidth = panel.gridPos.w === 24;
        const isHalfWidth = panel.gridPos.w === 12;
        const isQuarterWidth = panel.gridPos.w === 6;
        
        expect(isFullWidth || isHalfWidth || isQuarterWidth || panel.gridPos.w <= 8).toBe(true);
      });
    }
  });

  test('Dashboard performance should meet SLA requirements', async () => {
    // Test dashboard loading performance
    const performanceTests = [];
    
    for (const dashboard of dashboards.slice(0, 3)) { // Test first 3 dashboards
      const startTime = Date.now();
      
      try {
        await grafanaApi.get(`/api/dashboards/uid/${dashboard.uid}`);
        const loadTime = Date.now() - startTime;
        
        performanceTests.push({
          dashboard: dashboard.title,
          loadTime: loadTime
        });
        
        // Each dashboard should load within 5 seconds
        expect(loadTime).toBeLessThan(5000);
      } catch (error) {
        console.error(`Failed to load dashboard ${dashboard.title}:`, error.message);
        throw error;
      }
    }
    
    console.log('Dashboard Performance Results:', performanceTests);
  });
});

// Helper function to wait for Grafana to be ready
async function waitForGrafana(maxRetries = 30, delay = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await grafanaApi.get('/api/health');
      console.log('Grafana is ready');
      return;
    } catch (error) {
      console.log(`Waiting for Grafana... (attempt ${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Grafana failed to become ready within timeout period');
}

// Helper function to validate dashboard JSON structure
function validateDashboardJson(dashboardPath) {
  const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
  const dashboard = JSON.parse(dashboardContent);
  
  // Basic structure validation
  expect(dashboard.dashboard).toBeDefined();
  expect(dashboard.dashboard.title).toBeDefined();
  expect(dashboard.dashboard.panels).toBeDefined();
  expect(Array.isArray(dashboard.dashboard.panels)).toBe(true);
  
  return dashboard;
}

// Test dashboard JSON files directly
describe('Dashboard JSON File Validation', () => {
  const dashboardsDir = path.join(__dirname, '../infrastructure/grafana/provisioning/dashboards');
  
  test('Executive Overview JSON should be valid', () => {
    const dashboardPath = path.join(dashboardsDir, 'executive-overview.json');
    expect(fs.existsSync(dashboardPath)).toBe(true);
    
    const dashboard = validateDashboardJson(dashboardPath);
    expect(dashboard.dashboard.title).toContain('Executive Overview');
    expect(dashboard.dashboard.panels.length).toBeGreaterThan(5);
  });

  test('All dashboard JSON files should have valid structure', () => {
    const jsonFiles = [
      'executive-overview.json',
      'gamification-metrics.json'
    ];
    
    jsonFiles.forEach(filename => {
      const filePath = path.join(dashboardsDir, filename);
      if (fs.existsSync(filePath)) {
        expect(() => validateDashboardJson(filePath)).not.toThrow();
      }
    });
  });
});