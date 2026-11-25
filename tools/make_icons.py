#!/usr/bin/env python3
"""Render the app icons in icons/ from icons/icon.svg (needs Chrome and Playwright).
The icon itself comes from the OPT icon family: opt-fx.github.io/tools/icons.py.

Usage: python3 tools/make_icons.py
  icon-192.png, icon-512.png   rounded tile with transparent corners ("any" purpose)
  icon-maskable-512.png         full-bleed square, artwork inside the 80% safe zone (Android, some launchers)
  apple-touch-icon.png (180)    full-bleed square; Safari and iOS round the corners themselves
"""
import asyncio, os, re
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
svg = open(os.path.join(ROOT, 'icons', 'icon.svg')).read()
art = svg[svg.index('<g id="art"'):svg.rindex('</svg>')]           # the artwork group, already sized to fill the tile
# Full-bleed variant: plain square background, artwork enlarged 1.18x so it fills macOS's rounded-square icon like a native app.
full = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#17181b"/>'
        f'{art}</svg>')
jobs = [('icon-192.png', svg, 192), ('icon-512.png', svg, 512), ('icon-maskable-512.png', full, 512), ('apple-touch-icon.png', full, 180)]

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('CHROME', '/usr/bin/google-chrome'))
        pg = await b.new_page()
        for name, src, n in jobs:
            await pg.set_viewport_size({'width': n, 'height': n})
            await pg.set_content('<html><body style="margin:0;background:transparent">'
                                 + src.replace('<svg ', f'<svg width="{n}" height="{n}" ', 1) + '</body></html>')
            await pg.screenshot(path=os.path.join(ROOT, 'icons', name), omit_background=True, clip={'x': 0, 'y': 0, 'width': n, 'height': n})
            print('icons/' + name)
        await b.close()
asyncio.run(main())
