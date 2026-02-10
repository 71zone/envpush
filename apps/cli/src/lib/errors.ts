import chalk from "chalk";

export async function handleApiResponse(res: Response) {
  if (res.ok) return;

  const body = await res.json().catch(() => ({})) as Record<string, unknown>;
  const err = body.error;
  let message: string;
  if (err && typeof err === "object" && "issues" in err) {
    const issues = (err as { issues: { path: string[]; message: string }[] }).issues;
    message = issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
  } else if (typeof err === "string") {
    message = err;
  } else {
    message = `Request failed with status ${res.status}`;
  }

  switch (res.status) {
    case 401:
      console.error(chalk.red("Authentication failed. Run `evp login` to re-authenticate."));
      break;
    case 403:
      console.error(chalk.red("Permission denied: " + message));
      break;
    case 404:
      console.error(chalk.red("Not found: " + message));
      break;
    case 409:
      console.error(chalk.red("Conflict: " + message));
      break;
    case 429:
      console.error(chalk.red("Rate limited. Please wait and try again."));
      break;
    default:
      console.error(chalk.red("Error: " + message));
  }

  process.exit(1);
}

export function handleError(err: unknown): never {
  if (err instanceof TypeError && (err.message.includes("fetch") || err.message.includes("ECONNREFUSED"))) {
    console.error(chalk.red("Cannot connect to server. Is the EnvPush server running?"));
  } else if (err instanceof Error) {
    console.error(chalk.red("Error: " + err.message));
  } else {
    console.error(chalk.red("An unexpected error occurred."));
  }
  process.exit(1);
}
