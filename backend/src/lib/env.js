const REQUIRED = ["MONGODB_URI", "JWT_SECRET"];

export const validateEnvironment = () => {
  const missing = REQUIRED.filter((name) => !process.env[name]?.trim());
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  if (process.env.JWT_SECRET.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("JWT_SECRET must be at least 32 characters in production");
    console.warn("JWT_SECRET is shorter than 32 characters; replace it before production deployment");
  }
};

export const getAllowedOrigins = () => {
  const configured = [process.env.FRONTEND_URLS, process.env.FRONTEND_URL, process.env.CORS_ORIGIN]
    .flatMap((value) => value?.split(",") || [])
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);
  return [...new Set(["http://localhost:5173", "http://localhost:5174", ...configured])];
};
