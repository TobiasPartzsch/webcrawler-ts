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

const htmlType = "text/html"

export async function getHTML(url: string) {
    console.log(`crawling ${url}`);

    let res;
    try {
        res = await fetch(url);
    } catch (err) {
        throw new Error(`Got Network error: ${(err as Error).message}`);
    }

    if (res.status > 399) {
        console.log(`Got HTTP error: ${res.status} ${res.statusText}`);
        return;
    }

    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("text/html")) {
        console.log(`Got non-HTML response: ${contentType}`);
        return;
    }

    console.log(await res.text());
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

