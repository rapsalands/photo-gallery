# HA Photo Gallery

A custom Home Assistant integration that provides a beautiful gallery card for displaying images, videos, and GIFs from various media sources.

## Features

- Display images, videos, and GIFs in a sleek gallery interface
- Support for multiple media sources:
  - Local media (Home Assistant's www directory)
  - Media source integration
  - (Future) Google Photos integration
- Auto-transition between media items with configurable timing
- Support for both portrait and landscape orientations
- Video playback with controls
- Touch/click controls for manual navigation
- Visual editor for easy configuration
- Configurable settings:
  - Multiple media sources (up to 3)
  - Transition interval
  - Media fit mode (contain, cover, fill)
  - Shuffle mode
  - Default video volume
- Subdirectory support for media folders

## Installation

### HACS Installation (Recommended)

1. Make sure you have [HACS](https://hacs.xyz/) installed
2. Add this repository to HACS as a custom repository:
   - Click on HACS in the sidebar
   - Click on the three dots in the top right corner
   - Select "Custom repositories"
   - Add the repository URL: `https://github.com/rapsalands/photo-gallery`
   - Select "Integration" as the category
3. Click on "Install"
4. Restart Home Assistant

### Manual Installation

1. Download the latest release
2. Copy the `custom_components/ha_gallery` folder to your `config/custom_components` directory
3. Restart Home Assistant

## Configuration

1. Go to Configuration > Integrations
2. Click the "+ ADD INTEGRATION" button
3. Search for "HA Photo Gallery"
4. Configure your media sources and settings:
   - Source 1 (Required):
     - Type: 'local' or 'media_source'
     - Path: Path to your media
   - Source 2 (Optional):
     - Type: 'local' or 'media_source'
     - Path: Path to your media
   - Source 3 (Optional):
     - Type: 'local' or 'media_source'
     - Path: Path to your media
   - Transition Interval: Time in seconds between transitions
   - Shuffle: Enable/disable random playback
   - Fit Mode: How media should fit in the display area
   - Default Volume: Initial volume for video playback

## Usage

### Dashboard Configuration

You can add the gallery card to any dashboard using either the UI or YAML configuration.

#### Using the UI
1. Edit your dashboard
2. Click the "+" button to add a new card
3. Search for "HA Gallery"
4. Configure your media sources and settings using the visual editor
5. (Optional) Adjust the card size in the dashboard

#### Using YAML

Basic configuration:
```yaml
type: custom:ha-gallery-card
media_sources:
  - type: local
    path: /local/photos  # Points to your www/photos directory
```

Full configuration with all options:
```yaml
type: custom:ha-gallery-card
media_sources:
  - type: local
    path: /local/photos
  - type: media_source
    path: /local/gallery
  - type: local
    path: /local/vacation
transition_interval: 5
shuffle: true
fit_mode: contain  # Options: contain, cover, fill
default_volume: 50
```

### Media Source Types

Currently supported media source types:

1. `local`: Access files in Home Assistant's www directory
   - Path format: `/local/path/to/files`
   - Example: `/local/photos`
   - Note: This maps to your Home Assistant's `www` directory

2. `media_source`: Access files through Home Assistant's Media Source integration
   - Path format: `/local/path/to/files` (same as local type)
   - Example: `/local/gallery`
   - Note: This uses Home Assistant's built-in media browser

### Supported File Types

- Images: jpg, jpeg, png, gif, webp
- Videos: mp4, webm, mov

## Troubleshooting

### Common Issues

1. "No media found in configured sources"
   - Check that your paths are correct
   - For local sources, make sure files are in the www directory
   - For media sources, check the path in Media Browser

2. "Invalid path format"
   - All paths must start with `/local/`
   - The path after `/local/` maps to www directory for local type
   - The path after `/local/` maps to media source for media_source type

3. Images not displaying
   - Check browser console for errors
   - Verify file permissions
   - Ensure files are in supported formats

## Support

If you're having issues:
1. Check the Home Assistant logs for errors
2. Check your browser's console for any JavaScript errors
3. Open an issue on GitHub with:
   - Your configuration
   - Home Assistant logs
   - Browser console logs
   - Steps to reproduce the issue
