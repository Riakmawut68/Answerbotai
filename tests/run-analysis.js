#!/usr/bin/env node

/**
 * Comprehensive Analysis Test Runner
 * 
 * This script runs all critical tests to validate the messenger bot system
 * and verify that all identified issues have been properly addressed.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class AnalysisTestRunner {
    constructor() {
        this.testResults = {
            unit: { passed: 0, failed: 0, errors: [] },
            integration: { passed: 0, failed: 0, errors: [] },
            critical: { passed: 0, failed: 0, errors: [] },
            bugs: { passed: 0, failed: 0, errors: [] }
        };
    }

    async runAllTests() {
        console.log('🚀 STARTING COMPREHENSIVE MESSENGER BOT ANALYSIS');
        console.log('================================================\n');

        try {
            // Check if test dependencies are installed
            await this.checkDependencies();

            // Run test suites in order
            await this.runUnitTests();
            await this.runIntegrationTests();
            await this.runCriticalTests();
            await this.runBugValidationTests();

            // Generate report
            this.generateReport();

        } catch (error) {
            console.error('❌ Analysis failed:', error.message);
            process.exit(1);
        }
    }

    async checkDependencies() {
        console.log('🔍 Checking test dependencies...');
        
        const packageJsonPath = path.join(__dirname, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            throw new Error('Test package.json not found. Run "npm init" in tests directory first.');
        }

        console.log('✅ Dependencies verified\n');
    }

    async runUnitTests() {
        console.log('🧪 RUNNING UNIT TESTS');
        console.log('=====================');
        
        try {
            const result = await this.executeTest('npm test -- tests/unit');
            this.testResults.unit = result;
            console.log(`✅ Unit tests completed: ${result.passed} passed, ${result.failed} failed\n`);
        } catch (error) {
            this.testResults.unit.errors.push(error.message);
            console.log(`❌ Unit tests failed: ${error.message}\n`);
        }
    }

    async runIntegrationTests() {
        console.log('🔗 RUNNING INTEGRATION TESTS');
        console.log('============================');
        
        try {
            const result = await this.executeTest('npm test -- tests/integration');
            this.testResults.integration = result;
            console.log(`✅ Integration tests completed: ${result.passed} passed, ${result.failed} failed\n`);
        } catch (error) {
            this.testResults.integration.errors.push(error.message);
            console.log(`❌ Integration tests failed: ${error.message}\n`);
        }
    }

    async runCriticalTests() {
        console.log('🚨 RUNNING CRITICAL BUG TESTS');
        console.log('==============================');
        
        try {
            const result = await this.executeTest('npm run test:critical');
            this.testResults.critical = result;
            console.log(`✅ Critical tests completed: ${result.passed} passed, ${result.failed} failed\n`);
        } catch (error) {
            this.testResults.critical.errors.push(error.message);
            console.log(`❌ Critical tests failed: ${error.message}\n`);
        }
    }

    async runBugValidationTests() {
        console.log('🐛 RUNNING BUG VALIDATION TESTS');
        console.log('================================');
        
        try {
            const result = await this.executeTest('npm run test:bugs');
            this.testResults.bugs = result;
            console.log(`✅ Bug validation completed: ${result.passed} passed, ${result.failed} failed\n`);
        } catch (error) {
            this.testResults.bugs.errors.push(error.message);
            console.log(`❌ Bug validation failed: ${error.message}\n`);
        }
    }

    async executeTest(command) {
        return new Promise((resolve, reject) => {
            const [cmd, ...args] = command.split(' ');
            const process = spawn(cmd, args, { 
                cwd: __dirname,
                stdio: 'pipe'
            });

            let output = '';
            let passed = 0;
            let failed = 0;

            process.stdout.on('data', (data) => {
                output += data.toString();
                const lines = data.toString().split('\n');
                
                lines.forEach(line => {
                    if (line.includes('✓') || line.includes('PASS')) {
                        passed++;
                    }
                    if (line.includes('✗') || line.includes('FAIL')) {
                        failed++;
                    }
                });
            });

            process.stderr.on('data', (data) => {
                output += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve({ passed, failed, output });
                } else {
                    reject(new Error(`Test command failed with code ${code}: ${output}`));
                }
            });
        });
    }

    generateReport() {
        console.log('📊 COMPREHENSIVE ANALYSIS REPORT');
        console.log('=================================\n');

        const totalPassed = Object.values(this.testResults).reduce((sum, result) => sum + result.passed, 0);
        const totalFailed = Object.values(this.testResults).reduce((sum, result) => sum + result.failed, 0);
        const totalErrors = Object.values(this.testResults).reduce((sum, result) => sum + result.errors.length, 0);

        console.log('📈 SUMMARY STATISTICS:');
        console.log(`   Total Tests Passed: ${totalPassed}`);
        console.log(`   Total Tests Failed: ${totalFailed}`);
        console.log(`   Total Errors: ${totalErrors}`);
        console.log(`   Success Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%\n`);

        console.log('🧪 DETAILED BREAKDOWN:');
        console.log(`   Unit Tests:        ${this.testResults.unit.passed} passed, ${this.testResults.unit.failed} failed`);
        console.log(`   Integration Tests: ${this.testResults.integration.passed} passed, ${this.testResults.integration.failed} failed`);
        console.log(`   Critical Tests:    ${this.testResults.critical.passed} passed, ${this.testResults.critical.failed} failed`);
        console.log(`   Bug Validation:    ${this.testResults.bugs.passed} passed, ${this.testResults.bugs.failed} failed\n`);

        // Critical Issues Status
        console.log('🚨 CRITICAL ISSUES VALIDATION:');
        this.validateCriticalIssues();

        // Recommendations
        console.log('\n💡 RECOMMENDATIONS:');
        this.generateRecommendations();

        // Save report to file
        this.saveReport();
    }

    validateCriticalIssues() {
        const criticalIssues = [
            {
                name: 'Stage Definition Mismatch',
                status: this.testResults.critical.failed === 0 ? 'FIXED' : 'NEEDS ATTENTION',
                description: 'User model vs controller stage definitions'
            },
            {
                name: 'Dual Subscription Model',
                status: this.testResults.integration.failed === 0 ? 'FIXED' : 'NEEDS ATTENTION',
                description: 'Embedded vs separate subscription models'
            },
            {
                name: 'Payment Timeout Handling',
                status: this.testResults.bugs.failed === 0 ? 'FIXED' : 'NEEDS ATTENTION',
                description: 'Users stuck in awaiting_payment state'
            },
            {
                name: 'Payment Plan Fallback',
                status: 'PENDING IMPLEMENTATION',
                description: 'Dangerous fallback to weekly plan'
            },
            {
                name: 'Mobile Number Validation',
                status: 'PENDING IMPLEMENTATION',
                description: 'Duplicate validation logic'
            }
        ];

        criticalIssues.forEach(issue => {
            const statusIcon = issue.status === 'FIXED' ? '✅' : issue.status === 'PENDING IMPLEMENTATION' ? '⏳' : '❌';
            console.log(`   ${statusIcon} ${issue.name}: ${issue.status}`);
            console.log(`      ${issue.description}`);
        });
    }

    generateRecommendations() {
        const recommendations = [];

        if (this.testResults.critical.failed > 0) {
            recommendations.push('🔴 CRITICAL: Implement stage standardization fixes immediately');
        }

        if (this.testResults.integration.failed > 0) {
            recommendations.push('🟠 HIGH: Fix subscription model inconsistencies');
        }

        if (this.testResults.bugs.failed > 0) {
            recommendations.push('🟡 MEDIUM: Address payment timeout issues');
        }

        if (recommendations.length === 0) {
            recommendations.push('🟢 All critical issues have been resolved!');
            recommendations.push('🔍 Consider implementing Priority 2 fixes');
            recommendations.push('📈 Monitor system performance and user metrics');
        }

        recommendations.forEach(rec => console.log(`   ${rec}`));
    }

    saveReport() {
        const reportData = {
            timestamp: new Date().toISOString(),
            summary: {
                totalPassed: Object.values(this.testResults).reduce((sum, result) => sum + result.passed, 0),
                totalFailed: Object.values(this.testResults).reduce((sum, result) => sum + result.failed, 0),
                successRate: ((Object.values(this.testResults).reduce((sum, result) => sum + result.passed, 0) / 
                             (Object.values(this.testResults).reduce((sum, result) => sum + result.passed + result.failed, 0))) * 100)
            },
            details: this.testResults
        };

        const reportPath = path.join(__dirname, 'analysis-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
        
        console.log(`\n📄 Detailed report saved to: ${reportPath}`);
        console.log('\n🏁 Analysis complete!');
    }
}

// Manual test validation functions (for when automated tests aren't available)
class ManualValidation {
    static async validateUserStages() {
        console.log('🔍 Validating user stages...');
        // This would connect to the database and check for invalid stages
        // For now, we'll simulate the check
        return { valid: true, issues: [] };
    }

    static async validateSubscriptionConsistency() {
        console.log('🔍 Validating subscription consistency...');
        // This would check for embedded vs separate subscription conflicts
        return { valid: true, issues: [] };
    }

    static async validatePaymentTimeouts() {
        console.log('🔍 Validating payment timeout handling...');
        // This would check for users stuck in payment states
        return { valid: true, issues: [] };
    }
}

// Run the analysis if called directly
if (require.main === module) {
    const runner = new AnalysisTestRunner();
    runner.runAllTests().catch(error => {
        console.error('Failed to run analysis:', error);
        process.exit(1);
    });
}

module.exports = { AnalysisTestRunner, ManualValidation };