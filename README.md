# Stamp Pattern Generator

This is a browser-based SVG generator for negative stamp pads. It produces two laser-friendly layers:

- `engrave-black`: a filled black pad area with the text converted to vector outlines, unioned, and knocked out using `evenodd` fill.
- `cut-red`: a red hairline rectangle for the normal pad cut outline.

The app uses [opentype.js](https://github.com/opentypejs/opentype.js) in the browser to load a bold font from a CDN and convert the text into path outlines. It uses Paper.js Core from a CDN to union overlapping glyph outlines before subtraction, so tight tracking or line spacing does not invert overlap areas while preserving smooth curves. Because the text is outlined before export, the resulting SVG does not depend on the target machine having the font installed.

## Files

- [index.html](index.html): Page shell and UI markup.
- [styles.css](styles.css): Layout, panels, controls, and preview styling.
- [app.js](app.js): Font loading, outline generation, SVG assembly, preview updates, and download logic.

## How It Works

1. The user enters stamp text, pad size, bleed, tracking, and font choice.
2. The selected font is fetched from the CDN and loaded into opentype.js.
3. Each glyph is converted into outline paths.
4. The glyph outlines are unioned into one curve-preserving path.
5. The text is centered and combined with the pad rectangle into a single SVG.
6. The preview updates immediately, and the SVG can be downloaded as a file.

Auto font sizing uses a binary search to fit the outlined text within 80% of the pad area.

## Running It

Open `index.html` in a browser. A local web server is fine too, but not required for the page itself.

## Notes

- The page needs internet access the first time it loads the font files from the CDN.
- If the font cannot load, the status panel will show an error and the export button stays disabled.
- The preview and export use the same SVG generation path, so what you see is what gets downloaded.
