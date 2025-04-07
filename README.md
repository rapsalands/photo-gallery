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
source_type: media_source  # 'local' or 'media_source'
path: local/photos        # Path relative to your media directory
transition_time: 5
shuffle: false
fit: contain
volume: 15
```

### Options

| Name | Type | Default | Description |
|------|------|---------|-------------|
| source_type | string | media_source | Type of media source ('local' or 'media_source') |
| path | string | Required | Path to media files |
| transition_time | number | 5 | Time in seconds between transitions |
| shuffle | boolean | false | Enable random playback |
| fit | string | contain | How media fits in display area (contain/cover/fill) |
| volume | number | 15 | Default volume for videos (0-100) |

### Source Types and Paths

1. Media Source (Recommended):
```yaml
source_type: media_source
path: local/photos       # Points to photos directory in your media folder
```

2. Local files (www directory):
```yaml
source_type: local
path: /local/photos      # Points to www/photos directory
```

The path is processed as follows:
- For `media_source` type (recommended):
  - Just specify the path relative to your media directory
  - Example: `local/photos` for photos in your local media folder
  - No need to include `media-source://media_source/` prefix

- For `local` source type:
  - Use `/local/` prefix to point to files in your `www` directory
  - Example: `/local/photos` points to `www/photos` directory

### Example Configurations

Basic media source gallery:
```yaml
type: custom:ha-gallery-card
source_type: media_source
path: local/photos
transition_time: 5
```

Gallery with options:
```yaml
type: custom:ha-gallery-card
source_type: media_source
path: local/vacation_photos
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
    source_type: media_source
    path: local/family_photos
    transition_time: 5
    fit: contain
  - type: custom:ha-gallery-card
    source_type: media_source
    path: local/vacation_photos
    transition_time: 10
    fit: cover
```

## Supported File Types

- Images: jpg, jpeg, png, gif, webp
- Videos: mp4, webm, mov

## Troubleshooting

1. No media showing
   - Check that your path is correct and relative to your media directory
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
