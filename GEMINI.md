# HA Gallery Card

A custom Home Assistant Lovelace card for displaying a gallery of images and videos with auto-transition support.

## Project Overview

- **Purpose:** Provides a sleek and elegant gallery interface for Home Assistant to cycle through media from `media_source` or local paths.
- **Core Technologies:** 
    - Vanilla JavaScript (ES Modules)
    - Web Components (Shadow DOM)
    - Home Assistant Custom Card API
    - Node.js (for local testing)
- **Architecture:** 
    - `HAGalleryCard`: The main web component for rendering the gallery.
    - `HAGalleryEditor`: The editor component used in the Lovelace UI to configure the card.
    - `styles.js`: Encapsulated CSS for the components.

## Building and Running

### Local Development & Testing
The project includes a built-in test server to develop without a live Home Assistant instance.
1. **Start the test server:**
   ```bash
   node test/server.js
   ```
2. **Access the test page:**
   Open `http://localhost:8000/` in your browser.
3. **Mock Environment:**
   The test page (`test/index.html`) uses a `mockHass` object to simulate Home Assistant's WebSocket API for media browsing and resolution.

### Building
There is currently no automated build or bundling process (e.g., Webpack or Rollup). 
- Source files are located in `src/`.
- Distribution files are located in `dist/`.
- **TODO:** Implement a build script if minification or bundling becomes necessary.

### Production Installation
- **HACS:** Recommended method. Uses `hacs.json` for configuration.
- **Manual:** Copy `dist/ha-gallery-card.js` and `dist/styles.js` to your HA `www` folder.

## Development Conventions

- **Module System:** Uses ES Modules (`import`/`export`).
- **Styling:** CSS is maintained in `src/styles.js` as a template literal string and imported into the main component.
- **Home Assistant Integration:**
    - Implements `setConfig(config)` for initialization.
    - Implements `set hass(hass)` for reactive updates and API access.
    - Uses `hass.callWS` for interacting with HA's backend (specifically `media_source`).
- **Media Support:** Supports `jpg`, `jpeg`, `png`, `gif`, `webp` for images and `mp4`, `webm`, `mov` for videos.

## Directory Structure

- `src/`: Contains the primary source code.
    - `ha-gallery-card.js`: Main logic and component registration.
    - `styles.js`: Component styles.
- `dist/`: Contains the files served to Home Assistant (mirrors `src/`).
- `test/`: Local testing environment.
    - `server.js`: Simple Node.js static server.
    - `index.html`: Test harness with mock HA environment.
    - `images/`: Sample media for local testing.
- `hacs.json`: Configuration for the Home Assistant Community Store.
- `release.json`: Metadata for releases.
- `requirements.txt`: Python requirements (used for HA-related development tools).

## Manual Testing Protocol

To verify the fixes for background audio and video transitions, follow these steps using the local test server (`node test/server.js`):

### 1. Visibility & Background Audio Test
1.  Configure the card to have a video in its playlist.
2.  Start playback and wait for the video to play with sound.
3.  **Action:** Open a new browser tab or minimize the window.
4.  **Expected Result:** The audio must stop immediately.
5.  **Action:** Return to the gallery tab.
6.  **Expected Result:** The video should resume playing.

### 2. "Zombie Video" Sound Test
1.  Set a short `transition_time` (e.g., 2 seconds).
2.  Wait for the gallery to transition from a **Video** to an **Image**.
3.  **Expected Result:** As soon as the Image is visible, the Video audio must be completely silent. (Fixes the issue where audio from the previous video "leaks" into the next image).

### 3. Video Completion Test
1.  Configure a Video that is longer than the `transition_time` (e.g., a 10s video with a 5s transition setting).
2.  **Expected Result:** The card should **not** transition while the video is playing. It must wait for the video to finish entirely before showing the next item.

### 4. Continuous Shuffle Test
1.  Enable `shuffle: true`.
2.  Watch the gallery through one full cycle of all media items.
3.  **Expected Result:** Once the last item finishes, the next cycle should start in a *different* random order.
