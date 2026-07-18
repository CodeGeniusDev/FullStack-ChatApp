import jwt from "jsonwebtoken";

export const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  };
};

export const generateToken = (userId, res) => {
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  const token = jwt.sign({ userId: userId.toString() }, process.env.JWT_SECRET, { expiresIn });
  res.cookie("token", token, {
    ...getCookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return token;
};

export const clearTokenCookie = (res) => res.clearCookie("token", getCookieOptions());

export const parseCookieHeader = (header = "") => Object.fromEntries(
  header.split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
    const separator = part.indexOf("=");
    return separator === -1 ? [part, ""] : [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
  }),
);
