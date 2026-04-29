(() => {
  const TEXTBOX_SELECTOR = [
    '[role="textbox"]',
    'div[contenteditable="true"]',
  ].join(",");
  const LOCKED_EMOJI_BUTTON_SELECTOR = 'button[data-type="emoji"][data-id]';
  const STICKER_ITEM_SELECTOR = [
    'button[data-type="sticker"]',
    '[role="button"][data-type="sticker"]',
    '[data-type="sticker"][data-id]',
    'button[data-id][aria-label*="sticker" i]',
    '[role="button"][data-id][aria-label*="sticker" i]',
    '[role="gridcell"][data-id][aria-label*="sticker" i]',
    '[data-sticker-id]',
  ].join(",");

  let lastComposer = null;
  let toastTimer;

  function buildEmojiUrl(id, animated) {
    const extension = animated ? "gif" : "png";
    return `https://cdn.discordapp.com/emojis/${id}.${extension}?size=96&quality=lossless`;
  }

  function buildStickerUrl(id, formatType) {
    if (formatType === "4") {
      return `https://media.discordapp.net/stickers/${id}.gif`;
    }

    return `https://media.discordapp.net/stickers/${id}.webp?size=160&quality=lossless`;
  }

  function isTextComposer(node) {
    return node instanceof HTMLElement && node.matches(TEXTBOX_SELECTOR);
  }

  function rememberComposerFromEvent(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const composer = target.closest(TEXTBOX_SELECTOR);
    if (isTextComposer(composer)) {
      lastComposer = composer;
    }
  }

  function rememberActiveComposer() {
    if (!(document.activeElement instanceof HTMLElement)) {
      return;
    }

    const composer = document.activeElement.closest(TEXTBOX_SELECTOR);
    if (isTextComposer(composer)) {
      lastComposer = composer;
    }
  }

  function getVisibleTextboxes() {
    return [...document.querySelectorAll(TEXTBOX_SELECTOR)].filter((node) => {
      if (!isTextComposer(node)) {
        return false;
      }

      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
  }

  function findComposer() {
    if (isTextComposer(lastComposer) && document.contains(lastComposer)) {
      return lastComposer;
    }

    if (document.activeElement instanceof HTMLElement) {
      const active = document.activeElement.closest(TEXTBOX_SELECTOR);
      if (isTextComposer(active)) {
        lastComposer = active;
        return active;
      }
    }

    const composer = getVisibleTextboxes()[0] ?? null;
    if (composer) {
      lastComposer = composer;
    }

    return composer;
  }

  function readComposerText(composer) {
    return (composer.innerText || composer.textContent || "").replace(/\r/g, "");
  }

  function createTextDataTransfer(text) {
    try {
      const dataTransfer = new DataTransfer();
      dataTransfer.setData("text/plain", text);
      return dataTransfer;
    } catch (_error) {
      return {
        getData: (type) => (type === "text/plain" || type === "text" ? text : ""),
        setData: () => undefined,
        clearData: () => undefined,
        types: ["text/plain"],
      };
    }
  }

  function placeCaretAtEnd(node) {
    const selection = window.getSelection();
    if (!selection) {
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function setComposerText(composer, text) {
    composer.focus();
    placeCaretAtEnd(composer);

    const selected = document.execCommand("selectAll", false);
    const inserted = selected && document.execCommand("insertText", false, text);
    if (inserted) {
      return;
    }

    composer.textContent = text;
    composer.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        data: text,
        inputType: "insertText",
      }),
    );
    placeCaretAtEnd(composer);
  }

  function pasteTextIntoComposer(composer, text) {
    composer.focus();
    placeCaretAtEnd(composer);

    const clipboardData = createTextDataTransfer(text);
    let pasteEvent;
    try {
      pasteEvent = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData,
      });
    } catch (_error) {
      pasteEvent = new Event("paste", {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(pasteEvent, "clipboardData", {
        value: clipboardData,
      });
    }

    composer.dispatchEvent(pasteEvent);
    return true;
  }

  function insertTextWithBrowserFallback(composer, text) {
    composer.focus();
    placeCaretAtEnd(composer);

    if (document.execCommand("insertText", false, text)) {
      return true;
    }

    const currentText = readComposerText(composer);
    const suffix = currentText.endsWith(" ") || currentText.length === 0 ? "" : " ";
    setComposerText(composer, `${currentText}${suffix}${text}`);
    return true;
  }

  function beforeInputTextIntoComposer(composer, text) {
    composer.focus();
    placeCaretAtEnd(composer);

    let beforeInputEvent;
    try {
      beforeInputEvent = new InputEvent("beforeinput", {
        bubbles: true,
        cancelable: true,
        data: text,
        inputType: "insertFromPaste",
      });
    } catch (_error) {
      return false;
    }

    composer.dispatchEvent(beforeInputEvent);
    return true;
  }

  function insertUrlIntoComposer(url) {
    const composer = findComposer();
    if (!composer) {
      showToast("Click a Discord message box first.");
      return false;
    }

    composer.focus();
    placeCaretAtEnd(composer);

    const text = `${url} `;
    if (pasteTextIntoComposer(composer, text)) {
      window.setTimeout(() => {
        if (!readComposerText(composer).includes(url)) {
          insertTextWithBrowserFallback(composer, text);
        }
      }, 0);
      return true;
    }

    if (beforeInputTextIntoComposer(composer, text)) {
      return true;
    }

    return insertTextWithBrowserFallback(composer, text);
  }

  function showToast(message) {
    let toast = document.getElementById("bwd-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "bwd-toast";
      toast.className = "bwd-toast";
      document.body.append(toast);
    }

    toast.textContent = message;
    toast.classList.add("bwd-toast-visible");

    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast?.classList.remove("bwd-toast-visible");
    }, 2200);
  }

  function getLockedEmojiButton(event) {
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    for (const item of path) {
      if (!(item instanceof HTMLElement)) {
        continue;
      }

      const button = item.matches(LOCKED_EMOJI_BUTTON_SELECTOR)
        ? item
        : item.closest?.(LOCKED_EMOJI_BUTTON_SELECTOR);
      if (!(button instanceof HTMLButtonElement)) {
        continue;
      }

      const lockedImage = button.querySelector('img[class*="lockedEmoji"]');
      const lockIcon = button.querySelector('[class*="emojiLockIconContainer"]');
      if (lockedImage || lockIcon) {
        return button;
      }
    }

    return null;
  }

  function findClosestInEventPath(event, selector) {
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    for (const item of path) {
      if (!(item instanceof HTMLElement)) {
        continue;
      }

      const match = item.matches(selector) ? item : item.closest?.(selector);
      if (match instanceof HTMLElement) {
        return match;
      }
    }

    return null;
  }

  function getEmojiUrlFromButton(button) {
    const emojiId = button.dataset.id;
    if (!emojiId) {
      return null;
    }

    const image = button.querySelector("img");
    const animated = button.dataset.animated === "true" || image?.src.includes("animated=true");
    return buildEmojiUrl(emojiId, animated);
  }

  function normalizeDiscordAssetUrl(url) {
    if (!url) {
      return null;
    }

    try {
      const parsed = new URL(url, location.origin);
      if (!parsed.hostname.endsWith("discordapp.com") && !parsed.hostname.endsWith("discord.com")) {
        return null;
      }

      return parsed.href;
    } catch (_error) {
      return null;
    }
  }

  function getStickerImageUrl(item) {
    const images = item.querySelectorAll("img, source");
    for (const image of images) {
      const rawUrl = image.getAttribute("src") || image.getAttribute("srcset")?.split(" ")[0];
      const url = normalizeDiscordAssetUrl(rawUrl);
      if (url?.includes("/stickers/") || url?.includes("sticker")) {
        return url;
      }
    }

    const styleUrlMatch = item.getAttribute("style")?.match(/url\(["']?([^"')]+)["']?\)/);
    const styleUrl = normalizeDiscordAssetUrl(styleUrlMatch?.[1]);
    if (styleUrl?.includes("/stickers/") || styleUrl?.includes("sticker")) {
      return styleUrl;
    }

    return null;
  }

  function looksLikeLockedSticker(item) {
    const text = [
      item.getAttribute("aria-label"),
      item.getAttribute("title"),
      item.textContent,
      item.className,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (/(locked|lock|nitro|premium|unlock|unavailable|disabled)/.test(text)) {
      return true;
    }

    return Boolean(
      item.querySelector('[class*="stickerUnsendable"], [class*="lock"], [class*="Lock"], [class*="nitro"], [class*="Nitro"], [class*="premium"], [class*="Premium"], [aria-label*="nitro"], [aria-label*="Nitro"], [aria-label*="locked"], [aria-label*="Locked"]'),
    );
  }

  function getStickerId(item) {
    const directId = item.dataset.id || item.getAttribute("data-sticker-id");
    if (/^\d+$/.test(directId ?? "")) {
      return directId;
    }

    const descendant = item.querySelector("[data-id], [data-sticker-id]");
    const descendantId = descendant?.getAttribute("data-id") || descendant?.getAttribute("data-sticker-id");
    if (/^\d+$/.test(descendantId ?? "")) {
      return descendantId;
    }

    const imageUrl = getStickerImageUrl(item);
    return imageUrl?.match(/\/stickers\/(\d+)\./)?.[1] ?? null;
  }

  function getStickerFormatType(item) {
    const directFormatType = item.dataset.formatType || item.getAttribute("data-format-type");
    if (directFormatType) {
      return directFormatType;
    }

    const descendant = item.querySelector("[data-format-type]");
    return descendant?.getAttribute("data-format-type") ?? null;
  }

  function getStickerUrlFromItem(item) {
    const stickerId = getStickerId(item);
    const formatType = getStickerFormatType(item);
    if (stickerId && formatType === "4") {
      return buildStickerUrl(stickerId, formatType);
    }

    const existingUrl = getStickerImageUrl(item);
    if (existingUrl) {
      return existingUrl;
    }

    if (!stickerId) {
      return null;
    }

    return buildStickerUrl(stickerId, formatType);
  }

  function getStickerItem(event) {
    const explicitStickerMatch = findClosestInEventPath(event, STICKER_ITEM_SELECTOR);
    const explicitSticker = explicitStickerMatch?.closest?.('[role="button"][data-type="sticker"], button[data-type="sticker"], [data-sticker-id]') ?? explicitStickerMatch;
    if (explicitSticker && looksLikeLockedSticker(explicitSticker) && getStickerUrlFromItem(explicitSticker)) {
      return explicitSticker;
    }

    const gridCell = findClosestInEventPath(event, '[role="gridcell"]');
    if (!(gridCell instanceof HTMLElement)) {
      return null;
    }

    return looksLikeLockedSticker(gridCell) && getStickerUrlFromItem(gridCell) ? gridCell : null;
  }

  function closeExpressionPicker() {
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "Escape",
      }),
    );
  }

  function interceptLockedEmojiEvent(event) {
    const button = getLockedEmojiButton(event);
    if (!button) {
      return;
    }

    const emojiUrl = getEmojiUrlFromButton(button);
    if (!emojiUrl) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (event.type === "click" && insertUrlIntoComposer(emojiUrl)) {
      closeExpressionPicker();
    }
  }

  function interceptStickerEvent(event) {
    const item = getStickerItem(event);
    if (!item) {
      return;
    }

    const stickerUrl = getStickerUrlFromItem(item);
    if (!stickerUrl) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (event.type === "click" && insertUrlIntoComposer(stickerUrl)) {
      closeExpressionPicker();
    }
  }

  function init() {
    window.addEventListener("focusin", rememberComposerFromEvent, true);
    window.addEventListener("input", rememberComposerFromEvent, true);
    window.addEventListener("keydown", rememberActiveComposer, true);
    window.addEventListener("pointerdown", rememberActiveComposer, true);
    window.addEventListener("pointerdown", interceptLockedEmojiEvent, true);
    window.addEventListener("pointerdown", interceptStickerEvent, true);
    window.addEventListener("mousedown", interceptLockedEmojiEvent, true);
    window.addEventListener("mousedown", interceptStickerEvent, true);
    window.addEventListener("mouseup", interceptLockedEmojiEvent, true);
    window.addEventListener("mouseup", interceptStickerEvent, true);
    window.addEventListener("click", interceptLockedEmojiEvent, true);
    window.addEventListener("click", interceptStickerEvent, true);
  }

  init();
})();
