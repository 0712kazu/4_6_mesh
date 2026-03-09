import { defineConfig } from 'vite';

const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? '';

const base =
  process.env.VITE_BASE_PATH ||
  (isGitHubActions && repoName ? `/${repoName}/` : '/');

export default defineConfig({
  base,
});
