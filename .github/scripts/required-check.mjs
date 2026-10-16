import { fileURLToPath } from "node:url";
import path from "node:path";

export const requiredJobs = ["repository", "frontend", "backend", "managed-runtime"];

export function requireSuccessfulJobs(input) {
  const results = JSON.parse(input);
  if (!results || Array.isArray(results) || typeof results !== "object") throw new Error("INVALID_JOB_RESULTS");
  const names = Object.keys(results).sort();
  if (JSON.stringify(names) !== JSON.stringify([...requiredJobs].sort())) throw new Error("REQUIRED_JOB_SET_MISMATCH");
  if (Object.values(results).some(job => !job || job.result !== "success")) throw new Error("REQUIRED_JOB_NOT_SUCCESSFUL");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  requireSuccessfulJobs(process.env.RESULTS);
  console.log("All four automatic KAY prerequisite jobs genuinely passed. Database integration was not executed by this workflow.");
}
