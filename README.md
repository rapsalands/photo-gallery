# HA Gallery Card

A simple and elegant gallery card for Home Assistant that displays images and videos with auto-transition support.

## Features

- Display images and videos in a sleek gallery interface
- Support for both local files and media sources
- Auto-transition between media items
- Video playback with auto-advance
- Simple controls for navigation
- Configurable display options

## Installation

### HACS Installation (Recommended)
1. Open HACS in your Home Assistant
2. Go to "Frontend" section
3. Click the menu (3 dots) in the top right
4. Select "Custom repositories"
5. Add this repository URL: `https://github.com/rapsalands/photo-gallery`
6. Select "Lovelace" as the category
7. Click "ADD"
8. Find "HA Gallery Card" in the list and click "DOWNLOAD"
9. Add the following to your Lovelace resources (if not done automatically):
```yaml
resources:
  - url: /hacsfiles/ha-gallery-card/ha-gallery-card.js
    type: module
```

### Manual Installation
1. Download `ha-gallery-card.js` from the latest release
2. Copy it to your Home Assistant's `www` folder
3. Add this to your Lovelace resources:
```yaml
resources:
  - url: /local/ha-gallery-card.js
    type: module
```

## Configuration

### Card Configuration

```yaml
type: custom:ha-gallery-card
path: /local/photos
transition_time: 5
shuffle: false
fit: contain
volume: 15
```

### Options

| Name | Type | Default | Description |
|------|------|---------|-------------|
| path | string | Required | Path to media files |
| transition_time | number | 5 | Time in seconds between transitions |
| shuffle | boolean | false | Enable random playback |
| fit | string | contain | How media fits in display area (contain/cover/fill) |
| volume | number | 15 | Default volume for videos (0-100) |

### Path Configuration

The card supports two types of paths:

1. Local path (www directory):
   ```yaml
   path: /local/photos
   ```
   Points to files in your Home Assistant's www directory

2. Media Source path:
   ```yaml
   path: /local/media_source/local/gallery
   ```
   Points to files through Home Assistant's Media Source integration

### Example Configurations

Basic local gallery:
```yaml
type: custom:ha-gallery-card
path: /local/photos
transition_time: 5
```

Media source gallery with options:
```yaml
type: custom:ha-gallery-card
path: /local/media_source/local/gallery
transition_time: 8
shuffle: true
fit: cover
volume: 20
```

Multiple cards in grid:
```yaml
type: grid
columns: 2
cards:
  - type: custom:ha-gallery-card
    path: /local/family_photos
    transition_time: 5
    fit: contain
  - type: custom:ha-gallery-card
    path: /local/vacation_videos
    transition_time: 10
    fit: cover
```

## Supported File Types

- Images: jpg, jpeg, png, gif, webp
- Videos: mp4, webm, mov

## Troubleshooting

1. No media showing
   - Check path is correct
   - Verify files exist in specified location
   - Check browser console for errors

2. Videos not playing
   - Check file format is supported
   - Check volume settings
   - Look for browser console errors

3. Auto-transition not working
   - Check transition_time setting
   - For videos, transition happens after video ends
   - Check if playback is paused
