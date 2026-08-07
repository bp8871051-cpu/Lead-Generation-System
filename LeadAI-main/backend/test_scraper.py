import asyncio
from app.services import AILeadScraperService

def main():
    url = "https://en.wikipedia.org/wiki/List_of_companies_of_India"
    print(f"Testing deep scrape on: {url}")
    results = AILeadScraperService.scrape_link(url)
    print(f"Found {len(results)} businesses without websites:")
    for r in results:
        print(r)

if __name__ == "__main__":
    main()
