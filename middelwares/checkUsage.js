export default function checkUsage(featureKey) {
  return async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const subscription = req.subscription;

      // 1️⃣ check subscription
      if (!subscription) {
        return res.status(403).json({
          message: 'No active subscription',
        });
      }

      // 2️⃣ get features (snapshot)
      const features = subscription.features_snapshot;

      const limit = features[featureKey];

      if (!limit) {
        return res.status(403).json({
          message: 'Feature not available',
        });
      }

      // 3️⃣ unlimited
      if (limit === 'unlimited') {
        return next();
      }

      // 4️⃣ get usage
      const getUsage = usageMap[featureKey];

      if (!getUsage) {
        return res.status(500).json({
          message: `No usage logic for ${featureKey}`,
        });
      }

      const usage = await getUsage(
        userId,
        subscription.subscription_id
      );

      // 5️⃣ compare
      if (usage >= parseInt(limit)) {
        return res.status(403).json({
          message: `${featureKey} limit reached`,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}