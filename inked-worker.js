export default {
  async fetch(request) {
    const url = new URL(request.url);
    const feedUrl = url.searchParams.get('url');
    const count = parseInt(url.searchParams.get('count') || '75');

    if (!feedUrl) {
      return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let feedRes;
    try {
      feedRes = await fetch(feedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Failed to fetch feed', detail: e.message }), {
        status: 502,
        headers: corsHeaders('application/json'),
      });
    }

    const xml = await feedRes.text();
    const items = [];

    // Try RSS <item> blocks first, then Atom <entry> blocks
    const rssItems = xml.split(/<item[\s>]/i).slice(1);
    const atomItems = xml.split(/<entry[\s>]/i).slice(1);

    if (rssItems.length > 0) {
      for (const raw of rssItems) {
        const item = raw.split(/<\/item>/i)[0];
        const title    = decodeEntities(xmlTag(item, 'title'));
        const link     = linkTag(item) || xmlTag(item, 'guid');
        const pubDate  = xmlTag(item, 'pubDate') || xmlTag(item, 'dc:date');
        const content  = xmlTagNS(item, 'content:encoded') || xmlTag(item, 'description');

        const enclosure         = enclosureTag(item);
        const media_content     = mediaAttr(item, 'media:content',     'url');
        const media_thumbnail   = mediaAttr(item, 'media:thumbnail',   'url');
        const media_credit      = decodeEntities(xmlTagNS(item, 'media:credit')      || xmlTag(item, 'media:credit'));
        const media_description = decodeEntities(xmlTagNS(item, 'media:description') || xmlTag(item, 'media:description'));
        const dc_creator        = decodeEntities(xmlTag(item, 'dc:creator') || xmlTag(item, 'author'));

        if (title) items.push({
          title, link, pubDate, content,
          enclosure, media_content, media_thumbnail,
          media_credit, media_description, dc_creator,
        });
      }
    }

    if (atomItems.length > 0 && items.length === 0) {
      for (const raw of atomItems) {
        const entry = raw.split(/<\/entry>/i)[0];
        const title    = decodeEntities(xmlTag(entry, 'title'));
        const link     = xmlAttr(entry, 'link', 'href') || tagInner(entry, 'link');
        const pubDate  = xmlTag(entry, 'published') || xmlTag(entry, 'updated');
        const content  = xmlTag(entry, 'content') || xmlTag(entry, 'summary');

        const enclosure         = enclosureTag(entry);
        const media_content     = mediaAttr(entry, 'media:content',     'url');
        const media_thumbnail   = mediaAttr(entry, 'media:thumbnail',   'url');
        const media_credit      = decodeEntities(xmlTagNS(entry, 'media:credit')      || xmlTag(entry, 'media:credit'));
        const media_description = decodeEntities(xmlTagNS(entry, 'media:description') || xmlTag(entry, 'media:description'));
        const dc_creator        = decodeEntities(xmlTag(entry, 'dc:creator') || xmlTag(entry, 'author'));

        if (title) items.push({
          title, link, pubDate, content,
          enclosure, media_content, media_thumbnail,
          media_credit, media_description, dc_creator,
        });
      }
    }

    return new Response(JSON.stringify({ status: 'ok', items }), {
      headers: corsHeaders('application/json'),
    });
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function corsHeaders(contentType) {
  return {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 's-maxage=300',
  };
}

// Standard tag — handles CDATA and plain text
function xmlTag(xml, tagName) {
  const escaped = tagName.replace(':', '\\:');
  const cdata = xml.match(new RegExp(`<${escaped}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]>`, 'i'));
  if (cdata) return cdata[1].trim();
  const plain = xml.match(new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, 'i'));
  return plain ? plain[1].trim() : '';
}

// Namespaced tag like content:encoded
function xmlTagNS(xml, fullName) {
  const escaped = fullName.replace(':', '\\:');
  const cdata = xml.match(new RegExp(`<${escaped}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]>`, 'i'));
  if (cdata) return cdata[1].trim();
  const plain = xml.match(new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, 'i'));
  return plain ? plain[1].trim() : '';
}

// RSS <link> is tricky — often has no closing tag, just text node
function linkTag(xml) {
  const m = xml.match(/<link[^>]*>([^<]+)/i);
  return m ? m[1].trim() : '';
}

// Extract inner content of tag (for Atom <link> text fallback)
function tagInner(xml, tagName) {
  const m = xml.match(new RegExp(`<${tagName}[^/]*?>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return m ? m[1].trim() : '';
}

// Extract attribute value from a tag
function xmlAttr(xml, tagName, attrName) {
  const m = xml.match(new RegExp(`<${tagName}[^>]*\\s${attrName}="([^"]*)"`, 'i'));
  return m ? m[1].trim() : '';
}

// Extract a named attribute from a namespaced self-closing or open tag
function mediaAttr(xml, tagName, attrName) {
  const escaped = tagName.replace(':', '\\:');
  const m = xml.match(new RegExp(`<${escaped}[^>]*\\s${attrName}="([^"]*)"`, 'i'));
  return m ? m[1].trim() : '';
}

// Extract RSS enclosure tag as object { url, type }
// Note: local variable named `raw` to avoid shadowing the outer `xmlTag` helper
function enclosureTag(xml) {
  const m = xml.match(/<enclosure[^>]+>/i);
  if (!m) return null;
  const raw = m[0];
  const urlM  = raw.match(/url="([^"]*)"/i);
  const typeM = raw.match(/type="([^"]*)"/i);
  if (!urlM) return null;
  return { url: urlM[1], type: typeM ? typeM[1] : '' };
}

// Decode HTML entities and strip residual CDATA
function decodeEntities(str) {
  if (!str) return '';
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}
