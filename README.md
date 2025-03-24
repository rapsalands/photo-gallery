# HA Photo Gallery

A custom Home Assistant integration that provides a beautiful gallery card for displaying images, videos, and GIFs from various media sources.

## Features

- Display images, videos, and GIFs in a sleek gallery interface
- Support for multiple media sources:
  - Local media (Home Assistant's media folder)
  - Local www directory
  - Media source integration
  - (Future) Google Photos integration
- Auto-transition between media items with configurable timing
- Support for both portrait and landscape orientations
- Video playback with controls
- Touch/click controls for manual navigation
- Configurable settings:
  - Transition interval
  - Media fit mode (cover, contain, stretch)
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
4. Configure the following settings:
   - Media Sources: Configure one or more media sources
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
3. Search for "HA Photo Gallery"
4. Add the card
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
title: My Photo Gallery
aspect_ratio: '16:9'
media_sources:
  - type: local
    path: /local/photos
  - type: media_source
    path: media-source://media_source/local/gallery
transition_interval: 5
shuffle: true
fit_mode: contain  # Options: contain, cover, stretch
default_volume: 50
```

### Media Source Types

Currently supported media source types:

1. `local`: Access files in Home Assistant's www directory
   ```yaml
   type: local
   path: /local/photos  # Points to www/photos directory
   ```

2. `media_source`: Access files through Home Assistant's Media Source integration
   ```yaml
   type: media_source
   path: media-source://media_source/local/gallery
   ```

Future media source types (coming soon):
- `google_photos`: Access your Google Photos library
- More integrations planned...

### Example Dashboard Layout

Here's an example of how to integrate the gallery card into your dashboard:

```yaml
title: My Home
views:
  - title: Main
    cards:
      - type: custom:ha-gallery-card
        title: Family Photos
        aspect_ratio: '16:9'
        media_sources:
          - type: local
            path: /local/family_photos
        transition_interval: 8
        shuffle: true
        
      - type: custom:ha-gallery-card
        title: Vacation Videos
        aspect_ratio: '16:9'
        media_sources:
          - type: media_source
            path: media-source://media_source/local/vacation_videos
        transition_interval: 10
        shuffle: false
```

## Troubleshooting

### Common Issues

1. **No images showing up**: 
   - Check that your media path is correct
   - Verify file permissions
   - Check supported file formats
   - Look at Home Assistant logs for any errors

2. **Path issues**:
   - For local paths, remember to use `/local/` prefix
   - For media source paths, use the full media-source URL

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
