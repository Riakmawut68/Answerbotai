// MTN MoMo API User Management
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');

class MomoApiUser {
    constructor(config) {
        this.config = config;
    }

    async createApiUser() {
        const newApiUserId = uuidv4();
        const endpoint = `${this.config.baseUrl}/v1_0/apiuser`;

        try {
            logger.info('Creating new MoMo API User', {
                apiUserId: newApiUserId,
                environment: this.config.environment,
                callbackHost: this.config.callbackHost
            });

            const response = await axios.post(endpoint, {
                providerCallbackHost: this.config.callbackHost
            }, {
                headers: {
                    'X-Reference-Id': newApiUserId,
                    ...this.config.getBaseHeaders()
                },
                timeout: 15000
            });

            if (response.status === 201) {
                logger.info('API User created successfully', { apiUserId: newApiUserId });
                
                // Wait for user to be fully created
                await this.delay(3000);
                
                // Generate API Key
                const apiKey = await this.generateApiKey(newApiUserId);
                
                return {
                    success: true,
                    apiUserId: newApiUserId,
                    apiKey: apiKey,
                    message: 'API User and Key created successfully'
                };
            } else {
                throw new Error(`Failed to create API User. Status: ${response.status}`);
            }

        } catch (error) {
            logger.error('Failed to create API User', {
                error: error.message,
                status: error.response?.status,
                data: error.response?.data
            });

            throw new Error(`API User creation failed: ${error.message}`);
        }
    }

    async generateApiKey(apiUserId) {
        const endpoint = `${this.config.baseUrl}/v1_0/apiuser/${apiUserId}/apikey`;

        try {
            logger.info('Generating API Key', { apiUserId });

            const response = await axios.post(endpoint, {}, {
                headers: this.config.getBaseHeaders(),
                timeout: 15000
            });

            if (response.status === 201 && response.data.apiKey) {
                logger.info('API Key generated successfully');
                return response.data.apiKey;
            } else {
                throw new Error(`Failed to generate API Key. Status: ${response.status}`);
            }

        } catch (error) {
            logger.error('Failed to generate API Key', {
                apiUserId,
                error: error.message,
                status: error.response?.status,
                data: error.response?.data
            });

            throw new Error(`API Key generation failed: ${error.message}`);
        }
    }

    async checkApiUser(apiUserId) {
        const endpoint = `${this.config.baseUrl}/v1_0/apiuser/${apiUserId}`;

        try {
            const response = await axios.get(endpoint, {
                headers: this.config.getBaseHeaders(),
                timeout: 10000
            });

            if (response.status === 200) {
                logger.info('API User exists', {
                    apiUserId,
                    callbackHost: response.data.providerCallbackHost,
                    targetEnvironment: response.data.targetEnvironment
                });

                return {
                    exists: true,
                    data: response.data
                };
            }

        } catch (error) {
            if (error.response?.status === 404) {
                logger.warn('API User does not exist', { apiUserId });
                return { exists: false };
            }

            logger.error('Failed to check API User', {
                apiUserId,
                error: error.message,
                status: error.response?.status
            });

            throw new Error(`API User check failed: ${error.message}`);
        }
    }

    async testCredentials(apiUserId, apiKey) {
        const endpoint = `${this.config.baseUrl}/collection/token/`;
        const auth = Buffer.from(`${apiUserId}:${apiKey}`).toString('base64');

        try {
            const response = await axios.post(endpoint, null, {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    ...this.config.getBaseHeaders()
                },
                timeout: 10000
            });

            if (response.status === 200 && response.data.access_token) {
                logger.info('Credentials test passed', {
                    apiUserId: this.config.maskCredential(apiUserId),
                    expiresIn: response.data.expires_in
                });

                return {
                    success: true,
                    token: response.data.access_token,
                    expiresIn: response.data.expires_in
                };
            } else {
                throw new Error('Invalid token response');
            }

        } catch (error) {
            logger.error('Credentials test failed', {
                apiUserId: this.config.maskCredential(apiUserId),
                error: error.message,
                status: error.response?.status,
                data: error.response?.data
            });

            return {
                success: false,
                error: error.message
            };
        }
    }

    async setupNewCredentials() {
        try {
            logger.info('Setting up new MoMo credentials');

            const result = await this.createApiUser();
            
            if (result.success) {
                // Test the new credentials
                const testResult = await this.testCredentials(result.apiUserId, result.apiKey);
                
                if (testResult.success) {
                    logger.info('New credentials setup completed successfully');
                    
                    return {
                        success: true,
                        apiUserId: result.apiUserId,
                        apiKey: result.apiKey,
                        envUpdate: {
                            MOMO_API_USER_ID: result.apiUserId,
                            MOMO_API_KEY: result.apiKey
                        }
                    };
                } else {
                    throw new Error('New credentials failed testing');
                }
            } else {
                throw new Error('Failed to create new credentials');
            }

        } catch (error) {
            logger.error('New credentials setup failed', { error: error.message });
            throw error;
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = MomoApiUser;
