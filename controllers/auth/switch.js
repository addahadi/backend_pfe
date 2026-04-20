// controllers/auth/switch.js
// Plan switch — 2-step flow: request (email token) → confirm (execute)

import sql from '../../config/database.js';
import {
  isSamePlan,
  generateSwitchToken,
  validateSwitchToken,
} from '../../services/auth/subscription.service.js';
import { createSubscription } from '../../services/auth/subscription.service.js';
import { sendConfirmationEmail } from '../../services/auth/emailService.js';
import { ok, notFound } from '../../utils/http.js';
import { ValidationError, ConflictError, NotFoundError } from '../../utils/AppError.js';

// ══════════════════════════════════════════════════════════════
// PATCH /subscriptions/switch
// Step 1 — user chose a new plan → validate + send confirmation email
//
// Body: { newPlanId }
// Guards: authenticate (req.user set)
//
// Note: checkSubscription is NOT required here.
// A user with no subscription can also switch (they just chose wrong plan before).
// We only need to prevent switching to the same plan they already have.
// ══════════════════════════════════════════════════════════════
export const requestSwitchPlan = async (req, res, next) => {
  try {
    const userId    = req.user.userId;
    const { newPlanId } = req.body;

    if (!newPlanId) {
      throw new ValidationError('newPlanId is required');
    }

    // 1. Fetch user email
    const userRows = await sql`SELECT email FROM users WHERE id = ${userId} LIMIT 1`;
    if (!userRows.length) return notFound(res, 'User not found');
    const userEmail = userRows[0].email;

    // 2. Verify the target plan exists
    const planRows = await sql`
      SELECT plan_id, name_en, name_ar, price
      FROM plans
      WHERE plan_id = ${newPlanId}
      LIMIT 1
    `;
    if (!planRows.length) throw new NotFoundError('Plan not found');
    const newPlan = planRows[0];

    // 3. Check if user already has this plan active
    const currentRows = await sql`
      SELECT plan_id FROM subscriptions
      WHERE user_id = ${userId} AND status = 'ACTIVE'
      LIMIT 1
    `;
    const currentPlanId = currentRows[0]?.plan_id ?? null;

    if (currentPlanId && isSamePlan(currentPlanId, newPlanId)) {
      throw new ConflictError('You are already subscribed to this plan');
    }

    // 4. Generate a short-lived JWT token embedding the intent
    const confirmationToken = generateSwitchToken(userId, newPlanId);

    // 5. Send confirmation email with link to /confirm-switch?token=...
    await sendConfirmationEmail(userEmail, confirmationToken);

    ok(res, {
      message: 'Confirmation email sent. Please check your inbox.',
      newPlan: {
        plan_id:  newPlan.plan_id,
        name_en:  newPlan.name_en,
        name_ar:  newPlan.name_ar,
        price:    newPlan.price,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ══════════════════════════════════════════════════════════════
// POST /subscriptions/switch/confirm
// Step 2 — user clicked the link in the email → execute the switch
//
// Body: { confirmationToken }
// Guards: authenticate
//
// Delegates entirely to createSubscription which already:
//   - deactivates any current ACTIVE subscription
//   - inserts the new one with features_snapshot
//   - throws ConflictError if same plan is active (double-click safe)
// ══════════════════════════════════════════════════════════════
export const confirmSwitchPlan = async (req, res, next) => {
  try {
    const { confirmationToken } = req.body;

    if (!confirmationToken) {
      throw new ValidationError('confirmationToken is required');
    }

    // 1. Decode + verify the token (throws ValidationError if expired/invalid)
    let userId, newPlanId;
    try {
      ({ userId, newPlanId } = validateSwitchToken(confirmationToken));
    } catch (tokenErr) {
      throw new ValidationError(tokenErr.message);
    }

    // 2. Security: token userId must match the authenticated user
    if (userId !== req.user.userId) {
      throw new ValidationError('Token does not match the authenticated user');
    }

    // 3. Execute switch — reuse createSubscription (deactivates old, creates new)
    const newSubscription = await createSubscription({ userId, planId: newPlanId });

    ok(res, {
      message: 'Plan switched successfully',
      subscription: {
        subscription_id: newSubscription.subscription_id,
        status:          newSubscription.status,
        start_date:      newSubscription.start_date,
        end_date:        newSubscription.end_date,
        plan_id:         newSubscription.plan_id,
      },
    });
  } catch (err) {
    next(err);
  }
};
