# Answer Bot AI - Comprehensive User Interaction Flow Test Plan

## 🎯 **Test Overview**
This document provides a thorough testing framework for the Answer Bot AI chatbot, covering all user interaction scenarios from initial contact through subscription management.

---

## 📋 **Test Scenarios**

### **1. New User Onboarding Flow**

#### **Test Case 1.1: User Sends "Hi" (New User)**
- **Input**: User sends "Hi" or any initial message
- **Expected Flow**:
  1. System creates new user record in MongoDB
  2. Sends welcome message (2-part message)
  3. Shows consent button with "I Agree" and "Start Free Trial" options
- **Database Check**: Verify user record created with `stage: 'initial'`

#### **Test Case 1.2: User Clicks "I Agree"**
- **Input**: User clicks "I Agree" button
- **Expected Flow**:
  1. Updates user consent timestamp
  2. Changes stage to `awaiting_phone`
  3. Sends phone number request message
- **Message Content**: "Thank you for accepting our terms and conditions. To continue, please enter your own MTN mobile number (e.g., 092xxxxxxx). Providing your number helps us verify your eligibility for the free trial and ensures the security of your account."

#### **Test Case 1.3: User Clicks "Start Free Trial"**
- **Input**: User clicks "Start Free Trial" button
- **Expected Flow**:
  1. Checks if user has used trial before
  2. If not used: Activates trial, sends trial activation message
  3. If used: Sends subscription prompt
- **Message Content**: "Welcome to your free trial! You can send up to 3 messages per day. Try it out now!"

---

### **2. Phone Number Validation Flow**

#### **Test Case 2.1: Valid MTN Number (First Time)**
- **Input**: User enters "0921234567"
- **Expected Flow**:
  1. Validates number format (starts with 092)
  2. Checks if number exists in database
  3. If not used: Accepts number, activates trial
  4. Sends confirmation message
- **Message Content**: "✅ Your number has been registered. You can now use your daily free trial of 3 messages. Try asking me anything!"

#### **Test Case 2.2: Invalid Number Format**
- **Input**: User enters "1234567890" or "0912345678"
- **Expected Flow**:
  1. Validates number format
  2. Rejects invalid format
  3. Sends error message with correct format
- **Message Content**: "Sorry, that doesn't look like a valid MTN South Sudan number. Please enter a number starting with 092 (e.g., 092xxxxxxx)."

#### **Test Case 2.3: Number Already Used**
- **Input**: User enters "0921234567" (already in database)
- **Expected Flow**:
  1. Validates number format
  2. Checks database for existing usage
  3. Sends "number already used" message
  4. Shows options: "Try Different Number" and subscription plans
- **Message Content**: "⚠️ This MTN number has already been used for a free trial. Please try a different number or subscribe to unlock full access."

---

### **3. Free Trial Flow**

#### **Test Case 3.1: Trial User Sends Message (Within Limit)**
- **Input**: User sends any message during trial
- **Expected Flow**:
  1. Checks daily trial usage (0-2 messages used)
  2. Processes message through AI
  3. Returns AI response
  4. Updates usage count in database
- **Database Update**: `trialMessagesUsedToday += 1`

#### **Test Case 3.2: Trial User Reaches Daily Limit**
- **Input**: User sends message after using 3 messages
- **Expected Flow**:
  1. Checks daily trial usage (3 messages used)
  2. Sends "Trial Over" message
  3. Immediately shows subscription prompt
- **Message Content**: "🛑 You've reached your daily free trial limit. Subscribe for premium access!"

#### **Test Case 3.3: Trial Reset After Midnight**
- **Input**: User returns after midnight
- **Expected Flow**:
  1. System automatically resets daily usage
  2. User can send 3 more free messages
- **Database Update**: `trialMessagesUsedToday = 0`, `lastTrialResetDate = today`

#### **Test Case 3.4: Manual Trial Reset Command**
- **Input**: User sends "resetme"
- **Expected Flow**:
  1. Recognizes command
  2. Manually resets trial count to 0
  3. Sends confirmation message
- **Message Content**: "✅ Your daily usage has been reset! You can now use your messages again: • Trial users: 3 messages per day • Subscribers: 30 messages per day Your conversation history has also been cleared."

---

### **4. Subscription Flow**

#### **Test Case 4.1: User Clicks Weekly Plan**
- **Input**: User clicks "Weekly Plan 3,000 SSP"
- **Expected Flow**:
  1. If no mobile number: Prompts for phone number
  2. If has mobile number: Initiates payment
  3. Sends payment processing message
- **Message Content**: "⏳ Your payment is being processed. Please check your phone for a payment prompt. Complete the transaction within 15 minutes. Type "cancel" to cancel this payment."

#### **Test Case 4.2: User Clicks Monthly Plan**
- **Input**: User clicks "Monthly Plan 6,500 SSP"
- **Expected Flow**: Same as weekly plan but with monthly pricing

#### **Test Case 4.3: Payment Success**
- **Input**: MTN MoMo payment callback with SUCCESSFUL status
- **Expected Flow**:
  1. Updates user subscription status
  2. Sends success message
  3. Updates database: User is now paid
- **Message Content**: "🎉 Payment successful! Your subscription is now active. You can now send up to 30 messages per day. Enjoy using Answer Bot AI!"

#### **Test Case 4.4: Payment Failure**
- **Input**: MTN MoMo payment callback with FAILED status
- **Expected Flow**:
  1. Updates payment status
  2. Sends failure message
  3. Resets user to trial state
- **Message Content**: "❌ Payment failed. You can continue using your trial messages or try subscribing again later."

---

### **5. Paid Subscriber Flow**

#### **Test Case 5.1: Paid User Sends Message (Within Limit)**
- **Input**: Paid user sends message (0-29 messages used)
- **Expected Flow**:
  1. Checks daily message count
  2. Processes message through AI
  3. Returns AI response
  4. Updates usage count
- **Database Update**: `dailyMessageCount += 1`

#### **Test Case 5.2: Paid User Reaches Daily Limit**
- **Input**: Paid user sends message after 30 messages
- **Expected Flow**:
  1. Checks daily message count (30 messages used)
  2. Sends "Daily Limit Reached" message
- **Message Content**: "You've reached your daily message limit. Try again tomorrow!"

#### **Test Case 5.3: Subscription Expired**
- **Input**: Paid user with expired subscription sends message
- **Expected Flow**:
  1. Checks subscription expiry date
  2. Sends "Subscription Expired" message
  3. Shows subscription prompt
- **Message Content**: "Your subscription has expired. Please renew to continue using the service."

---

### **6. Command Processing Flow**

#### **Test Case 6.1: Reset Command**
- **Input**: User sends "resetme"
- **Expected Flow**:
  1. Recognizes command
  2. Resets daily usage counts
  3. Clears conversation history
  4. Sends confirmation
- **Database Updates**: `trialMessagesUsedToday = 0`, `dailyMessageCount = 0`

#### **Test Case 6.2: Cancel Command**
- **Input**: User sends "cancel"
- **Expected Flow**:
  1. Recognizes command
  2. Cancels current operation based on stage
  3. Sends appropriate cancellation message

#### **Test Case 6.3: Start Command**
- **Input**: User sends "start"
- **Expected Flow**:
  1. Recognizes command
  2. Resets user to initial state
  3. Sends welcome message
  4. Clears all data

#### **Test Case 6.4: Help Command**
- **Input**: User sends "help"
- **Expected Flow**:
  1. Recognizes command
  2. Sends help message with available commands
- **Message Content**: "🤖 **Available Commands:** • **start** - Restart the bot and begin onboarding • **resetme** - Reset your daily message count • **cancel** - Cancel current operation (payment, registration) • **status** - Check your current status and usage • **help** - Show this help message"

#### **Test Case 6.5: Status Command**
- **Input**: User sends "status"
- **Expected Flow**:
  1. Recognizes command
  2. Sends detailed status message
- **Message Content**: "📊 **Your Status:** 🆔 **User ID:** [messengerId] 📱 **Mobile:** [mobileNumber] 📋 **Stage:** [stage] 📅 **Current Time:** [timestamp]"

---

### **7. Error Handling Flow**

#### **Test Case 7.1: AI Service Error**
- **Input**: AI service unavailable
- **Expected Flow**:
  1. Catches AI service error
  2. Sends error message to user
- **Message Content**: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment."

#### **Test Case 7.2: Database Connection Error**
- **Input**: MongoDB connection fails
- **Expected Flow**:
  1. Logs error
  2. Attempts reconnection
  3. Continues operation when possible

#### **Test Case 7.3: Payment Service Error**
- **Input**: MTN MoMo service unavailable
- **Expected Flow**:
  1. Catches payment service error
  2. Sends appropriate error message
  3. Allows user to retry or cancel

---

## 🔄 **Repeatable Processes**

### **Button Response Handling**
- All button clicks should be processed consistently
- Postback events should update user stage appropriately
- Error handling should be consistent across all buttons

### **Trial and Subscription Flow Redirection**
- Users should be able to move between trial and subscription states
- State transitions should be logged and tracked
- Error recovery should maintain user state integrity

### **Error Handling and Feedback Loops**
- All errors should be logged with user context
- Users should receive clear error messages
- System should recover gracefully from errors

---

## 📊 **Database Interaction Verification**

### **User Record Management**
- New users should be created with correct initial values
- User updates should be atomic and consistent
- Stage transitions should be properly tracked

### **Usage Tracking**
- Daily message counts should be accurate
- Trial usage should reset daily
- Subscription usage should track correctly

### **Payment Session Management**
- Payment sessions should be created and tracked
- Payment callbacks should update user status correctly
- Failed payments should reset user state appropriately

---

## 🎯 **Success Criteria**

1. **All test cases pass** with expected behavior
2. **Database interactions** work correctly and consistently
3. **Message content** matches exactly as specified
4. **Error handling** is robust and user-friendly
5. **State management** is consistent across all flows
6. **Performance** meets acceptable response times
7. **Logging** provides adequate debugging information

---

## 📝 **Testing Checklist**

- [ ] New user onboarding flow
- [ ] Phone number validation
- [ ] Free trial management
- [ ] Subscription flow
- [ ] Paid user experience
- [ ] Command processing
- [ ] Error handling
- [ ] Database interactions
- [ ] Message content accuracy
- [ ] State transitions
- [ ] Payment processing
- [ ] Usage tracking
- [ ] Reset functionality
- [ ] Help and support features

---

## 🚀 **Next Steps**

1. **Run automated tests** for each scenario
2. **Manual testing** of critical user flows
3. **Load testing** for concurrent users
4. **Security testing** for payment flows
5. **Performance monitoring** in production
6. **User feedback collection** and iteration 