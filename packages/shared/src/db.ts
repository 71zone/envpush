import type {
  User,
  Team,
  TeamMember,
  Project,
  Environment,
  Secret,
  AuditEvent,
  CLIToken,
  CreateUser,
  CreateTeam,
  AddMember,
  CreateProject,
  CreateEnvironment,
  UpsertSecret,
  CreateAuditLog,
  CreateCLIToken,
  Role,
} from "./types.js";

/** Abstract database interface that all drivers must implement. */
export interface EnvpushDatabase {
  users: {
    create(data: CreateUser): Promise<User>;
    findByEmail(email: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
  };
  teams: {
    create(data: CreateTeam): Promise<Team>;
    findById(id: string): Promise<Team | null>;
    findBySlug(slug: string): Promise<Team | null>;
    findByInviteCode(code: string): Promise<Team | null>;
    findByUserId(userId: string): Promise<Team[]>;
    regenerateInviteCode(teamId: string, newCode: string): Promise<string>;
  };
  teamMembers: {
    add(data: AddMember): Promise<TeamMember>;
    findByTeamId(teamId: string): Promise<TeamMember[]>;
    findByTeamAndUser(teamId: string, userId: string): Promise<TeamMember | null>;
    updateRole(teamId: string, userId: string, role: Role): Promise<void>;
    remove(teamId: string, userId: string): Promise<void>;
  };
  projects: {
    create(data: CreateProject): Promise<Project>;
    findById(id: string): Promise<Project | null>;
    findByTeamId(teamId: string): Promise<Project[]>;
    findBySlug(teamId: string, slug: string): Promise<Project | null>;
    delete(id: string): Promise<void>;
  };
  environments: {
    create(data: CreateEnvironment): Promise<Environment>;
    findById(id: string): Promise<Environment | null>;
    findByProjectId(projectId: string): Promise<Environment[]>;
    findBySlug(projectId: string, slug: string): Promise<Environment | null>;
    delete(id: string): Promise<void>;
  };
  secrets: {
    findByEnvironmentId(envId: string): Promise<Secret[]>;
    upsertMany(envId: string, secrets: UpsertSecret[], updatedBy: string): Promise<void>;
    delete(envId: string, key: string): Promise<void>;
  };
  auditLog: {
    create(data: CreateAuditLog): Promise<void>;
    findByTeamId(teamId: string, opts?: { limit?: number; offset?: number }): Promise<AuditEvent[]>;
  };
  cliTokens: {
    create(data: CreateCLIToken): Promise<CLIToken>;
    findByTokenHash(hash: string): Promise<CLIToken | null>;
    updateLastUsed(id: string): Promise<void>;
    delete(id: string): Promise<void>;
    deleteByUserId(userId: string): Promise<void>;
  };
}

/** Configuration for creating a database instance. */
export interface EnvpushDbConfig {
  connectionString?: string;
  masterKey: string;
  debug?: boolean;
}
