"""Frontend for HA Photo Gallery."""
import os
import logging
from homeassistant.core import HomeAssistant
from homeassistant.components.frontend import async_register_built_in_panel
from homeassistant.components.http.view import HomeAssistantView
from homeassistant.helpers.typing import ConfigType

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

CARD_MODULE_PATH = f"/custom_components/{DOMAIN}/ha_gallery.js"

async def async_setup_frontend(hass: HomeAssistant) -> bool:
    """Set up the HA Photo Gallery frontend."""
    _LOGGER.debug("Setting up frontend")
    
    # Register the card's JavaScript file
    root_path = os.path.dirname(os.path.abspath(__file__))
    card_path = os.path.join(root_path, "ha_gallery.js")
    
    if not os.path.exists(card_path):
        _LOGGER.error("Card JavaScript file not found at %s", card_path)
        return False

    _LOGGER.debug("Registering card at %s", CARD_MODULE_PATH)
    
    # Register static path for the card
    hass.http.register_static_path(
        CARD_MODULE_PATH,
        card_path,
        cache_headers=False
    )

    # Add the card to frontend resources
    hass.http.register_view(GalleryCardView(hass, CARD_MODULE_PATH))
    
    _LOGGER.info("Frontend setup completed")
    return True


class GalleryCardView(HomeAssistantView):
    """View to load the gallery card JavaScript."""

    requires_auth = False
    url = "/ha_gallery_card.js"
    name = "ha_gallery_card"

    def __init__(self, hass: HomeAssistant, js_url: str) -> None:
        """Initialize the view."""
        self.hass = hass
        self.js_url = js_url

    async def get(self, request):
        """Get the JavaScript file."""
        return await self.hass.async_add_executor_job(
            self._load_js
        )

    def _load_js(self):
        """Load the JavaScript file."""
        with open(os.path.join(os.path.dirname(__file__), "ha_gallery.js")) as file:
            return self.hass.http.Response(
                text=file.read(),
                content_type="application/javascript",
                headers={"Cache-Control": "no-store, no-cache, must-revalidate"}
            )
