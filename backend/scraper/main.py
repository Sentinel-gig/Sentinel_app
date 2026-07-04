from scraper import scrape_feeds
from db import init_db, save_incidents
from street_geocoder import process_street_risks
import schedule
import time

def run_pipeline():
    print("Scraping feeds...")
    incidents = scrape_feeds()
    print(f"Found {len(incidents)} crime incidents.")
    save_incidents(incidents)
    print("Processing street-level data...")
    process_street_risks()
    print("Building map...")
    print("Done.")

if __name__ == "__main__":
    init_db()
    run_pipeline()
    schedule.every(6).hours.do(run_pipeline)
    while True:
        schedule.run_pending()
        time.sleep(60)