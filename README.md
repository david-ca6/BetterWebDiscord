# BetterWebDiscord

> This app was writen by AI, because I don't give a shit about discord, and hate JS/TS... but wanted to add a few cheap features to the web version of discord...

Chrome extension that adds BetterDiscord-style features to the Discord web app.

## Current feature

- Patches Discord's built-in emoji picker.
- Locked custom emojis become clickable image-link inserts instead of Nitro upsells.
- Clicking a locked emoji inserts its Discord CDN image URL into the active message box.

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
