# Home Assistant Gallery

A custom Home Assistant integration that provides a beautiful gallery card for displaying images, videos, and GIFs from your local media folder.

## Features

- Display images, videos, and GIFs in a sleek gallery interface
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
   - Add the repository URL: `https://github.com/yourusername/ha-gallery`
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
3. Search for "Home Assistant Gallery"
4. Configure the following settings:
   - Media Path: Path to your media folder
   - Transition Interval: Time in seconds between transitions
   - Shuffle: Enable/disable random playback
   - Fit Mode: How media should fit in the display area
   - Default Volume: Initial volume for video playback

## Usage

Add the gallery card to any dashboard:

1. Edit your dashboard
2. Click the "+" button to add a new card
3. Search for "Home Assistant Gallery"
4. Add the card
5. (Optional) Adjust the card size in the dashboard

## Contributing

Feel free to submit issues and pull requests for new features or improvements.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
