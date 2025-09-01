function main() {
    const args = process.argv.slice(2);
    if (args.length !== 1) {
        console.error('Wrong number of arguments! Usage: npm run start <BASE_URL>');
        process.exit(1);
    }
    const base = args[0].trim();
    console.log(`Starting crawler at base URL: "${base}"`);
    process.exit(0);
}

main();