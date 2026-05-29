const fs = require('fs');
const path = require('path');

const DASHBOARD_START = '<!-- DASHBOARD:START -->';
const DASHBOARD_END = '<!-- DASHBOARD:END -->';

function ensureDashboardMarkers(readmeText) {
  if (readmeText.includes(DASHBOARD_START) && readmeText.includes(DASHBOARD_END)) {
    return readmeText;
  }

  const block = [
    '### 🧭 Ops Dashboard',
    '',
    DASHBOARD_START,
    '- Initializing dashboard...',
    DASHBOARD_END,
    ''
  ].join('\n');

  const anchor = '### 📊 System Status';
  if (readmeText.includes(anchor)) {
    return readmeText.replace(anchor, `${anchor}\n\n${block}`);
  }

  return `${readmeText.trimEnd()}\n\n${block}\n`;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceDashboardBlock(readmeText, dashboardContent) {
  const withMarkers = ensureDashboardMarkers(readmeText);
  const pattern = new RegExp(
    `${escapeRegex(DASHBOARD_START)}[\\s\\S]*?${escapeRegex(DASHBOARD_END)}`,
    'm'
  );
  return withMarkers.replace(
    pattern,
    `${DASHBOARD_START}\n${dashboardContent.trim()}\n${DASHBOARD_END}`
  );
}

function renderDashboardMarkdown({ issues, prs, actions, meta }) {
  const lines = [];
  lines.push('#### GitHub Ops Dashboard');
  lines.push('');
  lines.push(`- Open Issues: ${issues.count === 0 ? 'inbox clean' : issues.count} ([open](${issues.url}))`);
  lines.push(`- Open PRs: ${prs.count === 0 ? 'inbox clean' : prs.count} ([open](${prs.url}))`);

  if (!actions || actions.unavailable) {
    const skipped = Number.isInteger(actions && actions.skipped) ? ` (${actions.skipped} repos skipped)` : '';
    lines.push(`- Actions Failures: unavailable${skipped}`);
  } else if (actions.failingRepos.length === 0) {
    lines.push('- Actions Failures: all latest default-branch runs passed');
  } else {
    lines.push(`- Actions Failures: ${actions.failingRepos.length} repos failing`);
    for (const repo of actions.failingRepos.slice(0, 15)) {
      lines.push(`  - [${repo.full_name}](${repo.actions_url})`);
    }
  }

  lines.push('');
  lines.push(`_Last update: ${meta.updatedAt} | status: ${meta.status}_`);
  return lines.join('\n');
}

function createGitHubClient({ token, owner, fetchImpl = fetch }) {
  async function requestJson(url) {
    const response = await fetchImpl(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'rbbtsn0w-ops-dashboard'
      }
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GitHub API ${response.status} at ${url}: ${body}`);
    }

    return response.json();
  }

  return {
    async getOpenIssueCount() {
      const url = `https://api.github.com/search/issues?q=user:${owner}+is:open+is:issue+archived:false&per_page=1`;
      const data = await requestJson(url);
      return data.total_count || 0;
    },

    async getOpenPrCount() {
      const url = `https://api.github.com/search/issues?q=user:${owner}+is:open+is:pr+archived:false&per_page=1`;
      const data = await requestJson(url);
      return data.total_count || 0;
    },

    async listPublicRepos() {
      const repos = [];
      let page = 1;

      while (true) {
        const url = `https://api.github.com/users/${owner}/repos?type=owner&sort=updated&per_page=100&page=${page}`;
        const pageData = await requestJson(url);
        if (!Array.isArray(pageData) || pageData.length === 0) {
          break;
        }

        repos.push(...pageData.filter((repo) => !repo.fork).map((repo) => ({
          full_name: repo.full_name,
          default_branch: repo.default_branch
        })));

        if (pageData.length < 100) {
          break;
        }

        page += 1;
      }

      return repos;
    },

    async getLatestDefaultBranchRun(fullName, defaultBranch) {
      const url = `https://api.github.com/repos/${fullName}/actions/runs?branch=${encodeURIComponent(defaultBranch)}&per_page=1`;
      const data = await requestJson(url);
      const latest = data.workflow_runs && data.workflow_runs[0];
      if (!latest) {
        return null;
      }

      return {
        conclusion: latest.conclusion,
        html_url: latest.html_url
      };
    }
  };
}

async function buildDashboardModel(client, owner) {
  const [issueCount, prCount] = await Promise.all([
    client.getOpenIssueCount(),
    client.getOpenPrCount()
  ]);

  const issues = {
    count: issueCount,
    url: `https://github.com/issues?q=user%3A${owner}+is%3Aopen+is%3Aissue+archived%3Afalse`
  };

  const prs = {
    count: prCount,
    url: `https://github.com/pulls?q=user%3A${owner}+is%3Aopen+is%3Apr+archived%3Afalse`
  };

  let status = 'success';
  let skipped = 0;
  const failingRepos = [];

  const repos = await client.listPublicRepos();
  await Promise.all(repos.map(async (repo) => {
    try {
      const latest = await client.getLatestDefaultBranchRun(repo.full_name, repo.default_branch);
      if (latest && latest.conclusion === 'failure') {
        failingRepos.push({
          full_name: repo.full_name,
          actions_url: `https://github.com/${repo.full_name}/actions`
        });
      }
    } catch (error) {
      skipped += 1;
      status = 'partial_failure';
      console.log(`Skipping actions check for ${repo.full_name}: ${error.message}`);
    }
  }));

  const actions = {
    failingRepos,
    skipped,
    unavailable: repos.length > 0 && skipped === repos.length
  };

  return {
    issues,
    prs,
    actions,
    meta: {
      status,
      updatedAt: new Date().toISOString()
    }
  };
}

function applyFailureMetadata(oldBlock, runUrl) {
  const lines = oldBlock.split('\n').filter(Boolean);
  const failedAt = new Date().toISOString();
  const metadata = `_Last update: ${failedAt} | status: failed | [run](${runUrl})_`;

  const hasMetaLine = lines.length > 0 && /^_Last update:/.test(lines[lines.length - 1]);
  if (hasMetaLine) {
    lines[lines.length - 1] = metadata;
    return lines.join('\n');
  }

  lines.push('');
  lines.push(metadata);
  return lines.join('\n');
}

async function main() {
  const owner = (process.env.GITHUB_REPOSITORY || 'RbBtSn0w/RbBtSn0w').split('/')[0];
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error('GITHUB_TOKEN is required');
  }

  const readmePath = path.join(process.cwd(), 'README.md');
  const readmeText = fs.readFileSync(readmePath, 'utf8');

  try {
    const client = createGitHubClient({ token, owner });
    const model = await buildDashboardModel(client, owner);
    const dashboardMarkdown = renderDashboardMarkdown(model);
    const nextReadme = replaceDashboardBlock(readmeText, dashboardMarkdown);
    fs.writeFileSync(readmePath, nextReadme, 'utf8');
    console.log('Dashboard updated successfully.');
  } catch (error) {
    const runId = process.env.GITHUB_RUN_ID;
    const runUrl = runId
      ? `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${runId}`
      : `https://github.com/${process.env.GITHUB_REPOSITORY}/actions`;

    const withMarkers = ensureDashboardMarkers(readmeText);
    const match = withMarkers.match(
      new RegExp(`${escapeRegex(DASHBOARD_START)}([\\s\\S]*?)${escapeRegex(DASHBOARD_END)}`, 'm')
    );

    if (match) {
      const oldBlock = match[1].trim();
      const degradedBlock = applyFailureMetadata(oldBlock, runUrl);
      const nextReadme = replaceDashboardBlock(withMarkers, degradedBlock);
      fs.writeFileSync(readmePath, nextReadme, 'utf8');
      console.error(`Dashboard update failed, previous content retained with failure metadata: ${error.message}`);
      process.exit(1);
    }

    throw error;
  }
}

module.exports = {
  DASHBOARD_START,
  DASHBOARD_END,
  ensureDashboardMarkers,
  replaceDashboardBlock,
  renderDashboardMarkdown,
  createGitHubClient,
  buildDashboardModel,
  applyFailureMetadata
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
