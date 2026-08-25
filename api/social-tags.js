import * as cheerio from 'cheerio';
import middleware from './_common/middleware.js';
import { httpGet } from './_common/http.js';
import { upstreamError } from './_common/upstream.js';
import { parseTarget, baseDomain } from './_common/parse-target.js';
import { createLogger } from './_common/logger.js';

const log = createLogger('social-tags');
const X_TIMEOUT = 8000;
const X_HANDLE = /^[A-Za-z0-9_]{1,15}$/;
const X_HOSTS = ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'];

const safeUrl = (value) => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const hostOf = (url) => safeUrl(url)?.hostname;

// Turn a twitter:site value (@handle, handle or profile URL) into a bare handle
const normalizeXHandle = (value) => {
  if (typeof value !== 'string') return null;
  let handle = value.trim();
  if (/^https?:\/\//i.test(handle)) {
    const parsed = safeUrl(handle);
    if (!parsed || !X_HOSTS.includes(parsed.hostname)) return null;
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length !== 1) return null;
    handle = parts[0];
  }
  handle = handle.replace(/^@/, '');
  return X_HANDLE.test(handle) ? handle : null;
};

// Read the profile metadata X publishes to plain HTTP clients
const parseXProfile = (html, handle) => {
  const $ = cheerio.load(html);
  if ($('meta[property="og:type"]').attr('content') !== 'profile') return null;
  const title = $('meta[property="og:title"]').attr('content') || '';
  const sameAs = $('meta[itemprop="sameAs"]')
    .map((_, el) => $(el).attr('content'))
    .get();
  const postsLabelled = $('meta[name="twitter:label1"]').attr('content') === 'Posts';
  const canonical = $('meta[itemprop="url"]').first().attr('content')?.split('/').pop();
  const website = sameAs.find((url) => hostOf(url) && hostOf(url) !== 'x.com');
  return {
    exists: true,
    handle: X_HANDLE.test(canonical || '') ? canonical : handle,
    name: title.replace(/ \(@\w+\) on X$/, '') || undefined,
    avatar: $('meta[property="og:image"]').attr('content'),
    joined: $('meta[itemprop="dateCreated"]').attr('content'),
    posts: postsLabelled ? $('meta[name="twitter:data1"]').attr('content') : undefined,
    website,
  };
};

// Official oEmbed endpoint, used to tell "no such account" from "could not check"
const confirmXHandle = async (handle) => {
  try {
    const res = await httpGet('https://publish.twitter.com/oembed', {
      params: { url: `https://x.com/${handle}` },
      timeout: X_TIMEOUT,
    });
    const canonical = res.data?.url?.split('/').pop();
    return X_HANDLE.test(canonical || '') ? { exists: true, handle: canonical } : null;
  } catch (error) {
    if (error.response?.status === 404) return { exists: false, handle };
    log.debug(`oEmbed check failed for @${handle}`, error.message);
    return null;
  }
};

// Public profile data X publishes in page metadata, needing no API key or account
const fetchXProfile = async (handle, siteHost) => {
  let profile = null;
  try {
    const res = await httpGet(`https://x.com/${handle}`, { timeout: X_TIMEOUT });
    profile = parseXProfile(res.data, handle);
  } catch (error) {
    log.debug(`profile fetch failed for @${handle}`, error.message);
  }
  if (!profile) return confirmXHandle(handle);
  const declared = profile.website && baseDomain(hostOf(profile.website));
  if (declared) profile.linksBack = declared === baseDomain(siteHost);
  return profile;
};

const socialTagsHandler = async (url) => {
  let response;
  try {
    response = await httpGet(url);
  } catch (error) {
    return upstreamError(error, 'Social tags fetch');
  }
  try {
    const $ = cheerio.load(response.data);

    const metadata = {
      // Basic meta tags
      title: $('head title').text(),
      description: $('meta[name="description"]').attr('content'),
      keywords: $('meta[name="keywords"]').attr('content'),
      canonicalUrl: $('link[rel="canonical"]').attr('href'),

      // OpenGraph Protocol
      ogTitle: $('meta[property="og:title"]').attr('content'),
      ogType: $('meta[property="og:type"]').attr('content'),
      ogImage: $('meta[property="og:image"]').attr('content'),
      ogUrl: $('meta[property="og:url"]').attr('content'),
      ogDescription: $('meta[property="og:description"]').attr('content'),
      ogSiteName: $('meta[property="og:site_name"]').attr('content'),

      // Twitter Cards
      twitterCard: $('meta[name="twitter:card"]').attr('content'),
      twitterSite: $('meta[name="twitter:site"]').attr('content'),
      twitterCreator: $('meta[name="twitter:creator"]').attr('content'),
      twitterTitle: $('meta[name="twitter:title"]').attr('content'),
      twitterDescription: $('meta[name="twitter:description"]').attr('content'),
      twitterImage: $('meta[name="twitter:image"]').attr('content'),

      // Misc
      themeColor: $('meta[name="theme-color"]').attr('content'),
      robots: $('meta[name="robots"]').attr('content'),
      googlebot: $('meta[name="googlebot"]').attr('content'),
      generator: $('meta[name="generator"]').attr('content'),
      viewport: $('meta[name="viewport"]').attr('content'),
      author: $('meta[name="author"]').attr('content'),
      publisher: $('link[rel="publisher"]').attr('href'),
      favicon: $('link[rel="icon"]').attr('href'),
    };

    const SOCIAL_FIELDS = [
      'title',
      'description',
      'keywords',
      'canonicalUrl',
      'ogTitle',
      'ogImage',
      'ogDescription',
      'ogSiteName',
      'twitterTitle',
      'twitterDescription',
      'twitterImage',
      'author',
      'publisher',
      'themeColor',
    ];
    if (!SOCIAL_FIELDS.some((f) => metadata[f])) {
      return { skipped: 'No social tags found on this page' };
    }
    const xHandle = normalizeXHandle(metadata.twitterSite);
    if (xHandle) {
      metadata.xHandle = xHandle;
      const xProfile = await fetchXProfile(xHandle, parseTarget(url).hostname);
      if (xProfile) metadata.xProfile = xProfile;
    }
    return metadata;
  } catch (error) {
    return { error: `Failed parsing social tags: ${error.message}` };
  }
};

export const handler = middleware(socialTagsHandler);
export default handler;
