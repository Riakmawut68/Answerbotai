# Payment Flow Fix - Separating Trial and Payment Phone Numbers

## Problem Description

The bot was experiencing an issue where users couldn't use the same phone number for both trial registration and payment processing. When a user tried to subscribe after their trial ended, the system would reject their phone number if it had been used for a trial before, even though payment processing should accept any valid MTN number.

## Root Cause

The `awaiting_phone_for_payment` stage was checking if the phone number had been used for a trial before, using the same validation logic as the initial trial phone number collection. This caused conflicts when users tried to use the same number for both purposes.

## Solution Implemented

### 1. Database Schema Changes

**File: `models/user.js`**
- Added new field `paymentMobileNumber` to store payment phone numbers separately from trial phone numbers
- Both fields have the same validation (MTN South Sudan format: 092xxxxxxx)

### 2. Payment Flow Logic Changes

**File: `controllers/webhookController.js`**

#### Updated `awaiting_phone_for_payment` stage:
- **Before**: Checked if number was used for trial before accepting it for payment
- **After**: Accepts any valid MTN number without checking trial usage
- **Change**: Uses `user.paymentMobileNumber` instead of `user.mobileNumber`

#### Updated `RETRY_NUMBER` postback handler:
- **Before**: Always reset trial phone number and stage
- **After**: Context-aware - resets payment phone number if in payment flow, trial phone number if in trial flow

#### Updated subscription postback handlers:
- **Before**: Used existing phone number if available
- **After**: Always asks for new payment phone number and clears any existing payment number

### 3. Payment Service Changes

**File: `services/momoService.js`**

#### Updated `buildRequestBody` method:
- **Before**: Used `user.mobileNumber` for payment
- **After**: Uses `user.paymentMobileNumber || user.mobileNumber` (fallback for backward compatibility)

#### Updated logging:
- **Before**: Logged trial phone number for payment
- **After**: Logs payment phone number (with fallback)

## Key Benefits

1. **Separate Flows**: Trial phone numbers and payment phone numbers are now completely separate
2. **No Conflicts**: Users can use the same number for both trial and payment
3. **Backward Compatibility**: Existing users with only trial numbers can still make payments
4. **Clear Separation**: Database clearly shows which number was used for what purpose

## Testing

### Test Cases Added

1. **Payment Phone Number Collection**: Verify payment flow accepts any valid MTN number
2. **Same Number for Trial and Payment**: Verify users can use the same number for both purposes
3. **Separate Storage**: Verify both numbers are stored separately in the database

### Test Script

Created `test-payment-flow.js` to verify the changes work correctly.

## Manual Testing Checklist

Updated `manual-test-checklist.md` with new test cases:
- Test Case 4.1: User Clicks Weekly Plan
- Test Case 4.2: Payment Phone Number Collection  
- Test Case 4.3: Payment Phone Number - Same as Trial Number

## Migration Notes

- Existing users will continue to work normally
- New `paymentMobileNumber` field is optional and has backward compatibility
- No database migration required - field will be added automatically for new documents

## Files Modified

1. `models/user.js` - Added `paymentMobileNumber` field
2. `controllers/webhookController.js` - Updated payment flow logic
3. `services/momoService.js` - Updated payment processing
4. `manual-test-checklist.md` - Added new test cases
5. `test-payment-flow.js` - Created test script (new file)

## Verification

To verify the fix works:

1. Create a user with a trial phone number
2. Complete trial and try to subscribe
3. Use the same phone number for payment
4. Verify payment processing starts without errors
5. Check database shows both numbers stored separately 