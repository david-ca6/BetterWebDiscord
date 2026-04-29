# BetterWebDiscord

> This chrome extension is AI slop because I have no time to waste on Discord... and hate JS/TS... but needed a few tweak to make web discord usable...

Chrome extension that fix features to the Discord web app.

## Current feature

- Clicking a locked emoji inserts its Discord CDN image URL into the active message box.
- Clicking a locked sticker inserts its Discord CDN image URL into the active message box.

## Load locally

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select this repository folder.

## Use it

1. Open Discord in the browser.
2. Click the `BWD Emoji` button in the bottom-right corner.
3. Open Discord's normal emoji picker.
4. Click a locked custom emoji.
5. BetterWebDiscord inserts the emoji image URL into the active composer.
6. Send the message normally.

## Notes

- This version relies on Discord's DOM structure for locked emoji buttons, so Discord UI updates can break it.
- External emojis are inserted as image URLs, not uploaded files.
