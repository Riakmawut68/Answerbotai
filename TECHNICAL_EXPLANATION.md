# Technical Explanation: AI Messenger Bot

## 1. Overview

This document provides a detailed technical explanation of the AI Messenger Bot, a sophisticated application designed to interact with users on Facebook Messenger. The bot integrates with OpenAI for intelligent responses and utilizes MTN Mobile Money (MoMo) for handling subscriptions in the South Sudan market.

The application is built on a Node.js stack and follows a modern, modular architecture. It is designed for scalability and reliability, incorporating features like rate limiting, comprehensive logging, and a stateful user management system.

## 2. Core Technologies

- **Backend:** Node.js with the Express.js framework.
- **Database:** MongoDB with the Mongoose ODM for data modeling and persistence.
- **AI:** OpenAI's API (via the `openai` npm package) for generating intelligent, human-like responses.
- **Payments:** MTN MoMo API for processing mobile money payments.
- **Scheduling:** `node-cron` for running background tasks like daily user resets and subscription checks.
- **Logging:** Winston for robust, multi-transport logging.
- **Validation:** Joi for schema validation, ensuring data integrity.

## 3. Architectural Design

The application follows a classic Model-View-Controller (MVC) pattern, adapted for a headless bot architecture:

- **`server.js` (Entry Point):** Initializes the Express server, connects to the MongoDB database, sets up middleware, and starts the schedulers.
- **`routes/`:** Defines the API endpoints for the application. The primary routes are `/webhook` for Facebook Messenger events, `/momo` for payment callbacks, and `/payment` for internal payment logic.
- **`controllers/`:** Contains the core business logic. `webhookController.js` is the central hub, orchestrating all user interactions.
- **`services/`:** Encapsulates the logic for interacting with external APIs (Facebook Messenger, OpenAI, MTN MoMo).
- **`models/`:** Defines the Mongoose schemas for the database (e.g., `User`, `Payment`, `Subscription`).
- **`middlewares/`:** Contains custom middleware for tasks like webhook verification, rate limiting, and error handling.
- **`schedulers/`:** Manages background tasks that run on a schedule.

## 4. End-to-End User Flow

The bot manages the entire user lifecycle through a state machine, tracked by the `stage` property in the `User` model.

1.  **Onboarding:**
    *   A new user is greeted with a welcome message and must agree to the terms of service.
    *   Upon agreement, the user is prompted to provide their MTN mobile number to start a free trial.

2.  **Trial Period:**
    *   The user receives a limited number of free messages per day.
    *   The bot tracks daily usage. When the limit is reached, the user is prompted to subscribe.

3.  **Subscription:**
    *   The user can choose between weekly and monthly subscription plans.
    *   They are asked to provide their MTN mobile number for payment.
    *   The bot initiates a payment request to the MTN MoMo API.

4.  **Payment Processing:**
    *   The user receives a prompt on their phone to approve the payment.
    *   The bot waits for a callback from the MoMo API to confirm the payment status.

5.  **Active Subscription:**
    *   Once payment is confirmed, the user's subscription is activated.
    *   Subscribed users have a higher daily message limit.

6.  **Subscription Management:**
    *   A background scheduler checks for expired subscriptions daily.
    *   If a subscription expires, the user is notified and prompted to renew.

## 5. Key Features

- **Stateful User Management:** The bot maintains the state of each user's conversation, allowing for a coherent and context-aware experience.
- **Trial and Subscription Model:** A freemium model that allows users to try the service before committing to a paid plan.
- **Secure Webhook Handling:** Webhooks are verified to ensure they originate from Facebook, and a raw body parser is used for signature validation.
- **Robust Error Handling:** The application includes a centralized error handler and comprehensive logging to facilitate debugging.
- **Rate Limiting:** Protects the application from abuse and ensures fair usage.
- **Self-Ping Service:** A mechanism to keep the application alive on hosting platforms like Render that may put inactive services to sleep.
