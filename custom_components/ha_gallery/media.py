"""Media handling for HA Photo Gallery."""
from typing import List, Dict, Any
import logging
from .source_types import create_media_source

_LOGGER = logging.getLogger(__name__)

async def get_media_list(media_sources: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Get list of media files from configured sources."""
    media_list = []
    
    for source_config in media_sources:
        try:
            source = create_media_source(source_config)
            source_media = await source.get_media_list()
            media_list.extend(source_media)
        except ValueError as err:
            _LOGGER.error("Error creating media source: %s", err)
        except Exception as err:
            _LOGGER.error("Error getting media list from source %s: %s", 
                         source_config.get('type', 'unknown'), err)
    
    return media_list
