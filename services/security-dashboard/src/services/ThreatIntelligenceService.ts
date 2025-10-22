import { Pool } from 'pg';
import axios from 'axios';
import { 
  ThreatIntelligence, 
  ThreatType, 
  ThreatSeverity,
  SecurityAlert,
  AlertType,
  AlertSeverity,
  AlertStatus
} from '@/models/Security';
import { logger } from '@/telemetry/logger';
import { metrics } from '@opentelemetry/api';
import pool from '@/database/connection';

const meter = metrics.getMeter('security-dashboard', '1.0.0');

// Threat intelligence metrics
const threatIntelFeeds = meter.createCounter('threat_intel_feeds_total', {
  description: 'Total threat intelligence feeds processed'
});

const threatsDetected = meter.createCounter('threats_detected_total', {
  description: 'Total threats detected by type'
});

const threatsBlocked = meter.createCounter('threats_blocked_total', {
  description: 'Total threats blocked'
});

export class ThreatIntelligenceService {
  private pool: Pool;
  private threatFeeds: Array<{ name: string; url: string; apiKey?: string }>;

  constructor(dbPool: Pool = pool) {
    this.pool = dbPool;
    
    // Configure threat intelligence feeds
    this.threatFeeds = [
      {
        name: 'MISP',
        url: process.env.MISP_URL || 'https://misp.local',
        apiKey: process.env.MISP_API_KEY
      },
      {
        name: 'AlienVault OTX',
        url: 'https://otx.alienvault.com/api/v1',
        apiKey: process.env.OTX_API_KEY
      },
      {
        name: 'VirusTotal',
        url: 'https://www.virustotal.com/vtapi/v2',
        apiKey: process.env.VIRUSTOTAL_API_KEY
      },
      {
        name: 'Abuse.ch',
        url: 'https://urlhaus-api.abuse.ch/v1'
      }
    ];
  }

  async updateThreatIntelligence(): Promise<void> {
    try {
      logger.info('Starting threat intelligence update');

      for (const feed of this.threatFeeds) {
        try {
          await this.processThreatFeed(feed);
          threatIntelFeeds.add(1, { feed: feed.name, status: 'success' });
        } catch (error) {
          logger.error('Failed to process threat feed', { error, feed: feed.name });
          threatIntelFeeds.add(1, { feed: feed.name, status: 'error' });
        }
      }

      // Process internal threat data
      await this.processInternalThreats();

      // Update threat landscape
      await this.updateThreatLandscape();

      logger.info('Threat intelligence update completed');

    } catch (error) {
      logger.error('Failed to update threat intelligence', { error });
      throw error;
    }
  }

  private async processThreatFeed(feed: { name: string; url: string; apiKey?: string }): Promise<void> {
    try {
      logger.info('Processing threat feed', { feed: feed.name });

      // Simulate threat intelligence data (in real implementation, this would call actual APIs)
      const threats = await this.fetchThreatData(feed);

      for (const threat of threats) {
        await this.storeThreatIntelligence(threat);
        
        // Create alerts for high-confidence, high-severity threats
        if (threat.confidence >= 80 && threat.severity === ThreatSeverity.HIGH) {
          await this.createThreatAlert(threat);
        }
      }

      logger.info('Threat feed processed successfully', { 
        feed: feed.name, 
        threatsProcessed: threats.length 
      });

    } catch (error) {
      logger.error('Failed to process threat feed', { error, feed: feed.name });
      throw error;
    }
  }

  private async fetchThreatData(feed: { name: string; url: string; apiKey?: string }): Promise<ThreatIntelligence[]> {
    // Simulate threat intelligence data
    const mockThreats: ThreatIntelligence[] = [
      {
        id: `threat-${Date.now()}-1`,
        type: ThreatType.MALWARE,
        indicator: '192.168.1.100',
        confidence: 85,
        severity: ThreatSeverity.HIGH,
        description: 'Known malware C&C server',
        source: feed.name,
        firstSeen: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        lastSeen: new Date(),
        isActive: true,
        tags: ['malware', 'c2', 'botnet'],
        iocs: [
          { type: 'ip', value: '192.168.1.100' },
          { type: 'domain', value: 'malicious-domain.com' }
        ]
      },
      {
        id: `threat-${Date.now()}-2`,
        type: ThreatType.PHISHING,
        indicator: 'phishing-site.example.com',
        confidence: 92,
        severity: ThreatSeverity.MEDIUM,
        description: 'Phishing site targeting financial institutions',
        source: feed.name,
        firstSeen: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        lastSeen: new Date(),
        isActive: true,
        tags: ['phishing', 'financial', 'credential-theft'],
        iocs: [
          { type: 'domain', value: 'phishing-site.example.com' },
          { type: 'url', value: 'https://phishing-site.example.com/login' }
        ]
      },
      {
        id: `threat-${Date.now()}-3`,
        type: ThreatType.BRUTE_FORCE,
        indicator: '10.0.0.50',
        confidence: 78,
        severity: ThreatSeverity.MEDIUM,
        description: 'IP address involved in SSH brute force attacks',
        source: feed.name,
        firstSeen: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        lastSeen: new Date(),
        isActive: true,
        tags: ['brute-force', 'ssh', 'authentication'],
        iocs: [
          { type: 'ip', value: '10.0.0.50' }
        ]
      }
    ];

    // In real implementation, this would make actual API calls
    // const response = await axios.get(feed.url, {
    //   headers: feed.apiKey ? { 'Authorization': `Bearer ${feed.apiKey}` } : {}
    // });

    return mockThreats;
  }

  private async storeThreatIntelligence(threat: ThreatIntelligence): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        INSERT INTO threat_intelligence (
          id, type, indicator, confidence, severity, description, source,
          first_seen, last_seen, is_active, tags, iocs
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (indicator, source) DO UPDATE SET
          confidence = EXCLUDED.confidence,
          severity = EXCLUDED.severity,
          description = EXCLUDED.description,
          last_seen = EXCLUDED.last_seen,
          is_active = EXCLUDED.is_active,
          tags = EXCLUDED.tags,
          iocs = EXCLUDED.iocs
      `;

      const values = [
        threat.id,
        threat.type,
        threat.indicator,
        threat.confidence,
        threat.severity,
        threat.description,
        threat.source,
        threat.firstSeen,
        threat.lastSeen,
        threat.isActive,
        JSON.stringify(threat.tags),
        JSON.stringify(threat.iocs)
      ];

      await client.query(query, values);

      threatsDetected.add(1, { type: threat.type, severity: threat.severity });

    } catch (error) {
      logger.error('Failed to store threat intelligence', { error, threatId: threat.id });
      throw error;
    } finally {
      client.release();
    }
  }

  private async createThreatAlert(threat: ThreatIntelligence): Promise<void> {
    const alert: SecurityAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: AlertType.THREAT,
      severity: threat.severity === ThreatSeverity.CRITICAL ? AlertSeverity.CRITICAL :
                threat.severity === ThreatSeverity.HIGH ? AlertSeverity.HIGH :
                threat.severity === ThreatSeverity.MEDIUM ? AlertSeverity.MEDIUM : AlertSeverity.LOW,
      title: `${threat.type.toUpperCase()} Threat Detected: ${threat.indicator}`,
      description: `${threat.description}\n\nConfidence: ${threat.confidence}%\nSource: ${threat.source}\nTags: ${threat.tags.join(', ')}`,
      source: threat.source,
      timestamp: new Date(),
      status: AlertStatus.OPEN,
      metadata: {
        threatId: threat.id,
        indicator: threat.indicator,
        threatType: threat.type,
        confidence: threat.confidence,
        iocs: threat.iocs
      }
    };

    await this.storeAlert(alert);
  }

  private async storeAlert(alert: SecurityAlert): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        INSERT INTO security_alerts (
          id, type, severity, title, description, source, timestamp, status, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;

      const values = [
        alert.id,
        alert.type,
        alert.severity,
        alert.title,
        alert.description,
        alert.source,
        alert.timestamp,
        alert.status,
        JSON.stringify(alert.metadata)
      ];

      await client.query(query, values);

    } catch (error) {
      logger.error('Failed to store security alert', { error, alertId: alert.id });
      throw error;
    } finally {
      client.release();
    }
  }

  private async processInternalThreats(): Promise<void> {
    try {
      // Analyze internal security events for threat patterns
      await this.analyzeFailedLogins();
      await this.analyzeUnusualAccess();
      await this.analyzeNetworkAnomalies();

      logger.info('Internal threat analysis completed');

    } catch (error) {
      logger.error('Failed to process internal threats', { error });
      throw error;
    }
  }

  private async analyzeFailedLogins(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      // Detect brute force attempts
      const bruteForceQuery = `
        SELECT 
          ip_address,
          COUNT(*) as attempt_count,
          COUNT(DISTINCT user_id) as unique_users,
          MIN(timestamp) as first_attempt,
          MAX(timestamp) as last_attempt
        FROM access_audit_logs
        WHERE action = 'login' 
          AND result = 'denied'
          AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
        GROUP BY ip_address
        HAVING COUNT(*) >= 10
      `;

      const result = await client.query(bruteForceQuery);

      for (const row of result.rows) {
        const threat: ThreatIntelligence = {
          id: `internal-threat-${Date.now()}-${row.ip_address}`,
          type: ThreatType.BRUTE_FORCE,
          indicator: row.ip_address,
          confidence: Math.min(95, 50 + (row.attempt_count * 2)),
          severity: row.attempt_count >= 50 ? ThreatSeverity.HIGH : ThreatSeverity.MEDIUM,
          description: `Brute force attack detected from ${row.ip_address}. ${row.attempt_count} failed login attempts against ${row.unique_users} users.`,
          source: 'internal-analysis',
          firstSeen: new Date(row.first_attempt),
          lastSeen: new Date(row.last_attempt),
          isActive: true,
          tags: ['brute-force', 'internal', 'authentication'],
          iocs: [
            { type: 'ip', value: row.ip_address }
          ]
        };

        await this.storeThreatIntelligence(threat);
        await this.createThreatAlert(threat);

        // Block the IP address
        await this.blockThreatIndicator(threat.indicator, 'Brute force attack');
      }

    } catch (error) {
      logger.error('Failed to analyze failed logins', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  private async analyzeUnusualAccess(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      // Detect access from unusual locations or times
      const unusualAccessQuery = `
        SELECT 
          user_id,
          ip_address,
          COUNT(*) as access_count,
          EXTRACT(hour FROM timestamp) as hour
        FROM access_audit_logs
        WHERE action = 'login' 
          AND result = 'success'
          AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
          AND (
            EXTRACT(hour FROM timestamp) < 6 OR 
            EXTRACT(hour FROM timestamp) > 22
          )
        GROUP BY user_id, ip_address, EXTRACT(hour FROM timestamp)
        HAVING COUNT(*) >= 3
      `;

      const result = await client.query(unusualAccessQuery);

      for (const row of result.rows) {
        const threat: ThreatIntelligence = {
          id: `internal-threat-${Date.now()}-unusual-${row.user_id}`,
          type: ThreatType.INSIDER_THREAT,
          indicator: row.ip_address,
          confidence: 60,
          severity: ThreatSeverity.MEDIUM,
          description: `Unusual access pattern detected for user ${row.user_id} from ${row.ip_address} during off-hours (${row.hour}:00).`,
          source: 'internal-analysis',
          firstSeen: new Date(),
          lastSeen: new Date(),
          isActive: true,
          tags: ['insider-threat', 'unusual-access', 'off-hours'],
          iocs: [
            { type: 'ip', value: row.ip_address },
            { type: 'user', value: row.user_id }
          ]
        };

        await this.storeThreatIntelligence(threat);
        
        // Create alert but don't auto-block (could be legitimate)
        await this.createThreatAlert(threat);
      }

    } catch (error) {
      logger.error('Failed to analyze unusual access', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  private async analyzeNetworkAnomalies(): Promise<void> {
    // Simulate network anomaly detection
    // In real implementation, this would analyze network logs, DNS queries, etc.
    
    const anomalies = [
      {
        type: ThreatType.DDOS,
        indicator: '203.0.113.100',
        description: 'Unusual traffic volume detected from this IP address',
        confidence: 75
      }
    ];

    for (const anomaly of anomalies) {
      const threat: ThreatIntelligence = {
        id: `network-anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: anomaly.type,
        indicator: anomaly.indicator,
        confidence: anomaly.confidence,
        severity: ThreatSeverity.MEDIUM,
        description: anomaly.description,
        source: 'network-analysis',
        firstSeen: new Date(),
        lastSeen: new Date(),
        isActive: true,
        tags: ['network-anomaly', 'automated-detection'],
        iocs: [
          { type: 'ip', value: anomaly.indicator }
        ]
      };

      await this.storeThreatIntelligence(threat);
    }
  }

  private async blockThreatIndicator(indicator: string, reason: string): Promise<void> {
    try {
      // In real implementation, this would integrate with firewall/WAF APIs
      logger.info('Blocking threat indicator', { indicator, reason });

      // Store the block action
      const client = await this.pool.connect();
      
      try {
        const query = `
          INSERT INTO threat_blocks (
            id, indicator, reason, blocked_at, blocked_by, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `;

        const values = [
          `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          indicator,
          reason,
          new Date(),
          'automated-system',
          true
        ];

        await client.query(query, values);
        threatsBlocked.add(1, { indicator_type: 'ip' });

      } finally {
        client.release();
      }

    } catch (error) {
      logger.error('Failed to block threat indicator', { error, indicator });
      throw error;
    }
  }

  private async updateThreatLandscape(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      // Update threat landscape summary
      const landscapeQuery = `
        SELECT 
          type,
          severity,
          COUNT(*) as count,
          AVG(confidence) as avg_confidence
        FROM threat_intelligence
        WHERE is_active = true
          AND last_seen >= CURRENT_TIMESTAMP - INTERVAL '7 days'
        GROUP BY type, severity
      `;

      const result = await client.query(landscapeQuery);

      const landscape = {
        timestamp: new Date(),
        threats: result.rows.map(row => ({
          type: row.type,
          severity: row.severity,
          count: parseInt(row.count),
          averageConfidence: parseFloat(row.avg_confidence)
        })),
        totalActiveThreats: result.rows.reduce((sum, row) => sum + parseInt(row.count), 0)
      };

      // Store landscape snapshot
      const snapshotQuery = `
        INSERT INTO threat_landscape_snapshots (id, timestamp, landscape_data)
        VALUES ($1, $2, $3)
      `;

      await client.query(snapshotQuery, [
        `landscape-${Date.now()}`,
        landscape.timestamp,
        JSON.stringify(landscape)
      ]);

      logger.info('Threat landscape updated', { 
        totalThreats: landscape.totalActiveThreats 
      });

    } catch (error) {
      logger.error('Failed to update threat landscape', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  async getThreatIntelligence(
    type?: ThreatType,
    severity?: ThreatSeverity,
    isActive: boolean = true,
    limit: number = 100
  ): Promise<ThreatIntelligence[]> {
    const client = await this.pool.connect();
    
    try {
      let query = `
        SELECT 
          id, type, indicator, confidence, severity, description, source,
          first_seen as "firstSeen", last_seen as "lastSeen", is_active as "isActive",
          tags, iocs
        FROM threat_intelligence
        WHERE 1=1
      `;

      const values: any[] = [];
      let paramCount = 1;

      if (type) {
        query += ` AND type = $${paramCount++}`;
        values.push(type);
      }

      if (severity) {
        query += ` AND severity = $${paramCount++}`;
        values.push(severity);
      }

      query += ` AND is_active = $${paramCount++}`;
      values.push(isActive);

      query += ` ORDER BY confidence DESC, last_seen DESC LIMIT $${paramCount}`;
      values.push(limit);

      const result = await client.query(query, values);
      
      return result.rows.map(row => ({
        ...row,
        tags: JSON.parse(row.tags || '[]'),
        iocs: JSON.parse(row.iocs || '[]'),
        firstSeen: new Date(row.firstSeen),
        lastSeen: new Date(row.lastSeen)
      }));

    } catch (error) {
      logger.error('Failed to get threat intelligence', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  async getThreatLandscape(): Promise<any> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT landscape_data
        FROM threat_landscape_snapshots
        ORDER BY timestamp DESC
        LIMIT 1
      `;

      const result = await client.query(query);
      
      if (result.rows.length > 0) {
        return JSON.parse(result.rows[0].landscape_data);
      }

      return {
        timestamp: new Date(),
        threats: [],
        totalActiveThreats: 0
      };

    } catch (error) {
      logger.error('Failed to get threat landscape', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  async checkIndicator(indicator: string): Promise<ThreatIntelligence | null> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT 
          id, type, indicator, confidence, severity, description, source,
          first_seen as "firstSeen", last_seen as "lastSeen", is_active as "isActive",
          tags, iocs
        FROM threat_intelligence
        WHERE indicator = $1 AND is_active = true
        ORDER BY confidence DESC
        LIMIT 1
      `;

      const result = await client.query(query, [indicator]);
      
      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          ...row,
          tags: JSON.parse(row.tags || '[]'),
          iocs: JSON.parse(row.iocs || '[]'),
          firstSeen: new Date(row.firstSeen),
          lastSeen: new Date(row.lastSeen)
        };
      }

      return null;

    } catch (error) {
      logger.error('Failed to check indicator', { error, indicator });
      throw error;
    } finally {
      client.release();
    }
  }
}