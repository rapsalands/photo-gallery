"""Media source type definitions for HA Photo Gallery."""
from abc import ABC, abstractmethod
from typing import List, Dict, Any
import os
import logging

_LOGGER = logging.getLogger(__name__)

class MediaSource(ABC):
    """Abstract base class for media sources."""

    def __init__(self, config: Dict[str, Any]):
        """Initialize the media source."""
        self.config = config

    @abstractmethod
    def get_media_list(self) -> List[Dict[str, Any]]:
        """Get list of media files from this source."""
        pass

class LocalMediaSource(MediaSource):
    """Media source for local files in www directory."""

    def get_media_list(self) -> List[Dict[str, Any]]:
        """Get list of media files from local directory."""
        media_list = []
        path = self.config.get('path', '')
        
        if not path.startswith('/local/'):
            _LOGGER.error("Local media path must start with /local/")
            return []

        # Convert /local/ path to actual filesystem path
        actual_path = '/homeassistant/www/' + path.replace('/local/', '', 1)
        
        if not os.path.exists(actual_path):
            _LOGGER.error("Path does not exist: %s", actual_path)
            return []

        for root, _, files in os.walk(actual_path):
            for file in files:
                file_path = os.path.join(root, file)
                extension = os.path.splitext(file)[1].lower()

                if extension in SUPPORTED_EXTENSIONS:
                    # Convert back to /local/ URL
                    url_path = '/local/' + file_path.split('/homeassistant/www/', 1)[1]
                    media_list.append({
                        'type': 'image' if extension in IMAGE_EXTENSIONS else 'video',
                        'url': url_path,
                    })

        return media_list

class MediaSourceIntegration(MediaSource):
    """Media source using Home Assistant's media source integration."""

    def get_media_list(self) -> List[Dict[str, Any]]:
        """Get list of media files from media source."""
        media_list = []
        path = self.config.get('path', '')

        if not path.startswith('media-source://'):
            _LOGGER.error("Media source path must start with media-source://")
            return []

        # Convert media source path to actual filesystem path
        actual_path = '/media/' + path.split('media-source://media_source/')[-1]

        if not os.path.exists(actual_path):
            _LOGGER.error("Path does not exist: %s", actual_path)
            return []

        for root, _, files in os.walk(actual_path):
            for file in files:
                file_path = os.path.join(root, file)
                extension = os.path.splitext(file)[1].lower()

                if extension in SUPPORTED_EXTENSIONS:
                    # Convert back to media source URL
                    url_path = f"media-source://media_source/{file_path.split('/media/', 1)[1]}"
                    media_list.append({
                        'type': 'image' if extension in IMAGE_EXTENSIONS else 'video',
                        'url': url_path,
                    })

        return media_list

# Constants moved here since they're used by multiple classes
IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov']
SUPPORTED_EXTENSIONS = IMAGE_EXTENSIONS + VIDEO_EXTENSIONS

# Factory function to create the appropriate media source
def create_media_source(source_config: Dict[str, Any]) -> MediaSource:
    """Create a media source instance based on the configuration."""
    source_type = source_config.get('type', '')
    
    if source_type == 'local':
        return LocalMediaSource(source_config)
    elif source_type == 'media_source':
        return MediaSourceIntegration(source_config)
    else:
        raise ValueError(f"Unsupported media source type: {source_type}")
