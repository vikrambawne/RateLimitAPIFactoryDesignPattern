import { Request } from "express";

export interface AuthRequest extends Request {
  clientId?: string;
}
