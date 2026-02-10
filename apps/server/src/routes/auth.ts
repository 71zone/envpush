import { Hono } from "hono";
import bcryptjs from "bcryptjs";
const { hash, compare } = bcryptjs;
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../lib/context.js";
import {
  RegisterSchema,
  LoginSchema,
  TOKEN_EXPIRY_DAYS,
} from "@envpush/shared";
import { hashToken, generateRawToken } from "@envpush/shared/crypto";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";

export const authRoutes = new Hono<Env>()
  /** POST /register — Create a new user account. */
  .post("/register", rateLimit, zValidator("json", RegisterSchema), async (c) => {
    const { name, email, password } = c.req.valid("json");
    const db = c.get("db");

    const existing = await db.users.findByEmail(email);
    if (existing) {
      return c.json({ error: "Email already exists" }, 409);
    }

    const password_hash = await hash(password, 10);
    const user = await db.users.create({ name, email, password_hash });

    return c.json({
      user: { id: user.id, name: user.name, email: user.email, created_at: user.created_at },
    }, 201);
  })

  /** POST /login — Authenticate and receive a CLI token. */
  .post("/login", rateLimit, zValidator("json", LoginSchema), async (c) => {
    const { email, password } = c.req.valid("json");
    const db = c.get("db");

    const user = await db.users.findByEmail(email);
    if (!user) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    const valid = await compare(password, user.password_hash);
    if (!valid) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    await db.cliTokens.create({
      user_id: user.id,
      name: "cli",
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

    return c.json({
      token: rawToken,
      user: { id: user.id, name: user.name, email: user.email },
    });
  })

  /** GET /me — Get current authenticated user info. */
  .get("/me", requireAuth, async (c) => {
    const user = c.get("user");
    const db = c.get("db");
    const teams = await db.teams.findByUserId(user.id);

    return c.json({
      user: { id: user.id, name: user.name, email: user.email, created_at: user.created_at },
      teams: teams.map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
    });
  });
