"""Frontend for HA Photo Gallery."""
import os
import logging
from homeassistant.core import HomeAssistant
from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http.view import HomeAssistantView
from homeassistant.helpers.typing import ConfigType

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

CARD_URL = f"/ha_gallery-card.js"

async def async_setup_frontend(hass: HomeAssistant) -> bool:
    """Set up the HA Photo Gallery frontend."""
    _LOGGER.debug("Setting up frontend")
    
    root_path = os.path.dirname(os.path.abspath(__file__))
    card_path = os.path.join(root_path, "lovelace", "ha-gallery-card.js")
    
    if not os.path.exists(card_path):
        _LOGGER.error("Card JavaScript file not found at %s", card_path)
        return False

    _LOGGER.debug("Registering card at %s", CARD_URL)
    
    # Register static path for the card
    try:
        hass.http.register_static_path(
            CARD_URL,
            card_path,
            cache_headers=False
        )
        
        # Add the card to frontend
        add_extra_js_url(hass, CARD_URL)
        
        _LOGGER.info("Frontend setup completed successfully")
        return True
    except Exception as ex:
        _LOGGER.exception("Error setting up frontend: %s", str(ex))
        return False
