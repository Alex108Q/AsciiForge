# AsciiForge

AsciiForge is an ASCII generator for images and videos. Drop in media, choose a character resolution, pick color or monochrome output, preview the conversion, and export the result. It runs in a browser and can also be packaged as a Windows or Linux desktop app.

## Features

- Convert images to ASCII PNG exports.
- Convert videos to ASCII WebM exports.
- Adjustable character resolution, glyph size, and video export FPS.
- Color, monochrome, and inverted monochrome modes.
- Multiple character palettes.
- English and German UI language support.
- Desktop app icon included for Windows and Linux builds.
- No server required for the web version.
- Windows and Linux desktop packaging through Electron.

## Run the web version

Open `index.html` in a modern browser.

For the best video export support, use Chrome, Edge, or another browser with `MediaRecorder` and canvas capture support.

## Run the desktop version

Install Node.js 20 or newer, then run:

```bash
npm install
npm start
```

## Build desktop packages

Windows:

```bash
npm run dist:win
```

Outputs:

- NSIS installer with English/German language selection
- Portable `.exe`

Linux:

```bash
npm run dist:linux
```

Outputs:

- AppImage
- Debian `.deb` package

Build artifacts are written to `release/`.

The Windows installer language selection is configured in `package.json` under `build.nsis`. Linux AppImage and `.deb` packages use the desktop environment/package manager flow instead of a custom installer wizard.

READ BEFORE BUILDING: I have changed the code in package.json and .github/workflows/release.yml to have respository secrets so please change it locally before building!

## GitHub releases

This repo includes a GitHub Actions workflow at `.github/workflows/release.yml`.

To build release files in GitHub:

1. Push the repo to GitHub.
2. Open the Actions tab.
3. Run `Build Desktop Apps` manually, or push a tag like `v0.1.0`.
4. Download the Windows and Linux artifacts from the workflow run.

## Roadmap ideas

- GIF export.
- Audio passthrough for exported video.
- Custom character palette input.
- More UI languages through the existing translation map.
- Terminal text export.
- Batch conversion.
- Presets for social media sizes.

## Contributing

Pull requests are welcome. Please keep changes focused, test image and video export manually, and include a short note about the browser you tested.

## License

MIT
