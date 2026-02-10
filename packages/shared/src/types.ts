export type Role = "owner" | "admin" | "member";

export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: Date;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  invite_code: string;
  created_by: string;
  created_at: Date;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: Role;
  joined_at: Date;
  /** Joined from users table */
  user_name?: string;
  /** Joined from users table */
  user_email?: string;
}

export interface Project {
  id: string;
  team_id: string;
  name: string;
  slug: string;
  created_at: Date;
}

export interface Environment {
  id: string;
  project_id: string;
  name: string;
  slug: string;
  created_at: Date;
}

export interface Secret {
  id: string;
  environment_id: string;
  key: string;
  encrypted_value: string;
  version: number;
  updated_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface AuditEvent {
  id: string;
  team_id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

export interface CLIToken {
  id: string;
  user_id: string;
  name: string;
  token_hash: string;
  last_used_at: Date | null;
  expires_at: Date;
  created_at: Date;
  /** Joined from users table */
  user?: User;
}

// --- Create variants ---

export interface CreateUser {
  email: string;
  name: string;
  password_hash: string;
}

export interface CreateTeam {
  name: string;
  slug: string;
  invite_code: string;
  created_by: string;
}

export interface AddMember {
  team_id: string;
  user_id: string;
  role: Role;
}

export interface CreateProject {
  team_id: string;
  name: string;
  slug: string;
}

export interface CreateEnvironment {
  project_id: string;
  name: string;
  slug: string;
}

export interface UpsertSecret {
  key: string;
  value: string;
}

export interface CreateAuditLog {
  team_id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  metadata?: Record<string, unknown>;
}

export interface CreateCLIToken {
  user_id: string;
  name: string;
  token_hash: string;
  expires_at: Date;
}
