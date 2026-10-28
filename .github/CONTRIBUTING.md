# Contributing to This Project

Thank you for your interest in contributing! This document outlines the process for contributing to our project.

## Getting Started

1. Create a short-lived branch from an up-to-date `main` (or `develop`):
   `git switch -c feat/your-change`. Members branch in this repository;
   others fork it.
2. Make your changes, with tests where they apply.
3. Run `bun run verify` locally.
4. Commit with semantic messages (`feat:`, `fix:`, `refactor:`…), push, and
   open a pull request.
5. CI must be green before the pull request can be merged: lint, type
   check, unit tests, API e2e and browser e2e.
6. The pull request is squash-merged (its title becomes the commit, so keep
   it semantic too) and the branch is deleted on GitHub.
7. Clean up locally: `bun run git:prune`, then `bun run git:prune --yes`.

`main`, `develop` and `release/**` are protected: no direct pushes, no force
pushes, no deletion — for everyone. See README "Branches and pull requests".

## Pull Request Guidelines

- Ensure your PR addresses a specific issue or adds value to the project
- Include a clear description of the changes
- Keep changes focused and atomic
- Follow existing code style and conventions
- Include tests if applicable
- Update documentation as needed
- Ensure your PR follows the [project's philosophy](/docs/overview.mdx)

## Code Style

- Follow the existing code formatting in the project (ensure you have Biome installed)
- Write clear, self-documenting code
- Add comments only when necessary to explain complex logic
- Use meaningful variable and function names

## Reporting Issues

- Use the GitHub issue tracker
- Check if the issue already exists before creating a new one
- Provide a clear description of the issue
- Include steps to reproduce if applicable
- Add relevant labels

## Questions or Need Help?

Feel free to open an issue for questions or join our discussions. We're here to help!

## Code of Conduct

Please note that this project follows a Code of Conduct. By participating, you are expected to uphold this code.

Thank you for contributing!
