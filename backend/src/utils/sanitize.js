const sanitizeHtml = require('sanitize-html');

// Strips ALL HTML tags/attributes (XSS defence) but keeps Markdown syntax.
// sanitize-html escapes ">" so we restore it only at line start (Markdown blockquote);
// any tag that followed it has already been removed.
function cleanMarkdown(input) {
  const stripped = sanitizeHtml(String(input ?? ''), { allowedTags: [], allowedAttributes: {} });
  return stripped.replace(/^&gt;/gm, '>').trim();
}

function cleanText(input) {
  return sanitizeHtml(String(input ?? ''), { allowedTags: [], allowedAttributes: {} })
    .replace(/&amp;/g, '&').trim();
}

module.exports = { cleanMarkdown, cleanText };
