import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Navigate to the local index.html file
        await page.goto("file:///app/hagelskott-analys/frontend/index.html")

        # Add dummy auth data to localStorage to bypass the login.
        await page.evaluate("""
            localStorage.setItem('token', 'dummy_token_for_testing');
            localStorage.setItem('user', JSON.stringify({
                id: 'testuser',
                username: 'testuser',
                roles: ['user']
            }));
        """)

        # Reload the page to apply the auth state
        await page.goto("file:///app/hagelskott-analys/frontend/index.html")

        # Wait for a moment to ensure the page has had time to render
        await page.wait_for_timeout(2000) # 2 seconds

        # Take a screenshot of the initial page load
        await page.screenshot(path="jules-scratch/verification/initial_page.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
