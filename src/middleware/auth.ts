import { Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { AuthRequest } from "../shared/types/authRequest";

export default function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const authorization = req.headers.authorization;
    const JWT_SECRET = process.env.JWT_SECRET;

    if (!authorization) {
      throw new Error("Authorization header missing");
    }

    if (!authorization.startsWith("Bearer ")) {
      throw new Error("Invalid authorization format");
    }

    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is required");
    }

    const token = authorization.substring(7);
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (!payload.client_id) {
      throw new Error("client_id missing in token");
    }
    req.clientId = String(payload.client_id);
    next();
  } catch (e) {
    if (e instanceof Error) {
      return res.status(401).json({
        error: e.message,
      });
    }
    return res.status(401).json({
      error: "Unauthorized access",
    });
  }
}
