import "express-session";

// Augment express-session so req.session carries the logged-in user's identity.
declare module "express-session" {
  interface SessionData {
    userId?: string;
    role?: "employee" | "hr";
  }
}
