# Answer Bot AI - Manual Test Checklist

## 📋 **Manual Testing Overview**
This checklist provides step-by-step instructions for manually testing all user interaction flows in the Answer Bot AI chatbot. Follow each step carefully and verify the expected behavior.

---

## 🎯 **Test Environment Setup**

### **Prerequisites**
- [ ] Facebook Messenger app installed
- [ ] Access to the Answer Bot AI Facebook page
- [ ] Test MTN mobile numbers (092xxxxxxxx)
- [ ] Test payment credentials (if testing payment flow)
- [ ] Database access for verification

### **Test Data Preparation**
- [ ] Prepare test user accounts
- [ ] Prepare test phone numbers
- [ ] Prepare test payment scenarios
- [ ] Clear any existing test data

---

## 🧪 **Test Scenarios**

### **1. New User Onboarding Flow**

#### **Test Case 1.1: User Sends "Hi" (New User)**
**Steps:**
1. Open Facebook Messenger
2. Navigate to Answer Bot AI page
3. Send "Hi" or any initial message
4. Wait for response

**Expected Results:**
- [ ] System creates new user record in database
- [ ] Welcome message (2 parts) is sent
- [ ] Consent button appears with "I Agree" and "Start Free Trial" options
- [ ] User stage in database is set to `initial`

**Verification:**
- [ ] Check database: `User.findOne({ messengerId: 'test_user_id' })`
- [ ] Verify `stage: 'initial'`
- [ ] Verify `consentTimestamp: null`

---

#### **Test Case 1.2: User Clicks "I Agree"**
**Steps:**
1. Click "I Agree" button
2. Wait for response

**Expected Results:**
- [ ] User consent timestamp is recorded
- [ ] User stage changes to `awaiting_phone`
- [ ] Phone number request message is sent
- [ ] Message content matches exactly: "Thank you for accepting our terms and conditions. To continue, please enter your own MTN mobile number (e.g., 092xxxxxxx). Providing your number helps us verify your eligibility for the free trial and ensures the security of your account."

**Verification:**
- [ ] Check database: `consentTimestamp` is set
- [ ] Check database: `stage: 'awaiting_phone'`

---

#### **Test Case 1.3: User Clicks "Start Free Trial"**
**Steps:**
1. Click "Start Free Trial" button
2. Wait for response

**Expected Results:**
- [ ] If user hasn't used trial: Trial is activated
- [ ] Trial activation message is sent: "Welcome to your free trial! You can send up to 3 messages per day. Try it out now!"
- [ ] If user has used trial: Subscription prompt is shown

**Verification:**
- [ ] Check database: `hasUsedTrial: true`
- [ ] Check database: `stage: 'trial'` (if trial activated)

---

### **2. Phone Number Validation Flow**

#### **Test Case 2.1: Valid MTN Number (First Time)**
**Steps:**
1. Enter valid MTN number: "0921234567"
2. Send message
3. Wait for response

**Expected Results:**
- [ ] Number is validated (starts with 092)
- [ ] Number is checked in database
- [ ] If not used: Number is accepted, trial is activated
- [ ] Success message: "✅ Your number has been registered. You can now use your daily free trial of 3 messages. Try asking me anything!"

**Verification:**
- [ ] Check database: `mobileNumber: '0921234567'`
- [ ] Check database: `stage: 'trial'`
- [ ] Check database: `hasUsedTrial: true`

---

#### **Test Case 2.2: Invalid Number Format**
**Steps:**
1. Enter invalid number: "1234567890"
2. Send message
3. Wait for response

**Expected Results:**
- [ ] Number format is rejected
- [ ] Error message: "Sorry, that doesn't look like a valid MTN South Sudan number. Please enter a number starting with 092 (e.g., 092xxxxxxx)."

**Verification:**
- [ ] Check database: `mobileNumber` is not set
- [ ] Check database: `stage` remains unchanged

---

#### **Test Case 2.3: Number Already Used**
**Steps:**
1. Enter number that exists in database: "0921234567"
2. Send message
3. Wait for response

**Expected Results:**
- [ ] Number is validated
- [ ] Database check finds existing usage
- [ ] Error message: "⚠️ This MTN number has already been used for a free trial. Please try a different number or subscribe to unlock full access."
- [ ] Options shown: "Try Different Number", "Weekly Plan 3,000 SSP", "Monthly Plan 6,500 SSP"

**Verification:**
- [ ] Check database: `mobileNumber` is not set for current user
- [ ] Verify existing user with this number exists

---

### **3. Free Trial Flow**

#### **Test Case 3.1: Trial User Sends Message (Within Limit)**
**Steps:**
1. Send any message during trial (0-2 messages used)
2. Wait for AI response

**Expected Results:**
- [ ] Message is processed through AI
- [ ] AI response is returned
- [ ] Trial usage count is incremented in database

**Verification:**
- [ ] Check database: `trialMessagesUsedToday` is incremented
- [ ] Verify AI response is received

---

#### **Test Case 3.2: Trial User Reaches Daily Limit**
**Steps:**
1. Send message after using 3 messages
2. Wait for response

**Expected Results:**
- [ ] Trial limit check is performed
- [ ] "Trial Over" message: "🛑 You've reached your daily free trial limit. Subscribe for premium access!"
- [ ] Subscription prompt is shown immediately

**Verification:**
- [ ] Check database: `trialMessagesUsedToday: 3`
- [ ] Verify subscription options are shown

---

#### **Test Case 3.3: Trial Reset After Midnight**
**Steps:**
1. Wait until after midnight
2. Send a message
3. Check if trial is reset

**Expected Results:**
- [ ] Daily usage is automatically reset
- [ ] User can send 3 more free messages

**Verification:**
- [ ] Check database: `trialMessagesUsedToday: 0`
- [ ] Check database: `lastTrialResetDate` is updated

---

#### **Test Case 3.4: Manual Trial Reset Command**
**Steps:**
1. Send "resetme" command
2. Wait for response

**Expected Results:**
- [ ] Command is recognized
- [ ] Trial count is manually reset to 0
- [ ] Confirmation message: "✅ Your daily usage has been reset! You can now use your messages again: • Trial users: 3 messages per day • Subscribers: 30 messages per day Your conversation history has also been cleared."

**Verification:**
- [ ] Check database: `trialMessagesUsedToday: 0`
- [ ] Check database: `lastTrialResetDate` is updated
- [ ] Check database: Conversation history is cleared

---

### **4. Subscription Flow**

#### **Test Case 4.1: User Clicks Weekly Plan**
**Steps:**
1. Click "Weekly Plan 3,000 SSP" button
2. Wait for response

**Expected Results:**
- [ ] Phone number prompt for payment: "To continue, please enter your MTN mobile number (e.g., 092xxxxxxx) for payment processing."
- [ ] Stage changes to 'awaiting_phone_for_payment'

**Verification:**
- [ ] Check database: `lastSelectedPlanType: 'weekly'`
- [ ] Check database: `stage: 'awaiting_phone_for_payment'`

---

#### **Test Case 4.2: Payment Phone Number Collection**
**Steps:**
1. Enter any valid MTN number (e.g., "0921234567") for payment
2. Send message

**Expected Results:**
- [ ] Number is validated
- [ ] Payment processing starts immediately
- [ ] Payment processing message: "⏳ Your payment is being processed. Please check your phone for a payment prompt. Complete the transaction within 15 minutes. Type "cancel" to cancel this payment."
- [ ] Stage changes to 'awaiting_payment'

**Verification:**
- [ ] Check database: `paymentMobileNumber` is set (separate from trial `mobileNumber`)
- [ ] Check database: `stage: 'awaiting_payment'`

---

#### **Test Case 4.3: Payment Phone Number - Same as Trial Number**
**Steps:**
1. Use a phone number that was previously used for trial (e.g., "0921234567")
2. Enter this number for payment processing
3. Send message

**Expected Results:**
- [ ] Number is accepted for payment (no trial usage check)
- [ ] Payment processing starts immediately
- [ ] No error about trial usage

**Verification:**
- [ ] Check database: `paymentMobileNumber` is set to the trial number
- [ ] Check database: `mobileNumber` remains unchanged (trial number)
- [ ] Both numbers are stored separately

---

#### **Test Case 4.2: User Clicks Monthly Plan**
**Steps:**
1. Click "Monthly Plan 6,500 SSP" button
2. Wait for response

**Expected Results:**
- [ ] Same as weekly plan but with monthly pricing
- [ ] Payment processing message is sent

**Verification:**
- [ ] Check database: `lastSelectedPlanType: 'monthly'`

---

#### **Test Case 4.3: Payment Success**
**Steps:**
1. Complete payment successfully
2. Wait for callback processing
3. Check for success message

**Expected Results:**
- [ ] Payment callback is processed
- [ ] User subscription status is updated
- [ ] Success message: "🎉 Payment successful! Your subscription is now active. You can now send up to 30 messages per day. Enjoy using Answer Bot AI!"

**Verification:**
- [ ] Check database: `subscription.status: 'active'`
- [ ] Check database: `subscription.planType: 'weekly'` or `'monthly'`
- [ ] Check database: `stage: 'subscribed'`

---

#### **Test Case 4.4: Payment Failure**
**Steps:**
1. Simulate payment failure
2. Wait for callback processing
3. Check for failure message

**Expected Results:**
- [ ] Payment callback is processed
- [ ] Payment status is updated
- [ ] Failure message: "❌ Payment failed. You can continue using your trial messages or try subscribing again later."

**Verification:**
- [ ] Check database: `paymentSession.status: 'failed'`
- [ ] Check database: User remains in trial state

---

### **5. Paid Subscriber Flow**

#### **Test Case 5.1: Paid User Sends Message (Within Limit)**
**Steps:**
1. Send message as paid user (0-29 messages used)
2. Wait for AI response

**Expected Results:**
- [ ] Daily message count is checked
- [ ] Message is processed through AI
- [ ] AI response is returned
- [ ] Daily usage count is incremented

**Verification:**
- [ ] Check database: `dailyMessageCount` is incremented
- [ ] Verify AI response is received

---

#### **Test Case 5.2: Paid User Reaches Daily Limit**
**Steps:**
1. Send message after 30 messages
2. Wait for response

**Expected Results:**
- [ ] Daily limit check is performed
- [ ] "Daily Limit Reached" message: "You've reached your daily message limit. Try again tomorrow!"

**Verification:**
- [ ] Check database: `dailyMessageCount: 30`
- [ ] Verify limit message is shown

---

#### **Test Case 5.3: Subscription Expired**
**Steps:**
1. Send message with expired subscription
2. Wait for response

**Expected Results:**
- [ ] Subscription expiry is checked
- [ ] "Subscription Expired" message: "Your subscription has expired. Please renew to continue using the service."
- [ ] Subscription prompt is shown

**Verification:**
- [ ] Check database: `subscription.status: 'expired'`
- [ ] Check database: `stage: 'subscription_expired'`

---

### **6. Command Processing Flow**

#### **Test Case 6.1: Reset Command**
**Steps:**
1. Send "resetme" command
2. Wait for response

**Expected Results:**
- [ ] Command is recognized
- [ ] Daily usage counts are reset
- [ ] Conversation history is cleared
- [ ] Confirmation message is sent

**Verification:**
- [ ] Check database: `trialMessagesUsedToday: 0`
- [ ] Check database: `dailyMessageCount: 0`
- [ ] Check database: Conversation is cleared

---

#### **Test Case 6.2: Cancel Command**
**Steps:**
1. Send "cancel" command during payment/registration
2. Wait for response

**Expected Results:**
- [ ] Command is recognized
- [ ] Current operation is cancelled
- [ ] Appropriate cancellation message is sent

**Verification:**
- [ ] Check database: User stage is reset appropriately
- [ ] Check database: Payment session is cleared (if applicable)

---

#### **Test Case 6.3: Start Command**
**Steps:**
1. Send "start" command
2. Wait for response

**Expected Results:**
- [ ] Command is recognized
- [ ] User is reset to initial state
- [ ] Welcome message is sent
- [ ] All data is cleared

**Verification:**
- [ ] Check database: `stage: 'initial'`
- [ ] Check database: All user data is reset
- [ ] Check database: Conversation is cleared

---

#### **Test Case 6.4: Help Command**
**Steps:**
1. Send "help" command
2. Wait for response

**Expected Results:**
- [ ] Command is recognized
- [ ] Help message is sent with available commands
- [ ] Usage limits are shown

**Verification:**
- [ ] Verify help message content matches exactly
- [ ] Verify all commands are listed

---

#### **Test Case 6.5: Status Command**
**Steps:**
1. Send "status" command
2. Wait for response

**Expected Results:**
- [ ] Command is recognized
- [ ] Detailed status message is sent
- [ ] Current usage and subscription info is shown

**Verification:**
- [ ] Verify status message format matches exactly
- [ ] Verify all user data is displayed correctly

---

### **7. Error Handling Flow**

#### **Test Case 7.1: AI Service Error**
**Steps:**
1. Simulate AI service unavailability
2. Send a message
3. Wait for response

**Expected Results:**
- [ ] AI service error is caught
- [ ] Error message: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment."

**Verification:**
- [ ] Verify error message is sent
- [ ] Check logs for error details

---

#### **Test Case 7.2: Database Connection Error**
**Steps:**
1. Simulate database connection failure
2. Try to send a message
3. Check system behavior

**Expected Results:**
- [ ] Error is logged
- [ ] Reconnection is attempted
- [ ] System continues operation when possible

**Verification:**
- [ ] Check logs for connection errors
- [ ] Verify system recovery

---

#### **Test Case 7.3: Payment Service Error**
**Steps:**
1. Simulate payment service unavailability
2. Try to initiate payment
3. Check error handling

**Expected Results:**
- [ ] Payment service error is caught
- [ ] Appropriate error message is sent
- [ ] User can retry or cancel

**Verification:**
- [ ] Verify error message is sent
- [ ] Check logs for payment errors

---

## 🔄 **Repeatable Processes Testing**

### **Button Response Handling**
- [ ] All button clicks are processed consistently
- [ ] Postback events update user stage appropriately
- [ ] Error handling is consistent across all buttons

### **Trial and Subscription Flow Redirection**
- [ ] Users can move between trial and subscription states
- [ ] State transitions are logged and tracked
- [ ] Error recovery maintains user state integrity

### **Error Handling and Feedback Loops**
- [ ] All errors are logged with user context
- [ ] Users receive clear error messages
- [ ] System recovers gracefully from errors

---

## 📊 **Database Interaction Verification**

### **User Record Management**
- [ ] New users are created with correct initial values
- [ ] User updates are atomic and consistent
- [ ] Stage transitions are properly tracked

### **Usage Tracking**
- [ ] Daily message counts are accurate
- [ ] Trial usage resets daily
- [ ] Subscription usage tracks correctly

### **Payment Session Management**
- [ ] Payment sessions are created and tracked
- [ ] Payment callbacks update user status correctly
- [ ] Failed payments reset user state appropriately

---

## ✅ **Final Verification Checklist**

### **Message Content Accuracy**
- [ ] All welcome messages match exactly
- [ ] All error messages match exactly
- [ ] All command responses match exactly
- [ ] All payment messages match exactly

### **Flow Completeness**
- [ ] New user onboarding works end-to-end
- [ ] Phone number validation works correctly
- [ ] Trial management works properly
- [ ] Subscription flow works completely
- [ ] Paid user experience works correctly
- [ ] Command processing works for all commands
- [ ] Error handling works for all scenarios

### **Database Integrity**
- [ ] All user data is saved correctly
- [ ] All updates are atomic
- [ ] All relationships are maintained
- [ ] All cleanup operations work

### **Performance and Reliability**
- [ ] Response times are acceptable
- [ ] System handles concurrent users
- [ ] System recovers from errors
- [ ] Logging provides adequate debugging info

---

## 📝 **Test Results Documentation**

### **Test Execution Log**
- [ ] Document all test cases executed
- [ ] Record any failures or issues
- [ ] Note any unexpected behavior
- [ ] Document performance observations

### **Issue Tracking**
- [ ] Create tickets for any bugs found
- [ ] Document steps to reproduce issues
- [ ] Prioritize issues by severity
- [ ] Track resolution status

### **Test Report**
- [ ] Generate comprehensive test report
- [ ] Include pass/fail statistics
- [ ] Document any workarounds needed
- [ ] Provide recommendations for improvements

---

## 🚀 **Next Steps After Testing**

1. **Address Issues**: Fix any bugs or issues found during testing
2. **Performance Optimization**: Optimize any performance bottlenecks
3. **Security Review**: Conduct security testing of payment flows
4. **User Acceptance Testing**: Conduct UAT with real users
5. **Production Deployment**: Deploy to production environment
6. **Monitoring Setup**: Set up monitoring and alerting
7. **Documentation Update**: Update user and technical documentation 