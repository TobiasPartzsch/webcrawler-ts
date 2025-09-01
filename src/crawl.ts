import { JSDOM } from "jsdom";

export function normalizeURL(url: string): string {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const path = u.pathname.endsWith("/") ? u.pathname.slice(0, -1) : u.pathname;
    return `${host}${path}`;
}

export function getURLsFromHTML(html: string, baseURL: string): string[] {
    const urls: string[] = []
    const dom = new JSDOM(html)
    const anchors = dom.window.document.querySelectorAll("a")

    for (const a of anchors) {
        const raw = (a.getAttribute("href") || "").trim()
        if (!raw || isUnsafeHref(raw)) continue

        // if it looks like it has a scheme, require http/https
        const firstColon = raw.indexOf(":")
        const firstSlash = raw.indexOf("/")
        if (firstColon !== -1 && (firstSlash === -1 || firstColon < firstSlash)) {
            const scheme = raw.slice(0, firstColon + 1)
            if (scheme !== "http:" && scheme !== "https:") continue
        }

        try {
            const url = new URL(raw, baseURL)
            if (url.protocol === "http:" || url.protocol === "https:") {
                urls.push(url.toString())
            }
        } catch {
            // skip malformed
        }
    }

    return urls
}


export async function crawlPage(
    baseURL: string,
    currentURL: string = baseURL,
    pages: Record<string, number> = {},
) {
    // if this is an offsite URL, bail immediately
    const currentURLObj = new URL(currentURL);
    const baseURLObj = new URL(baseURL);
    if (currentURLObj.hostname !== baseURLObj.hostname) {
        return pages;
    }

    // use a consistent URL format
    const normalizedURL = normalizeURL(currentURL);

    // if we've already visited this page
    // just increase the count and don't repeat
    // the http request
    if (pages[normalizedURL] > 0) {
        pages[normalizedURL]++;
        return pages;
    }

    // initialize this page in the map
    // since it doesn't exist yet
    pages[normalizedURL] = 1;

    // fetch and parse the html of the currentURL
    console.log(`crawling ${currentURL}`);
    let html = "";
    try {
        html = await getHTML(currentURL);
    } catch (err) {
        console.log(`${(err as Error).message}`);
        return pages;
    }

    // recur through the page's links
    const nextURLs = getURLsFromHTML(html, baseURL);
    for (const nextURL of nextURLs) {
        pages = await crawlPage(baseURL, nextURL, pages);
    }

    return pages;
}

export async function getHTML(url: string) {
    let res;
    try {
        res = await fetch(url);
    } catch (err) {
        throw new Error(`Got Network error: ${(err as Error).message}`);
    }

    if (res.status > 399) {
        throw new Error(`Got HTTP error: ${res.status} ${res.statusText}`);
    }

    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("text/html")) {
        throw new Error(`Got non-HTML response: ${contentType}`);
    }

    return res.text();
}

function isUnsafeHref(href: string): boolean {
    const lower = href.trim().toLowerCase()
    if (!lower) return true
    if (
        lower.startsWith("javascript:") ||
        lower.startsWith("mailto:") ||
        lower.startsWith("tel:") ||
        lower.startsWith("data:")
    ) return true

    // scheme-like value: require http/https
    const firstColon = lower.indexOf(":")
    const firstSlash = lower.indexOf("/")
    if (firstColon !== -1 && (firstSlash === -1 || firstColon < firstSlash)) {
        const scheme = lower.slice(0, firstColon + 1)
        return scheme !== "http:" && scheme !== "https:"
    }
    return false
}

