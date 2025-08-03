// MTN MoMo Authentication Management
const axios = require('axios');
const logger = require('../../utils/logger');

class MomoAuth {
    constructor(config) {
        this.config = config;
        this.token = null;
        this.tokenExpiry = 0;
        this.tokenBuffer = 300000; // 5 minutes buffer before expiry
    }

    async getValidToken() {
        if (!this.isTokenValid()) {
            await this.fetchNewToken();
        }
        return this.token;
    }

    isTokenValid() {
        return this.token && Date.now() < (this.tokenExpiry - this.tokenBuffer);
    }

    async fetchNewToken() {
        const endpoint = `${this.config.baseUrl}/collection/token/`;
        
        try {
            logger.info('Fetching new MoMo access token');
            
            const response = await axios.post(endpoint, null, {
                headers: {
                    'Authorization': `Basic ${this.config.getAuthHeader()}`,
                    ...this.config.getBaseHeaders()
                },
                timeout: 15000
            });

            if (response.status === 200 && response.data.access_token) {
                this.token = response.data.access_token;
                const expiresIn = response.data.expires_in || 3600; // Default 1 hour
                this.tokenExpiry = Date.now() + (expiresIn * 1000);
                
                logger.info('Successfully fetched MoMo access token', {
                    expiresIn: expiresIn,
                    environment: this.config.environment
                });
                
                return this.token;
            } else {
                throw new Error('Invalid token response format');
            }
            
        } catch (error) {
            logger.error('Failed to fetch MoMo access token', {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data,
                environment: this.config.environment
            });
            
            // Clear invalid token
            this.token = null;
            this.tokenExpiry = 0;
            
            throw new Error(`Authentication failed: ${error.message}`);
        }
    }

    getAuthenticatedHeaders(referenceId = null) {
        if (!this.token) {
            throw new Error('No valid token available. Call getValidToken() first.');
        }

        const headers = {
            'Authorization': `Bearer ${this.token}`,
            ...this.config.getBaseHeaders()
        };

        if (referenceId) {
            headers['X-Reference-Id'] = referenceId;
        }

        return headers;
    }

    async testAuthentication() {
        try {
            await this.getValidToken();
            logger.info('MoMo authentication test passed');
            return { success: true, token: this.token };
        } catch (error) {
            logger.error('MoMo authentication test failed', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    clearToken() {
        this.token = null;
        this.tokenExpiry = 0;
        logger.info('MoMo token cleared');
    }
}

module.exports = MomoAuth;
