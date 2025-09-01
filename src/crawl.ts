import { JSDOM } from "jsdom";
import pLimit from "p-limit";

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

class ConcurrentCrawler {
    private baseURL: string;
    private pages: Record<string, number>;
    private limit: <T>(fn: () => Promise<T>) => Promise<T>;

    constructor(baseURL: string, maxConcurrency: number = 5) {
        this.baseURL = baseURL;
        this.pages = {};
        this.limit = pLimit(maxConcurrency);
    }

    private addPageVisit(normalizedURL: string): boolean {
        if (this.pages[normalizedURL]) {
            this.pages[normalizedURL]++;
            return false;
        } else {
            this.pages[normalizedURL] = 1;
            return true;
        }
    }

    private async getHTML(currentURL: string): Promise<string> {
        return await this.limit(async () => {
            let res;
            try {
                res = await fetch(currentURL);
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
        });
    }

    private async crawlPage(currentURL: string): Promise<void> {
        const currentURLObj = new URL(currentURL);
        const baseURLObj = new URL(this.baseURL);
        if (currentURLObj.hostname !== baseURLObj.hostname) {
            return;
        }

        const normalizedURL = normalizeURL(currentURL);

        if (!this.addPageVisit(normalizedURL)) {
            return;
        }

        console.log(`crawling ${currentURL}`);
        let html = "";
        try {
            html = await this.getHTML(currentURL);
        } catch (err) {
            console.log(`${(err as Error).message}`);
            return;
        }

        const nextURLs = getURLsFromHTML(html, this.baseURL);

        const crawlPromises = nextURLs.map((nextURL) => this.crawlPage(nextURL));

        await Promise.all(crawlPromises);
    }

    async crawl(): Promise<Record<string, number>> {
        await this.crawlPage(this.baseURL);
        return this.pages;
    }
}

export async function crawlSiteAsync(
    baseURL: string,
    maxConcurrency: number = 5,
): Promise<Record<string, number>> {
    const crawler = new ConcurrentCrawler(baseURL, maxConcurrency);
    return await crawler.crawl();
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

