# ScrollShot 2.0

Local Chrome extension for full-page, visible-area and selected-area screenshots with an editing window.

## Update / install

Existing users: open `chrome://extensions`, reload ScrollShot, and accept the added permissions if Chrome requests it. Keep the same extension folder: `/home/senu/PROJECTS/scrollshot/extension`.

New users: enable Developer mode, click Load unpacked, and choose that folder. Pin ScrollShot.

## Capture

- **Full page:** visits the main document from top to bottom to trigger lazy loading, waits briefly for images, then stitches screenshot tiles.
- **Visible area:** captures the current browser viewport.
- **Select an area:** drag a rectangle over the visible website. Escape cancels selection.
- **Shortcut:** Alt+Shift+S captures a full page. Change it at `chrome://extensions/shortcuts` if another application reserves it.
- The popup can close while capturing. Reopen it to see progress or cancel. Keep the website tab selected and don't scroll or resize it until capture finishes. Switching tabs cancels safely rather than capturing the wrong page.
- A separate editor window opens on completion. The original page scroll position and temporary styles are restored. If Chrome interrupts execution, a three-minute page-side fallback restores temporary changes.

## Edit and export

- Crop, arrow, rectangle and blur: choose the tool and drag on the image.
- Text: enter the annotation text, choose Text, then click the image.
- Color and Size control drawing appearance. Size also controls text size and blur intensity.
- Undo retains up to five operations within a 100-million-pixel memory budget. Very large operations may not be retained.
- Reset restores the original screenshot. Save edits persists the edited version locally.
- Download PNG, JPEG, or a single-page image PDF. Copy image writes PNG pixels to the clipboard.
- Blur reduces readability but is not guaranteed redaction for highly sensitive information.

## Recent captures and privacy

The ten most recent captures are retained locally in IndexedDB, including saved edits. Older captures are automatically removed when a new capture exceeds that limit. Use Recent captures to reopen or delete individual images. Closing an editor without Save edits discards unsaved edits; the original capture remains available. No images, URLs or page contents are uploaded. Removing the extension removes its stored data.

Permissions: activeTab (user-invoked screenshots), scripting (scrolling, selection and temporary style changes), clipboardWrite (Copy image), offscreen (local image stitching independent of popup lifetime), storage (progress state). Production has no broad host permissions.

## Limits

Capture follows the main document vertically, at the current viewport width. Nested scrolling panels, horizontal overflow, infinite-scroll pages, changing video, and content that loads unusually slowly may require visible-area or selected-area capture. Lazy loading is best-effort; there is a bounded warmup and image wait, not an indefinite network-idle wait. Fixed/sticky elements are included in the first tile and hidden in later tiles to avoid repetitions. Pages with continuously growing height are stopped.

Maximum document height: 30,000 CSS pixels. Maximum output edge: 32,760 pixels. Maximum image area: 80 million pixels. Reduce browser zoom or capture smaller areas if a limit is reached. Browser-internal pages cannot be captured by this extension.

## Development

No build step. Requires Node and Playwright for tests only:

```
npm install
npx playwright install chromium
npm test
```

The browser suite runs in an isolated profile with a local fixture. A test-only extension copy adds all-URLs permission to substitute for a human extension-icon gesture; this permission is not in the shipped manifest. Tests cover popup closure during capture, full-page stitching, scroll/style restoration, text/arrow/rectangle/blur, undo, crop, saved edits, history deletion, PNG/JPEG/PDF exports, clipboard writes, cancellation, selected and visible areas, and shortcut registration.

Set `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH` to reuse installed dependencies.
