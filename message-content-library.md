# Answer Bot AI - Complete Message Content Library

## 📋 **Message Content Overview**
This document contains all the exact message content used throughout the Answer Bot AI chatbot user interaction flow. All messages are preserved exactly as implemented and should not be altered.

---

## 🎯 **Welcome & Onboarding Messages**

### **Welcome Message (Part 1)**
```
👋 Welcome to Answer Bot AI!

Your intelligent virtual assistant powered by GPT-4.1 Nano. We're pleased to have you on board.

🤖 What Can I Help With?

Answer Bot AI assists with:
- 📚 Academics
- 💼 Business
- 🌱 Agriculture
- 🏥 Health
- ❓ General knowledge

Whether you're a student, professional, or curious learner, I provide fast, intelligent answers to help you solve problems and learn efficiently.

🆓 Free Trial & Subscription

- As a new user, you get 3 free messages every day to explore Answer Bot AI.
- After your daily limit, you'll be prompted to subscribe for premium access.
- Please have your MoMo (Mobile Money) number ready and recharged.
- Pricing:  
  • 3,000 SSP/week (30 messages per day, standard features)  
  • 6,500 SSP/month (30 messages per day, extended features & priority service)

📜 Compliance & Legal Responsibility

Nyamora Co.ltd operates Answer Bot AI in full compliance with:
- Meta's Platform Terms & Developer Policies
- Data privacy laws & user protection
- Mobile money transaction guidelines
- Digital services & e-commerce regulations
- Meta's community standards

We do not engage in unauthorized data collection, deceptive practices, or deliver false/harmful information. All AI responses are responsibly generated.

🔐 Data Privacy Policy

- We collect only essential data (user ID, message count, subscription status).
- No sensitive personal info is accessed, stored, or shared unless needed for service and with your consent.
- Data is used only to operate Answer Bot AI.
- All data is stored securely and never sold or transferred to third parties.
- You can request data deletion at any time.
- We use industry-standard encryption and security practices.

⚖ Terms & Conditions

By using Answer Bot AI, you agree to:
- Use the platform for personal, academic, or professional inquiry only.
- Understand that all responses are AI-generated and not professional advice.
- Not send or promote hate speech, abuse, violence, harassment, or misleadin
```

### **Welcome Message (Part 2)**
```
g content.
- Misuse or violations may lead to access restrictions or bans.
- Subscription fees are non-refundable once access is granted.
- We may update terms, pricing, or features at any time (you'll be notified).
For help, contact our support team via the app or official channels.

🟢 Consent Required

By tapping "I Agree", you confirm that you have read and accept our Terms, Privacy Policy, and Subscription Conditions. You must agree to use Answer Bot AI.
```

### **Consent Button Message**
```
🟢 By clicking "I Agree", you confirm that you've read and accepted our Terms, Privacy Policy, and Subscription Conditions.
```

### **Consent Button Options**
- **Button 1**: "I Agree" (payload: `I_AGREE`)
- **Button 2**: "Start Free Trial" (payload: `START_TRIAL`)

---

## 📱 **Phone Number Collection Messages**

### **Phone Number Request (After I Agree)**
```
Thank you for accepting our terms and conditions.

To continue, please enter your own MTN mobile number (e.g., 092xxxxxxx).

Providing your number helps us verify your eligibility for the free trial and ensures the security of your account.
```

### **Phone Number Request (For Payment)**
```
To continue, please enter your MTN mobile number (e.g., 092xxxxxxx) for payment processing.
```

### **Invalid Number Format Error**
```
Sorry, that doesn't look like a valid MTN South Sudan number. Please enter a number starting with 092 (e.g., 092xxxxxxx).
```

### **Number Already Used Error**
```
⚠️ This MTN number has already been used for a free trial.

Please try a different number or subscribe to unlock full access.
```

### **Number Already Used Options**
- **Button 1**: "Try Different Number" (payload: `RETRY_NUMBER`)
- **Button 2**: "Weekly Plan 3,000 SSP" (payload: `SUBSCRIBE_WEEKLY`)
- **Button 3**: "Monthly Plan 6,500 SSP" (payload: `SUBSCRIBE_MONTHLY`)

### **Valid Number Confirmation**
```
✅ Your number has been registered. You can now use your daily free trial of 3 messages.

Try asking me anything!
```

---

## 🆓 **Free Trial Messages**

### **Trial Activation**
```
Welcome to your free trial! You can send up to 3 messages per day. Try it out now!
```

### **Trial Limit Reached**
```
🛑 You've reached your daily free trial limit. Subscribe for premium access!
```

### **Trial Already Used**
```
You've already used your free trial. Please subscribe to continue using the service.
```

---

## 💳 **Subscription Messages**

### **Subscription Options Text**
```
To continue using Answer Bot AI, please choose a subscription plan:

- 3,000 SSP Weekly: 30 messages/day, standard features
- 6,500 SSP Monthly: 30 messages/day, extended features & priority service
```

### **Subscription Options Buttons**
- **Button 1**: "Weekly Plan 3,000 SSP" (payload: `SUBSCRIBE_WEEKLY`)
- **Button 2**: "Monthly Plan 6,500 SSP" (payload: `SUBSCRIBE_MONTHLY`)

### **Subscription Selection Prompt**
```
Select your preferred plan:
```

### **Payment Processing**
```
⏳ Your payment is being processed.

Please check your phone for a payment prompt. Complete the transaction within 15 minutes.

Type "cancel" to cancel this payment.
```

### **Payment Success**
```
🎉 Payment successful! Your subscription is now active.

You can now send up to 30 messages per day. Enjoy using Answer Bot AI!
```

### **Payment Failed**
```
❌ Payment failed. You can continue using your trial messages or try subscribing again later.
```

### **Payment Service Error**
```
Sorry, there was an error processing your payment request. Please try again in a moment.
```

### **Payment Service Unavailable**
```
Payment service is currently unavailable. Please try again later or contact support.
```

### **Payment Authentication Error (Sandbox)**
```
Payment service is in testing mode. Please try again in a few minutes.
```

### **Payment Authentication Error (Production)**
```
Payment authentication failed. Please try again in a few minutes.
```

### **Invalid Payment Request**
```
Invalid payment request. Please check your mobile number and try again.
```

---

## 💎 **Paid Subscriber Messages**

### **Daily Limit Reached**
```
You've reached your daily message limit. Try again tomorrow!
```

### **Subscription Expired**
```
Your subscription has expired. Please renew to continue using the service.
```

---

## 🛠 **Command Messages**

### **Reset Command Success**
```
✅ Your daily usage has been reset!

You can now use your messages again:
• Trial users: 3 messages per day
• Subscribers: 30 messages per day

Your conversation history has also been cleared.
```

### **Cancel Command - Payment**
```
✅ Payment cancelled. You can continue using your trial messages or try subscribing again later.
```

### **Cancel Command - Phone Registration**
```
✅ Phone registration cancelled. You can start over by sending "start".
```

### **Cancel Command - Nothing to Cancel**
```
There's nothing to cancel right now. You can use "help" to see available commands.
```

### **Help Command**
```
🤖 **Available Commands:**

• **start** - Restart the bot and begin onboarding
• **resetme** - Reset your daily message count
• **cancel** - Cancel current operation (payment, registration)
• **status** - Check your current status and usage
• **help** - Show this help message

💡 **Usage Limits:**
• Trial: 3 messages per day
• Subscribers: 30 messages per day

📞 **Support:** Contact us if you need assistance.
```

### **Status Command**
```
📊 **Your Status:**

🆔 **User ID:** [messengerId]
📱 **Mobile:** [mobileNumber]
📋 **Stage:** [stage]
📅 **Current Time:** [timestamp]

🆓 **Trial Status:**
• Messages used today: [trialMessagesUsedToday]/3
• Trial used: [hasUsedTrial]

💳 **Subscription Status:**
• Plan: [plan]
• Status: [status]
• Messages used today: [dailyMessageCount]/30
• Expires: [expiryDate]
```

---

## ❌ **Error Messages**

### **AI Service Error**
```
I apologize, but I'm having trouble processing your request right now. Please try again in a moment.
```

### **Command Processing Error**
```
Sorry, there was an error processing your command. Please try again.
```

### **Invalid Command**
```
Invalid command. Available commands: start, resetme, cancel, help, status
```

### **General Error**
```
Sorry, there was an error processing your request. Please try again.
```

---

## 🔄 **Retry and Recovery Messages**

### **Try Different Number Prompt**
```
Please enter a different MTN mobile number (e.g., 092xxxxxxx).

Make sure this number hasn't been used for a trial before.
```

### **Awaiting Payment Message**
```
Please complete your payment to continue.
```

---

## 📊 **System Messages**

### **User Processing Log**
```
👤 Processing message from user: [messengerId]
📝 User message: "[messageText]" | Stage: [stage] | Trial messages: [trialMessagesUsedToday]/3
🔄 Processing user stage: [stage]
📊 Message limits check - Plan: [plan], Trial used: [trialMessagesUsedToday], Daily count: [dailyMessageCount]
🛑 User [messengerId] reached trial limit (3 messages)
✅ Trial message count updated: [trialMessagesUsedToday]/3
🚀 Proceeding to AI response generation
✅ AI response sent successfully to user [messengerId]
```

### **Payment Processing Log**
```
💰 Payment callback received: [body]
✅ Payment completed for user [messengerId]
❌ Payment failed for user [messengerId]
```

---

## 🎯 **Message Content Verification Checklist**

### **Welcome Flow**
- [ ] Welcome message (2 parts) matches exactly
- [ ] Consent button text matches exactly
- [ ] Button payloads are correct

### **Phone Number Flow**
- [ ] Phone request messages match exactly
- [ ] Validation error messages match exactly
- [ ] Success confirmation messages match exactly

### **Trial Flow**
- [ ] Trial activation message matches exactly
- [ ] Trial limit reached message matches exactly
- [ ] Trial already used message matches exactly

### **Subscription Flow**
- [ ] Subscription options text matches exactly
- [ ] Payment processing message matches exactly
- [ ] Payment success/failure messages match exactly

### **Command Flow**
- [ ] All command response messages match exactly
- [ ] Help command output matches exactly
- [ ] Status command output format matches exactly

### **Error Flow**
- [ ] All error messages match exactly
- [ ] Error handling is consistent
- [ ] Recovery messages are appropriate

---

## 📝 **Message Content Guidelines**

1. **Exact Match Required**: All messages must match the content exactly as specified
2. **No Alterations**: Do not change, modify, or alter any message content
3. **Consistent Formatting**: Maintain emoji usage and formatting as specified
4. **Proper Escaping**: Ensure special characters are properly escaped
5. **Character Limits**: Respect Facebook Messenger character limits
6. **Localization**: All messages are in English as specified

---

## 🔧 **Implementation Notes**

- All messages are stored in the `messengerService.js` file
- Welcome message is split into two parts due to length
- Button payloads are defined in the webhook controller
- Error messages are handled in try-catch blocks
- Command messages are handled in the command service
- Payment messages are handled in the MoMo service

---

## ✅ **Verification Process**

1. **Content Review**: Verify all message content matches exactly
2. **Flow Testing**: Test each message in the correct context
3. **Button Testing**: Verify all button payloads work correctly
4. **Error Testing**: Test error message display
5. **Character Count**: Verify messages fit within limits
6. **Localization**: Confirm all messages are in English
7. **Consistency**: Ensure consistent tone and formatting 