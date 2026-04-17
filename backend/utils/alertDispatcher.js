const http = require('http');
const https = require('https');
const { URL } = require('url');
const logger = require('./logger');

class AlertDispatcher {
  constructor() {
    this.enabled = process.env.ALERT_ENABLED !== 'false';
    this.webhookUrl = process.env.ALERT_WEBHOOK_URL || '';
    this.environment = process.env.ALERT_ENVIRONMENT || process.env.NODE_ENV || 'development';
  }

  async dispatch(alert) {
    if (!this.enabled || !this.webhookUrl) {
      return false;
    }

    const payload = {
      environment: this.environment,
      timestamp: alert.timestamp || new Date().toISOString(),
      alert
    };

    try {
      await this.postJson(this.webhookUrl, payload);
      return true;
    } catch (error) {
      logger.error('[AlertDispatcher] Failed to deliver alert', {
        message: error.message,
        webhook: this.webhookUrl
      });
      return false;
    }
  }

  postJson(targetUrl, payload) {
    const url = new URL(targetUrl);
    const transport = url.protocol === 'https:' ? https : http;
    const body = JSON.stringify(payload);

    return new Promise((resolve, reject) => {
      const request = transport.request(
        {
          protocol: url.protocol,
          hostname: url.hostname,
          port: url.port || undefined,
          path: `${url.pathname}${url.search}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
          },
          timeout: 5000
        },
        (response) => {
          response.resume();

          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(true);
            return;
          }

          reject(new Error(`Alert webhook responded with status ${response.statusCode}`));
        }
      );

      request.on('timeout', () => {
        request.destroy(new Error('Alert webhook request timed out'));
      });

      request.on('error', reject);
      request.write(body);
      request.end();
    });
  }
}

module.exports = new AlertDispatcher();
