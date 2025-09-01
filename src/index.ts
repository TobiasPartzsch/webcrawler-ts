import { crawlSiteAsync } from "./crawl";


async function main() {
    const args = process.argv.slice(2);
    if (args.length !== 1) {
        console.error('Wrong number of arguments! Usage: npm run start <BASE_URL>');
        process.exit(1);
    }
    const baseURL = args[0].trim();
    console.log(`Starting crawler at base URL: "${baseURL}"`);
    const pages = await crawlSiteAsync(baseURL);

    process.exit(0);
}

main();