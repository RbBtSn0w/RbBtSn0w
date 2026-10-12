# AGENTS.md - Project Context & Developer Guide

## 🚀 Project Overview
**Name:** RbBtSn0w System Core (GitHub Profile README & Product Showroom)
**Description:** A high-converting, Geek & Apple-crafted Product Showroom and Developer Profile for Hamilton Snow (RbBtSn0w). It showcases featured open-source products (AI Agent infrastructure, creator tooling, Apple native systems), unified Homebrew distribution, and dynamically synced blog transmissions.
**Repository:** [RbBtSn0w/RbBtSn0w](https://github.com/RbBtSn0w/RbBtSn0w)

## 🏗 Architecture & Workflows
This repository operates as a curated storefront with automated updates:

- **Product Showroom (`README.md`)**: Curated showcase featuring flagship tools, domain matrices, and Homebrew tap installation commands.
- **Blog Sync (`blog.yml`)**: Uses `.github/scripts/update-blog.js` to fetch `https://rbbtsn0w.me/feed.xml` and inject the latest 5 posts into `README.md`. Runs daily.
- **Snake Animation (`snake.yml`)**: Uses `Platane/snk` to generate contribution animation (`dist/github-snake-dark.svg`). Runs daily.
- **Metrics System (`metrics.yml`)**: Background generation of `github-metrics.svg`. Runs twice daily.
- **Ops Dashboard (`dashboard.yml`)**: Decommissioned from scheduled runs to avoid exposing internal maintenance states on the public storefront (`workflow_dispatch` only).

## 📁 Key File Map
- `README.md`: The main entry point and product showroom. Contains HTML comments for dynamic blog injection.
- `dist/github-snake-dark.svg`: Auto-generated animation image (DO NOT manually edit).
- `.github/scripts/update-blog.js`: Node.js script for parsing Atom feed and updating `README.md`.
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
