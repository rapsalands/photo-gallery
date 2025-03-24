"""Media handling for HA Photo Gallery."""
import os
import logging
from typing import List, Dict, Any
import mimetypes

_LOGGER = logging.getLogger(__name__)

SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
SUPPORTED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov']

def get_media_list(media_path: str) -> List[Dict[str, Any]]:
    """Get list of media files from the specified path."""
    media_list = []
    _LOGGER.debug("Scanning media path: %s", media_path)

    try:
        # Handle /media/local path
        if media_path.startswith('/media/local/'):
            actual_path = media_path.replace('/media/local/', '/config/media/')
        # Handle /local path (www directory)
        elif media_path.startswith('/local/'):
            actual_path = media_path.replace('/local/', '/config/www/')
        else:
            actual_path = media_path

        _LOGGER.debug("Actual path: %s", actual_path)

        if not os.path.exists(actual_path):
            _LOGGER.error("Media path does not exist: %s", actual_path)
            return []

        for root, _, files in os.walk(actual_path):
            for file in files:
                file_path = os.path.join(root, file)
                extension = os.path.splitext(file)[1].lower()

                if extension in SUPPORTED_IMAGE_EXTENSIONS + SUPPORTED_VIDEO_EXTENSIONS:
                    # Convert actual path back to URL path
                    if actual_path.startswith('/config/media/'):
                        url_path = file_path.replace('/config/media/', '/media/local/')
                    elif actual_path.startswith('/config/www/'):
                        url_path = file_path.replace('/config/www/', '/local/')
                    else:
                        url_path = file_path

                    media_type = ('image' if extension in SUPPORTED_IMAGE_EXTENSIONS else 'video')
                    
                    media_list.append({
                        'type': media_type,
                        'url': url_path,
                        'name': os.path.basename(file)
                    })
                    _LOGGER.debug("Added %s: %s", media_type, url_path)

        _LOGGER.info("Found %d media files in %s", len(media_list), media_path)
        return media_list

    except Exception as ex:
        _LOGGER.exception("Error scanning media directory: %s", str(ex))
        return []
