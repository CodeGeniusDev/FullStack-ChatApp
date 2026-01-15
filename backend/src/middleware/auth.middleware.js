import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

// export const protectRoute = async (req, res, next) => {
//   try {
//     // const token = req.cookies.jwt;
//     const token = req.cookies.token;
//     if (!token) {
//       return res.status(401).json({ message: "Unauthorized - no token" });
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     if (!decoded) {
//       return res.status(401).json({ message: "Unauthorized - invalid token" });
//     }

//     const user = await User.findById(decoded.userId).select("-password");

//     if (!user) {
//       return res.status(401).json({ message: "Unauthorized - invalid token" });
//     }

//     req.user = user;
//     next();
//   } catch (error) {
//     return res.status(401).json({ message: "Unauthorized - invalid token" });
//   }
// };

export const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    console.log("Token from cookie:", token); // Debug log

    if (!token) {
      console.log("No token found in request");
      return res.status(401).json({ message: "No authentication token found" });
    }

    // Verify the token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded token:", decoded); // Debug log
    } catch (jwtError) {
      console.error("JWT verification error:", jwtError.message);
      if (jwtError.name === "JsonWebTokenError") {
        return res.status(401).json({ message: "Invalid token signature" });
      } else if (jwtError.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token has expired" });
      }
      return res.status(401).json({ message: "Failed to authenticate token" });
    }

    if (!decoded || !decoded.userid) {
      console.log("Invalid token payload:", decoded);
      return res.status(401).json({ message: "Invalid token payload" });
    }

    const user = await User.findById(decoded.userid).select("-password");
    if (!user) {
      console.log("User not found for ID:", decoded.userid);
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({
      message: "Authentication failed",
      error: error.message,
    });
  }
};
