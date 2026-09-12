"""
Requires: pip install apify-client
Auth: export APIFY_TOKEN=<your token from https://console.apify.com/account/integrations>
"""

import os

from apify_client import ApifyClient

client = ApifyClient(os.environ["APIFY_TOKEN"])

run_input = {
    "sources": ["worldBankProcurementNotices", "worldBankDebarredFirms"],
    "maxItemsPerSource": 50,
    "onlyNew": False,
    "countryFilter": ["Kenya", "India"],
    "noticeTypeFilter": ["Invitation for Bids"],
    "dateRange": "30d",
}

print("Starting actor-20-mdb-procurement-monitor run...")
run = client.actor("dyzTtWjfyYd7bvUZY").call(run_input=run_input)

print(f"Run finished with status: {run['status']}")
print(f"Dataset ID: {run['defaultDatasetId']}")

dataset_items = client.dataset(run["defaultDatasetId"]).list_items().items

print(f"Fetched {len(dataset_items)} normalized records:")
for item in dataset_items:
    category = item.get("category_or_type") or "n/a"
    print(f"- [{item.get('event_type')}] {item.get('record_id')}: {category}")
