# Facebook App Review Blueprint - Answer Bot AI Messenger Bot

Here is a **comprehensive blueprint** to guide you through the **entire Facebook App Review process for your Answer Bot AI Messenger Bot**, including setup, testing, and **sample permission justifications** for each permission you selected.

---

## ✅ 1. **Prerequisites Checklist**

Make sure the following are complete before submission:

| Step | Description                                                | Status      |
| ---- | ---------------------------------------------------------- | ----------- |
| ✅    | Facebook Developer account created                         | Done        |
| ✅    | Facebook App created                                       | Done        |
| ✅    | Facebook Messenger product added                           | Done        |
| ✅    | App associated with a Facebook Page                        | Done        |
| ✅    | Page Access Token generated                                | Done        |
| ✅    | Webhook callback URL configured & verified                 | Done        |
| ✅    | Events subscribed: `messages`, `messaging_postbacks`      | Done        |
| ✅    | App tested using a test user                               | In progress |

---

## ✅ 2. **Permissions Selected & Review Justifications**

Paste the following when filling out the "**App Review**" form under **App Dashboard > App Review > Permissions and Features**.

### 🔑 Core Permissions and Justifications

#### **1. `pages_messaging`**

**Justification:**
Our Answer Bot AI chatbot requires the pages_messaging permission to send and receive messages between users and our Facebook page. This is essential for our core functionality as an AI-powered educational assistant that helps users with academic questions, business guidance, agriculture advice, health information, and general knowledge queries.

**How we use it:**
- AI-powered responses to user questions
- Educational content delivery
- Subscription management messages
- Payment processing notifications
- Trial period communications
- User onboarding and consent collection

**Test Instructions:**
1. Go to our Answer Bot AI Page and click "Message"
2. Type "Hi" or any question
3. The bot will respond with welcome message and consent options
4. Ask an educational question to test AI responses

---

#### **2. `pages_messaging_postbacks`**

**Justification:**
The pages_messaging_postbacks permission is essential for our bot's interactive features and user flow management. We use postbacks to handle user consent collection, trial activation, subscription plan selection, payment processing confirmations, and command system interactions.

**How we use it:**
- User consent collection ("I Agree" button clicks)
- Trial activation ("Start Free Trial" button)
- Subscription plan selection (Weekly/Monthly plans)
- Payment processing confirmations
- Command system interactions (/help, /status, /reset)

**Test Instructions:**
1. Click "I Agree" button in welcome message
2. Click "Start Free Trial" button
3. Use command "/help" to see available commands
4. Test subscription plan selection buttons

---

#### **3. `pages_show_list`**

**Justification:**
We require pages_show_list permission to display our Facebook page information to users who interact with our bot. This permission allows us to show our page name "Answer Bot AI" in conversations, display our page profile picture and branding, and build trust and credibility for our AI service.

**How we use it:**
- Show our page name "Answer Bot AI" in conversations
- Display our page profile picture and branding
- Provide users with context about who they're interacting with
- Build trust and credibility for our AI service

**Test Instructions:**
1. Start a conversation with the bot
2. Verify the page name "Answer Bot AI" appears in the chat
3. Confirm page profile picture is visible
4. Check that users can visit the page for additional information

---

### 🔑 Optional Permissions (Request if needed)

#### **4. `pages_read_engagement`** (Optional - for analytics)

**Justification:**
The pages_read_engagement permission would enable us to access basic engagement metrics for our page, which is valuable for understanding user interaction patterns, monitoring bot performance, identifying peak usage times, and tracking subscription conversion rates.

**How we use it:**
- Understanding user interaction patterns
- Monitoring bot performance and usage
- Identifying peak usage times for capacity planning
- Tracking subscription conversion rates
- Measuring user satisfaction and engagement levels

**Test Instructions:**
1. Monitor engagement metrics in Facebook Analytics
2. Track message response rates
3. Analyze user interaction patterns
4. Review subscription conversion data

---

## ✅ 3. **App Review Submission Instructions**

> Follow these steps on the Facebook Developer Portal:

### 🔧 Navigate to:

* [Facebook App Dashboard](https://developers.facebook.com/apps/)
* Select your app
* Go to **App Review > Permissions and Features**
* Click "Request" next to each permission

### 📋 For each permission:

* Paste the **justification** (provided above)
* Include clear **test instructions**
* Upload **screenshots** or a **screen recording** if possible
* Assign a **tester** or **admin** user who can demonstrate the flow

---

## 🧪 4. **Testing Notes**

Make sure before submitting:

* The bot responds correctly to user messages
* All buttons and quick replies work
* Webhooks receive events (check logs)
* There are **no crashes or errors**
* A **live page and webhook URL** are connected
* A **tester** is added under **Roles > Testers**

### **Specific Test Scenarios:**

1. **New User Flow:**
   - Send "Hi" → Welcome message → Consent buttons
   - Click "I Agree" → Phone number request
   - Enter valid MTN number → Trial activation

2. **AI Response Testing:**
   - Ask educational questions
   - Test different topics (academics, business, agriculture, health)
   - Verify AI responses are helpful and relevant

3. **Subscription Flow:**
   - Test trial message limits (3 messages/day)
   - Test subscription plan selection
   - Verify payment flow integration

4. **Command System:**
   - Test `/help` command
   - Test `/status` command
   - Test `/reset` command

---

## 🎬 Optional Video Recording for Review

Facebook reviewers prefer screen recordings. Use free tools like:

* **Loom** – [https://loom.com](https://loom.com)
* **OBS Studio** – [https://obsproject.com](https://obsproject.com)
* **ScreenRec** – [https://screenrec.com](https://screenrec.com)

**Recommended:** Walk through the complete user experience from initial contact through subscription management.

---

## 📝 Notes for Submission

* Keep your explanations **short, clear, and practical**
* Focus on the **core permissions** you actually use
* Be honest — only request what you implement
* Emphasize the **educational value** and **subscription model**
* Highlight **MTN MoMo payment integration** for South Sudan users

---

## 🚫 **Permissions to REMOVE from your list:**

The following permissions from your original blueprint are **NOT needed** for your Answer Bot AI bot:

- ❌ `messaging_optins` - You don't use checkbox plugins
- ❌ `message_deliveries` - Not essential for your use case
- ❌ `message_reads` - Not implemented in your bot
- ❌ `messaging_payments` - You use MTN MoMo, not Facebook payments
- ❌ `messaging_feedback` - Not implemented in your bot
- ❌ `messaging_customer_information` - You collect phone numbers, not Facebook profile data

**Focus only on the 3 core permissions:**
1. `pages_messaging`
2. `pages_messaging_postbacks` 
3. `pages_show_list`

This will make your review process much smoother and faster! 