'use strict';

// Requires: npm install apify-client
// Auth: export APIFY_TOKEN=<your token from https://console.apify.com/account/integrations>

const { ApifyClient } = require('apify-client');

const client = new ApifyClient({
    token: process.env.APIFY_TOKEN,
});

async function main() {
    const input = {
        sources: ['worldBankProcurementNotices', 'worldBankDebarredFirms'],
        maxItemsPerSource: 50,
        onlyNew: false,
        countryFilter: ['Kenya', 'India'],
        noticeTypeFilter: ['Invitation for Bids'],
        dateRange: '30d',
    };

    console.log('Starting actor-20-mdb-procurement-monitor run...');
    const run = await client.actor('dyzTtWjfyYd7bvUZY').call(input);

    console.log(`Run finished with status: ${run.status}`);
    console.log(`Dataset ID: ${run.defaultDatasetId}`);

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    console.log(`Fetched ${items.length} normalized records:`);
    for (const item of items) {
        console.log(`- [${item.event_type}] ${item.record_id}: ${item.category_or_type ?? 'n/a'}`);
    }
}

main().catch((err) => {
    console.error('Actor call failed:', err);
    process.exit(1);
});
