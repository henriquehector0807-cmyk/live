import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_123";

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Não autorizado" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    (req as any).userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido" });
  }
};

export const signAuthToken = (userId: string) => jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "7d" });
