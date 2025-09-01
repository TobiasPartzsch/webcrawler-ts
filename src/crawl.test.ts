import { describe, expect, it } from "vitest";
import { normalizeURL } from "./crawl";

const cases = [
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
    it.each(cases)("$name", ({ input, expected }) => {
        expect(normalizeURL(input)).toBe(expected);
    });
});