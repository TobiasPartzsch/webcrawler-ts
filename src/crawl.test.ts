import { describe, expect, it } from "vitest";
import { getURLsFromHTML, normalizeURL } from "./crawl";

const normalizeCases = [
    {
        name: "https no trailing slash",
        input: "https://blog.boot.dev/path",
        expected: "blog.boot.dev/path",
    },
    {
        name: "https trailing slash",
        input: "https://blog.boot.dev/path/",
        expected: "blog.boot.dev/path",
    },
    {
        name: "http no trailing slash",
        input: "http://blog.boot.dev/path",
        expected: "blog.boot.dev/path",
    },
    {
        name: "caps in host preserved path",
        input: "https://BLOG.BOOT.dev/Path",
        expected: "blog.boot.dev/Path",
    },
    {
        name: "root path slash trimmed",
        input: "https://blog.boot.dev/",
        expected: "blog.boot.dev",
    },
    {
        name: "default port ignored",
        input: "https://blog.boot.dev:443/path/",
        expected: "blog.boot.dev/path",
    },
    {
        name: "query/hash ignored",
        input: "https://blog.boot.dev/path/?q=1#top",
        expected: "blog.boot.dev/path",
    },
    {
        name: "percent-encoding preserved in path",
        input: "https://blog.boot.dev/%7Euser/Path",
        expected: "blog.boot.dev/%7Euser/Path",
    },
    {
        name: "uppercase percent-encoding preserved",
        input: "https://blog.boot.dev/%2Fapi",
        expected: "blog.boot.dev/%2Fapi",
    },
    {
        name: "double slashes in path preserved",
        input: "https://blog.boot.dev//docs//guide/",
        expected: "blog.boot.dev//docs//guide",
    },
    {
        name: "empty path",
        input: "https://blog.boot.dev",
        expected: "blog.boot.dev",
    },
    {
        name: "non-default port kept omitted",
        input: "https://blog.boot.dev:8443/path/",
        expected: "blog.boot.dev/path",
    },
    {
        name: "trim surrounding whitespace",
        input: "   https://blog.boot.dev/path/   ",
        expected: "blog.boot.dev/path",
    },
] as const;

describe("normalizeURL", () => {
    it.each(normalizeCases)("$name", ({ input, expected }) => {
        expect(normalizeURL(input)).toBe(expected);
    });
});

const getURLCases = [
    {
        name: "absolute",
        inputURL: "https://blog.boot.dev",
        inputBody:
            '<html><body><a href="https://blog.boot.dev"><span>Boot.dev></span></a></body></html>',
        expected: ["https://blog.boot.dev/"],
    },
    {
        name: "relative",
        inputURL: "https://blog.boot.dev",
        inputBody:
            '<html><body><a href="/path/one"><span>Boot.dev</span></a></body></html>',
        expected: ["https://blog.boot.dev/path/one"],
    },
    {
        name: "both",
        inputURL: "https://blog.boot.dev",
        inputBody:
            '<html><body><a href="/path/one"><span>Boot.dev</span></a><a href="https://other.com/path/one"><span>Boot.dev</span></a></body></html>',
        expected: [
            "https://blog.boot.dev/path/one",
            "https://other.com/path/one",
        ],
    },
] as const

describe("getURLsFromHTML", () => {
    it.each(getURLCases)("getURLsFromHTML $name", ({ inputBody, inputURL, expected }) => {
        expect(getURLsFromHTML(inputBody, inputURL)).toEqual(expected)
    })
})

const getURLInvalidCases = [
    {
        name: "ignores missing href",
        inputURL: "https://blog.boot.dev",
        inputBody:
            '<html><body><a>no href</a><a href="/ok">ok</a></body></html>',
        expected: ["https://blog.boot.dev/ok"],
    },
    {
        name: "ignores empty href",
        inputURL: "https://blog.boot.dev",
        inputBody:
            '<html><body><a href="">empty</a><a href="/ok">ok</a></body></html>',
        expected: ["https://blog.boot.dev/ok"],
    },
    {
        name: "ignores javascript href",
        inputURL: "https://blog.boot.dev",
        inputBody:
            '<html><body><a href="javascript:alert(1)">bad</a><a href="/ok">ok</a></body></html>',
        expected: ["https://blog.boot.dev/ok"],
    },
    {
        name: "ignores malformed URL",
        inputURL: "https://blog.boot.dev",
        inputBody:
            '<html><body><a href="ht!tp://bad^url">bad</a><a href="/ok">ok</a></body></html>',
        expected: ["https://blog.boot.dev/ok"],
    },
] as const

describe("getURLsFromHTML invalid/missing href", () => {
    it.each(getURLInvalidCases)("getURLsFromHTML $name", ({ inputBody, inputURL, expected }) => {
        expect(getURLsFromHTML(inputBody, inputURL)).toEqual(expected)
    })
})

const getURLDupCases = [
    {
        name: "keeps duplicates (un-normalized list)",
        inputURL: "https://blog.boot.dev",
        inputBody:
            '<html><body><a href="/a">A</a><a href="/a">A2</a></body></html>',
        expected: ["https://blog.boot.dev/a", "https://blog.boot.dev/a"],
    },
    {
        name: "preserves document order",
        inputURL: "https://blog.boot.dev",
        inputBody:
            '<html><body><a href="/a">A</a><a href="/b">B</a><a href="/c">C</a></body></html>',
        expected: [
            "https://blog.boot.dev/a",
            "https://blog.boot.dev/b",
            "https://blog.boot.dev/c",
        ],
    },
] as const

describe("getURLsFromHTML duplicates/order", () => {
    it.each(getURLDupCases)("getURLsFromHTML $name", ({ inputBody, inputURL, expected }) => {
        expect(getURLsFromHTML(inputBody, inputURL)).toEqual(expected)
    })
})

const getURLRelativeCases = [
    {
        name: "dot-segment ./ resolves",
        inputURL: "https://blog.boot.dev/base/",
        inputBody:
            '<html><body><a href="./a">A</a></body></html>',
        expected: ["https://blog.boot.dev/base/a"],
    },
    {
        name: "dot-segment ../ resolves",
        inputURL: "https://blog.boot.dev/base/sub/",
        inputBody:
            '<html><body><a href="../a">A</a></body></html>',
        expected: ["https://blog.boot.dev/base/a"],
    },
    {
        name: "root-relative",
        inputURL: "https://blog.boot.dev/base/sub/",
        inputBody:
            '<html><body><a href="/root">R</a></body></html>',
        expected: ["https://blog.boot.dev/root"],
    },
    {
        name: "protocol-relative //",
        inputURL: "https://blog.boot.dev",
        inputBody:
            '<html><body><a href="//cdn.boot.dev/asset">CDN</a></body></html>',
        expected: ["https://cdn.boot.dev/asset"],
    },
] as const

describe("getURLsFromHTML relative resolution", () => {
    it.each(getURLRelativeCases)("getURLsFromHTML $name", ({ inputBody, inputURL, expected }) => {
        expect(getURLsFromHTML(inputBody, inputURL)).toEqual(expected)
    })
})