# AGENTS.md - Project Context & Developer Guide

## 🚀 Project Overview
**Name:** RbBtSn0w System Core (GitHub Profile README)
**Description:** A fully automated, Geek-themed GitHub Profile README for user RbBtSn0w. It leverages GitHub Actions to dynamically generate coding metrics, contribution animations, and fetch recent blog posts, creating a real-time dashboard.
**Repository:** [RbBtSn0w/RbBtSn0w](https://github.com/RbBtSn0w/RbBtSn0w)

## 🏗 Architecture & Workflows
This repository is entirely driven by GitHub Actions. There is no traditional "build" step; instead, scheduled workflows mutate the repository's contents.

- **Metrics System (`metrics.yml`)**: Uses `lowlighter/metrics` to generate `github-metrics.svg`. It captures language usage, commit calendar (isometric), and basic stats. Runs twice daily.
- **Snake Animation (`snake.yml`)**: Uses `Platane/snk` to generate a snake animation eating contribution graph cells (`dist/github-snake-dark.svg`). Runs daily.
- **Blog Sync (`blog.yml`)**: Uses `gautamkrishnar/blog-post-workflow` to fetch the RSS feed from `https://rbbtsn0w.me/feed.xml` and injects the latest 5 posts into `README.md`. Runs daily.

## 📁 Key File Map
- `README.md`: The main entry point and terminal-styled UI. Contains HTML comments for dynamic blog injection.
- `github-metrics.svg`: Auto-generated dashboard image (DO NOT manually edit).
- `dist/github-snake-dark.svg`: Auto-generated animation image (DO NOT manually edit).
- `.github/workflows/`: Contains all CI/CD automation scripts.

## 🤖 Instructions for AI Agents
When assisting with this project, strictly adhere to the following rules:

1. **Do NOT Manually Edit Dynamic Regions:** Never manually type out blog post titles or metrics inside `README.md`. For blog posts, only adjust the `template` in `blog.yml`. The content between `<!-- BLOG-POST-LIST:START -->` and `<!-- BLOG-POST-LIST:END -->` is strictly managed by the automation.
2. **Permissions Awareness:** Any GitHub Action that modifies repository files (SVG generation, README updates) MUST have `permissions: contents: write` explicitly defined in the job.
3. **Triggering Workflows:** After modifying `.yml` files, always verify changes by triggering the workflow manually via GitHub CLI: `gh workflow run "<Workflow Name>"`.
4. **Markdown Formatting:** When editing the `template` in `blog.yml`, ensure proper Markdown line breaks (e.g., using `$newline` variable provided by the plugin) so the generated list renders correctly as a Markdown list, not a single line of text.
5. **Aesthetics:** Maintain the "Geek / Terminal" aesthetic. Prefer dark mode variants (e.g., Dracula theme, dark palettes) for all generated assets.

## 🛠 Common Commands
- **Trigger Blog Sync:** `gh workflow run "Latest Blog Posts" --repo RbBtSn0w/RbBtSn0w`
- **Trigger Metrics Gen:** `gh workflow run "Metrics System" --repo RbBtSn0w/RbBtSn0w`
- **Trigger Snake Gen:** `gh workflow run "Snake Animation" --repo RbBtSn0w/RbBtSn0w`
- **View Run Logs:** `gh run list --repo RbBtSn0w/RbBtSn0w`
