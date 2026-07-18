import mongoose from "mongoose";

export const validateObjectIdParam = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid identifier" });
  next();
};

const buckets = new Map();
export const rateLimit = ({ windowMs, limit, keyPrefix }) => (req, res, next) => {
  const now = Date.now();
  const key = `${keyPrefix}:${req.ip}`;
  const values = (buckets.get(key) || []).filter((time) => now - time < windowMs);
  if (values.length >= limit) return res.status(429).json({ success: false, message: "Too many requests. Please try again later." });
  values.push(now);
  buckets.set(key, values);
  if (buckets.size > 10_000) {
    for (const [bucketKey, timestamps] of buckets) {
      if (!timestamps.some((time) => now - time < windowMs)) buckets.delete(bucketKey);
    }
  }
  next();
};
