const moment = require('moment-timezone');
const config = require('../config');

class TimezoneManager {
    constructor() {
        this.timezone = config.timezone; // Africa/Juba
    }

    // Get current time in Juba timezone
    getCurrentTime() {
        return moment().tz(this.timezone);
    }

    // Convert UTC time to Juba time
    toJubaTime(utcTime) {
        return moment(utcTime).tz(this.timezone);
    }

    // Convert Juba time to UTC
    toUTC(jubaTime) {
        return moment.tz(jubaTime, this.timezone).utc();
    }

    // Get start of day in Juba timezone
    getStartOfDay(date = null) {
        const targetDate = date ? moment(date) : moment();
        return targetDate.tz(this.timezone).startOf('day');
    }

    // Get end of day in Juba timezone
    getEndOfDay(date = null) {
        const targetDate = date ? moment(date) : moment();
        return targetDate.tz(this.timezone).endOf('day');
    }

    // Check if it's a new day in Juba timezone
    isNewDay(lastResetDate) {
        if (!lastResetDate) return true;
        
        const lastReset = moment(lastResetDate).tz(this.timezone);
        const now = this.getCurrentTime();
        
        return lastReset.isBefore(now, 'day');
    }

    // Get next midnight in Juba timezone
    getNextMidnight() {
        return this.getCurrentTime().add(1, 'day').startOf('day');
    }

    // Format date for user-facing messages
    formatForUser(date, format = 'YYYY-MM-DD HH:mm:ss') {
        return moment(date).tz(this.timezone).format(format);
    }

    // Get time until next reset (midnight Juba time)
    getTimeUntilNextReset() {
        const now = this.getCurrentTime();
        const nextMidnight = this.getNextMidnight();
        return nextMidnight.diff(now);
    }

    // Check if current time is between two times in Juba timezone
    isBetween(startTime, endTime, currentTime = null) {
        const time = currentTime ? moment(currentTime).tz(this.timezone) : this.getCurrentTime();
        const start = moment.tz(startTime, 'HH:mm', this.timezone);
        const end = moment.tz(endTime, 'HH:mm', this.timezone);
        
        return time.isBetween(start, end, null, '[]');
    }

    // Get cron expression for midnight Juba time
    getMidnightCronExpression() {
        // Since Juba is UTC+3, midnight Juba time is 9 PM UTC the previous day
        return '0 21 * * *'; // 9 PM UTC = midnight Juba time
    }

    // Get cron expression for every 30 minutes
    getThirtyMinuteCronExpression() {
        return '*/30 * * * *';
    }

    // Get cron expression for every 50 seconds (for self-ping)
    getFiftySecondCronExpression() {
        return '*/50 * * * * *';
    }
}

module.exports = new TimezoneManager(); 