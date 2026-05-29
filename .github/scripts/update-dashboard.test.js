const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ensureDashboardMarkers,
  replaceDashboardBlock,
  renderDashboardMarkdown,
  buildDashboardModel,
  applyFailureMetadata
} = require('./update-dashboard');

test('ensureDashboardMarkers injects dashboard markers if missing', () => {
  const input = '# Title\n\n## Section\n';
  const output = ensureDashboardMarkers(input);

  assert.match(output, /<!-- DASHBOARD:START -->/);
  assert.match(output, /<!-- DASHBOARD:END -->/);
});

test('replaceDashboardBlock only replaces between dashboard markers', () => {
  const readme = [
    'A',
    '<!-- DASHBOARD:START -->',
    'old content',
    '<!-- DASHBOARD:END -->',
    'B'
  ].join('\n');

  const next = replaceDashboardBlock(readme, 'new content');

  assert.match(next, /new content/);
  assert.match(next, /^A/m);
  assert.match(next, /^B/m);
  assert.doesNotMatch(next, /old content/);
});

test('renderDashboardMarkdown renders clean state and metadata', () => {
  const markdown = renderDashboardMarkdown({
    issues: { count: 0, url: 'https://example.com/issues' },
    prs: { count: 0, url: 'https://example.com/prs' },
    actions: { failingRepos: [], skipped: 0, unavailable: false },
    meta: { status: 'success', updatedAt: '2026-05-29T00:00:00Z' }
  });

  assert.match(markdown, /Open Issues/);
  assert.match(markdown, /inbox clean/);
  assert.match(markdown, /all latest default-branch runs passed/);
  assert.match(markdown, /Last update/);
});

test('replaceDashboardBlock does not touch blog marker section', () => {
  const readme = [
    '<!-- BLOG-POST-LIST:START -->',
    'blog content',
    '<!-- BLOG-POST-LIST:END -->',
    '<!-- DASHBOARD:START -->',
    'old dashboard',
    '<!-- DASHBOARD:END -->'
  ].join('\n');

  const next = replaceDashboardBlock(readme, 'new dashboard');

  assert.match(next, /blog content/);
  assert.match(next, /new dashboard/);
  assert.doesNotMatch(next, /old dashboard/);
});

test('buildDashboardModel keeps healthy modules when actions checks fail', async () => {
  const fakeClient = {
    getOpenIssueCount: async () => 2,
    getOpenPrCount: async () => 1,
    listPublicRepos: async () => [{ full_name: 'owner/repo', default_branch: 'main' }],
    getLatestDefaultBranchRun: async () => {
      throw new Error('rate limited');
    }
  };

  const model = await buildDashboardModel(fakeClient, 'RbBtSn0w');

  assert.equal(model.issues.count, 2);
  assert.equal(model.prs.count, 1);
  assert.equal(model.actions.unavailable, true);
  assert.equal(model.meta.status, 'partial_failure');
});

test('applyFailureMetadata updates last line metadata', () => {
  const oldBlock = [
    '#### GitHub Ops Dashboard',
    '- Open Issues: 1 ([open](https://example.com/issues))',
    '',
    '_Last update: 2026-05-28T00:00:00Z | status: success_'
  ].join('\n');

  const output = applyFailureMetadata(oldBlock, 'https://github.com/owner/repo/actions/runs/1');
  assert.match(output, /status: failed/);
  assert.match(output, /\[run\]\(https:\/\/github.com\/owner\/repo\/actions\/runs\/1\)/);
});
