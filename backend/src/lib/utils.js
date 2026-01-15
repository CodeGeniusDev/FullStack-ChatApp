import jwt from "jsonwebtoken";

export const generateToken = (userid, res) => {
  const token = jwt.sign({ userid }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("token", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    // secure: process.env.NODE_ENV !== "development",
    // sameSite: "strict",
    secure: false, // Set to true if using HTTPS in production
    sameSite: 'lax', // More permissive than 'strict' for better compatibility
    path: '/', // Make sure the cookie is sent for all paths
  });

  return token;
};
