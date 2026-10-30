function slugify(text) {
  return String(text).toLowerCase().normalize('NFKD')
    .replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'post';
}

// Appends -2, -3... until the slug is free. `exists` is an async (slug)=>bool.
async function uniqueSlug(base, exists) {
  let slug = base, n = 1;
  while (await exists(slug)) slug = `${base}-${++n}`;
  return slug;
}

module.exports = { slugify, uniqueSlug };
