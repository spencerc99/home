// ABOUTME: Server-side utility functions that use Node.js built-ins
// ABOUTME: These functions can only be imported in Astro components, not client-side code
import { execSync } from "node:child_process";

/**
 * Gets the last modified date of a file according to git and formats it as MM-DD-YY
 * @param filePath - Path to the file relative to the repository root
 * @returns Formatted date string in MM-DD-YY format (e.g., "01-26-26")
 */
export function getGitLastModifiedDate(filePath: string): string {
  try {
    // Get the repository root - use process.cwd() which should be the repo root during build
    const repoRoot = process.cwd();

    // Get the last commit date for this file
    // Using --format=%ci to get ISO format date, then parse it
    const gitDate = execSync(
      `git log -1 --format=%ci -- "${filePath}"`,
      { encoding: "utf-8", cwd: repoRoot }
    ).trim();

    if (!gitDate) {
      // Fallback to current date if git command fails
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const year = String(now.getFullYear() % 100).padStart(2, "0");
      return `${month}-${day}-${year}`;
    }

    const date = new Date(gitDate);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = String(date.getFullYear() % 100).padStart(2, "0");

    return `${month}-${day}-${year}`;
  } catch (error) {
    // Fallback to current date if git command fails
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const year = String(now.getFullYear() % 100).padStart(2, "0");
    return `${month}-${day}-${year}`;
  }
}
