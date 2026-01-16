import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
  try {
    // Get token from cookies
    const token = req.cookies.token;
    console.log("Token from cookie:", token ? "Token exists" : "No token");

    if (!token) {
      return res.status(401).json({ 
        message: "No authentication token found",
        code: "NO_TOKEN"
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded token user ID:", decoded.userId || decoded.userid); // Check both cases

      if (!decoded) {
        return res.status(401).json({ 
          message: "Invalid token",
          code: "INVALID_TOKEN"
        });
      }

      // Handle case sensitivity in JWT payload
      const userId = decoded.userId || decoded.userid;
      if (!userId) {
        console.error("No user ID found in token:", decoded);
        return res.status(401).json({ 
          message: "Invalid token format",
          code: "INVALID_TOKEN_FORMAT"
        });
      }

      // Find user
      const user = await User.findById(userId).select("-password");
      if (!user) {
        console.error("User not found for ID:", userId);
        return res.status(401).json({ 
          message: "User not found",
          code: "USER_NOT_FOUND"
        });
      }

      // Attach user to request
      req.user = user;
      next();
      
    } catch (jwtError) {
      console.error("JWT Error:", jwtError.name, jwtError.message);
      
      if (jwtError.name === "JsonWebTokenError") {
        return res.status(401).json({ 
          message: "Invalid token signature",
          code: "INVALID_SIGNATURE"
        });
      }
      
      if (jwtError.name === "TokenExpiredError") {
        return res.status(401).json({ 
          message: "Token has expired",
          code: "TOKEN_EXPIRED"
        });
      }
      
      return res.status(401).json({ 
        message: "Failed to authenticate token",
        code: "AUTH_FAILED",
        error: process.env.NODE_ENV === 'development' ? jwtError.message : undefined
      });
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ 
      message: "Authentication failed",
      code: "AUTH_ERROR",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};