import { z } from "zod";

export const RegisterSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(128),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const CreateTeamSchema = z.object({
  name: z.string().min(1).max(100),
});

export const JoinTeamSchema = z.object({
  invite_code: z.string().min(1),
});

export const CreateProjectSchema = z.object({
  team_id: z.string().uuid(),
  name: z.string().min(1).max(100),
});

export const CreateEnvironmentSchema = z.object({
  name: z.string().min(1).max(100),
});

export const UpsertSecretsSchema = z.object({
  secrets: z.array(
    z.object({
      key: z.string().min(1).max(256),
      value: z.string(),
    })
  ),
});

export const UpdateMemberRoleSchema = z.object({
  role: z.enum(["admin", "member"]),
});
