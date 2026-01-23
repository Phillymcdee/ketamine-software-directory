---
paths:
  - "src/pages/**/*.astro"
  - "src/pages/**/*.mdx"
---
# SEO Rules

## Meta Tags
- Every page MUST have unique `<title>` (50-60 chars)
- Every page MUST have unique meta description (150-160 chars)
- Include canonical URL on all pages
- Add og:title, og:description, og:image for social sharing

## Headings
- Use H1 once per page (contains primary keyword)
- Use H2-H6 for logical hierarchy
- Include keywords naturally in headings

## Schema.org Markup
- Software pages: Use SoftwareApplication schema
- Comparison pages: Use ItemList schema
- Include price, rating, and review data when available

## Content
- Target 1 primary keyword per page
- Use descriptive anchor text for internal links
- All images need alt text describing the content
- Include last updated date on software pages

## Technical
- Ensure all pages are in sitemap.xml
- Use semantic HTML elements
- Optimize images (WebP format, lazy loading)
- Ensure fast LCP (<2.5s)
