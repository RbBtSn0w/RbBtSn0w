const fs = require('fs');
const https = require('https');
const path = require('path');

const FEED_URL = 'https://rbbtsn0w.me/feed.xml';
const BLOG_URL_PREFIX = 'https://rbbtsn0w.me/posts/';
const TRANSLATION_ROOT = 'https://rbbtsn0w.me/assets/translations/';
const README_PATH = path.join(process.cwd(), 'README.md');

const MAX_POSTS = 5;

// Helper to fetch data
function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', (err) => reject(err));
  });
}

// Simple XML parser for Atom feed (Entry titles and links)
function parseFeed(xml) {
  const entries = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  while ((match = entryRegex.exec(xml)) !== null && entries.length < MAX_POSTS) {
    const entryContent = match[1];
    const titleMatch = entryContent.match(/<title>([^<]+)<\/title>/);
    const linkMatch = entryContent.match(/<link[^>]+href="([^"]+)"/);
    const publishedMatch = entryContent.match(/<published>([^<]+)<\/published>/);
    
    if (titleMatch && linkMatch) {
      const url = linkMatch[1];
      const slug = url.replace(BLOG_URL_PREFIX, '').replace(/\/$/, '');
      const dateStr = publishedMatch ? publishedMatch[1] : '';
      const date = new Date(dateStr);
      const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

      entries.push({
        title: titleMatch[1],
        url: url,
        slug: slug,
        date: formattedDate
      });
    }
  }
  return entries;
}

async function getTranslation(entry) {
  // Try to fetch from blog's translation JSON
  const jsonUrl = `${TRANSLATION_ROOT}${entry.slug}.json`;
  try {
    const jsonData = await fetch(jsonUrl);
    const translation = JSON.parse(jsonData);
    if (translation && translation.title) {
      return translation.title;
    }
  } catch (e) {
    console.log(`No translation JSON found for ${entry.slug}, using original title.`);
  }
  return entry.title;
}

async function main() {
  try {
    console.log('Fetching feed...');
    const xml = await fetch(FEED_URL);
    const entries = parseFeed(xml);

    const updatedEntries = [];
    for (const entry of entries) {
      console.log(`Mapping assets: ${entry.slug}`);
      const translatedTitle = await getTranslation(entry);
      updatedEntries.push({ ...entry, translatedTitle });
    }

    // Update README.md
    let readme = fs.readFileSync(README_PATH, 'utf8');
    const startMarker = '<!-- BLOG-POST-LIST:START -->';
    const endMarker = '<!-- BLOG-POST-LIST:END -->';
    
    const startIndex = readme.indexOf(startMarker);
    const endIndex = readme.indexOf(endMarker);

    if (startIndex !== -1 && endIndex !== -1) {
      const blogListHtml = updatedEntries.map(entry => {
        return `- ▷ [${entry.translatedTitle}](${entry.url}) — \`${entry.date}\``;
      }).join('\n');

      const newReadme = readme.substring(0, startIndex + startMarker.length) + 
                        '\n' + blogListHtml + '\n' +
                        readme.substring(endIndex);
      
      fs.writeFileSync(README_PATH, newReadme);
      console.log('README.md updated successfully from direct assets!');
    } else {
      console.error('Markers not found in README.md');
    }

  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
