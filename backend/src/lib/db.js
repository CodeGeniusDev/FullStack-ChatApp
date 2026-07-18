import mongoose from "mongoose";

const DB_OPTIONS = {
  serverSelectionTimeoutMS: 10_000,
  connectTimeoutMS: 10_000,
  socketTimeoutMS: 45_000,
};

export const sanitizeDatabaseError = (error) => {
  const name = error?.name || "DatabaseError";
  const code = error?.code;
  if (name === "MongoServerSelectionError" || /querysrv|enotfound|econnrefused|timed out/i.test(error?.message || "")) {
    return "MongoDB is unreachable. Check Atlas network access, cluster status, and DNS.";
  }
  if (code === 8000 || code === 18 || /auth/i.test(error?.message || "")) {
    return "MongoDB authentication failed. Check the Atlas database user and password.";
  }
  return "MongoDB connection failed. Check MONGODB_URI and database availability.";
};

export const connectDB = async () => {
  if (!process.env.MONGODB_URI?.trim()) {
    throw new Error("MONGODB_URI is required");
  }

  const databaseName = process.env.MONGODB_DB_NAME?.trim() || "chat_db";
  if (!/^[A-Za-z0-9_-]+$/.test(databaseName)) {
    throw new Error("MONGODB_DB_NAME contains invalid characters");
  }

  const connection = await mongoose.connect(process.env.MONGODB_URI, {
    ...DB_OPTIONS,
    dbName: databaseName,
  });
  console.log(`MongoDB connected (${connection.connection.host.includes("mongodb.net") ? "Atlas" : "self-hosted"})`);
  return connection;
};

mongoose.connection.on("error", (error) => {
  console.error("MongoDB runtime error:", sanitizeDatabaseError(error));
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected");
});

export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
};

export const getDatabaseHealth = () => ({
  status: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  ready: mongoose.connection.readyState === 1,
});
