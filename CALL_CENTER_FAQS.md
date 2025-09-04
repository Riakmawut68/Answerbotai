# MOMO Call Center Agent FAQs - Answer Bot AI

## Table of Contents
1. [General Bot Information](#general-bot-information)
2. [User Onboarding & Registration](#user-onboarding--registration)
3. [Free Trial System](#free-trial-system)
4. [Subscription Plans & Payments](#subscription-plans--payments)
5. [Payment Issues & Troubleshooting](#payment-issues--troubleshooting)
6. [Usage Limits & Restrictions](#usage-limits--restrictions)
7. [Technical Issues](#technical-issues)
8. [Account Management](#account-management)
9. [Common Error Messages](#common-error-messages)
10. [Escalation Procedures](#escalation-procedures)

---

## General Bot Information

### Q1: What is Answer Bot AI?
**A:** Answer Bot AI is an AI-powered Facebook Messenger bot that provides educational assistance in academics, business, agriculture, health, and general knowledge. Users can ask questions and receive AI-generated responses.

### Q2: How do users access the bot?
**A:** Users access the bot through Facebook Messenger by searching for "Answer Bot AI" or clicking on a link that opens the conversation.

### Q3: What languages does the bot support?
**A:** Currently, the bot primarily supports English, though it can understand and respond to questions in various languages.

---

## User Onboarding & Registration

### Q4: What happens when a user first starts the bot?
**A:** 
1. User sends "start" or begins conversation
2. Bot sends welcome message with terms and conditions
3. User must click "I Agree" to continue
4. Bot requests MTN mobile number (format: 092xxxxxxx)
5. System validates the number and activates free trial

### Q5: What phone number format is required?
**A:** Users must enter a valid MTN South Sudan number in the format: **092xxxxxxx** (10 digits total, starting with 092).

### Q6: Why does the bot need my phone number?
**A:** The phone number is used for:
- Verifying eligibility for free trial
- Processing subscription payments
- Ensuring account security
- Preventing duplicate trial usage

### Q7: What if a user doesn't have an MTN number?
**A:** Currently, only MTN South Sudan numbers are supported. Users with other carriers cannot use the service.

---

## Free Trial System

### Q8: How does the free trial work?
**A:** 
- **Duration:** 3 messages per day
- **Eligibility:** New users with unused MTN numbers
- **Reset:** Daily at midnight (Juba time)
- **One-time use:** Each phone number can only use the trial once

### Q9: What happens when trial messages are used up?
**A:** Users receive a message asking them to subscribe to continue:
- Weekly Plan: 3,000 SSP for 30 messages/day
- Monthly Plan: 6,500 SSP for 30 messages/day

### Q10: Can users get another free trial with a different number?
**A:** Yes, but each MTN number can only be used for one trial. Users would need a different MTN number for another trial.

### Q11: What if a user's number was already used for trial?
**A:** The system will automatically detect this and show subscription options instead of activating another trial.

---

## Subscription Plans & Payments

### Q12: What subscription plans are available?
**A:** 
- **Weekly Plan:** 3,000 SSP - 30 messages per day
- **Monthly Plan:** 6,500 SSP - 30 messages per day + extended features

### Q13: How do users subscribe?
**A:** 
1. User reaches trial limit or selects subscription
2. Bot shows plan options
3. User selects plan (Weekly/Monthly)
4. Bot requests payment phone number
5. User enters MTN number for payment
6. MTN MoMo payment prompt sent to user's phone
7. User completes payment on phone
8. Subscription activated immediately

### Q14: What payment method is accepted?
**A:** Only MTN MoMo (Mobile Money) payments are accepted through the user's MTN phone number.

### Q15: How long does payment processing take?
**A:** 
- **Normal flow:** Up to 15 minutes (user must complete payment on phone)
- **Test numbers (development):** Instant activation
- **Payment timeout:** 15 minutes if not completed

### Q16: What happens after successful payment?
**A:** Users receive a success message with:
- Plan details and cost
- Daily message limit (30)
- Expiry date and time
- Instructions to start asking questions

---

## Payment Issues & Troubleshooting

### Q17: What if payment fails?
**A:** 
- User receives "Payment failed" message
- Can continue using remaining trial messages
- Can try subscribing again later
- No charges are made for failed payments

### Q18: What if user doesn't receive payment prompt?
**A:** 
- Check if phone number is correct (092xxxxxxx format)
- Ensure phone has network coverage
- Wait up to 15 minutes for prompt
- Contact support if issue persists

### Q19: What if payment times out?
**A:** 
- Payment session expires after 15 minutes
- User can try subscribing again
- No charges are made for timed-out payments

### Q20: Can users cancel a payment?
**A:** Yes, users can type "cancel" during payment processing to cancel the transaction.

### Q21: What if user enters wrong payment phone number?
**A:** The payment will fail. Users should ensure they enter the correct MTN number that has the MoMo account they want to use for payment.

---

## Usage Limits & Restrictions

### Q22: How many messages can users send per day?
**A:** 
- **Free Trial:** 3 messages per day
- **Subscribed Users:** 30 messages per day
- **Reset Time:** Midnight (Juba time)

### Q23: What happens when daily limit is reached?
**A:** Users receive message: "You've reached your daily message limit. Try again tomorrow!"

### Q24: Do unused messages carry over to next day?
**A:** No, message limits reset daily at midnight (Juba time). Unused messages do not accumulate.

### Q25: What types of questions can users ask?
**A:** The bot specializes in:
- Academic subjects and homework help
- Business advice and strategies
- Agricultural information and tips
- General health information (not medical advice)
- General knowledge questions

---

## Technical Issues

### Q26: What if bot doesn't respond?
**A:** 
- Check if user has reached daily message limit
- Verify internet connection
- Try refreshing the Messenger conversation
- Contact support if issue persists

### Q27: What if bot gives incorrect or irrelevant answers?
**A:** 
- Users can rephrase their question
- Bot learns from conversation context
- Report specific issues to support team
- AI responses are for general guidance only

### Q28: What if messages are not delivered?
**A:** 
- Check Messenger app status
- Ensure user hasn't blocked the bot
- Verify internet connectivity
- Contact Facebook support if needed

---

## Account Management

### Q29: How can users check their subscription status?
**A:** Users can type "status" to see:
- Current plan type
- Messages used today
- Subscription expiry date
- Account status

### Q30: What happens when subscription expires?
**A:** 
- Bot sends expiry notification
- Shows renewal options (Weekly/Monthly plans)
- User must subscribe again to continue

### Q31: Can users change their subscription plan?
**A:** Users can select a different plan when their current subscription expires. There's no mid-subscription plan switching.

### Q32: How can users contact support?
**A:** Users can:
- Report issues through the bot
- Contact support team directly
- Use the escalation procedures below

---

## Common Error Messages

### Q33: "Invalid MTN number format"
**A:** User must enter number in format: 092xxxxxxx (10 digits, starting with 092)

### Q34: "This MTN number has already been used for a free trial"
**A:** User needs to subscribe or use a different MTN number

### Q35: "Payment failed"
**A:** Payment was unsuccessful. User can try again or contact support

### Q36: "You've reached your daily message limit"
**A:** User has used all daily messages. Wait until midnight or subscribe for more

---

## Escalation Procedures

### Q37: When should agents escalate issues?
**A:** Escalate when:
- Payment issues persist after troubleshooting
- Technical problems affect multiple users
- Security concerns arise
- User complaints about AI responses
- System outages occur

### Q38: How to escalate payment issues?
**A:** 
1. Collect user details (Messenger ID, phone number, error message)
2. Check payment logs in system
3. Contact technical team with reference numbers
4. Follow up with user within 24 hours

### Q39: How to handle user complaints about AI responses?
**A:** 
1. Acknowledge the concern
2. Collect specific examples
3. Explain that responses are AI-generated
4. Report to development team for improvement
5. Offer alternative assistance if possible

---

## Additional Notes for Agents

### Key Points to Remember:
- **Phone Format:** Always verify 092xxxxxxx format
- **Trial Limit:** 3 messages per day, one-time use per number
- **Payment:** MTN MoMo only, 15-minute timeout
- **Reset Time:** Daily limits reset at midnight (Juba time)
- **Support:** Escalate complex technical issues

### Common User Scenarios:
1. **New User:** Guide through onboarding and trial activation
2. **Trial Expired:** Explain subscription options and payment process
3. **Payment Issues:** Verify phone number and guide through MoMo process
4. **Usage Limits:** Explain daily reset and subscription benefits
5. **Technical Problems:** Basic troubleshooting, then escalate if needed

### Escalation Contacts:
- **Technical Issues:** Development Team
- **Payment Problems:** MTN MoMo Support + Technical Team
- **User Complaints:** Customer Service Manager
- **System Outages:** System Administrator

---

*This FAQ is based on the Answer Bot AI system architecture and should be updated as the system evolves.*
