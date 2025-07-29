const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    messages: [{
        role: {
            type: String,
            enum: ['user', 'assistant', 'system'],
            required: true
        },
        content: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    lastActivity: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for performance and automatic cleanup
conversationSchema.index({ userId: 1 });
conversationSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 24 * 60 * 60 }); // 24 hour TTL

// Add message to conversation
conversationSchema.methods.addMessage = function(role, content) {
    this.messages.push({
        role,
        content,
        timestamp: new Date()
    });
    
    // Keep only last 10 messages for context
    if (this.messages.length > 10) {
        this.messages = this.messages.slice(-10);
    }
    
    this.lastActivity = new Date();
    return this.save();
};

// Get conversation context for AI
conversationSchema.methods.getContext = function() {
    return this.messages.map(msg => ({
        role: msg.role,
        content: msg.content
    }));
};

// Clear conversation
conversationSchema.methods.clear = function() {
    this.messages = [];
    this.lastActivity = new Date();
    return this.save();
};

module.exports = mongoose.model('Conversation', conversationSchema); 