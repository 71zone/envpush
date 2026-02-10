import type { EnvpushDatabase, User } from "@envpush/shared";

export type Env = {
  Variables: {
    db: EnvpushDatabase;
    user: User;
    masterKey: string;
  };
};
