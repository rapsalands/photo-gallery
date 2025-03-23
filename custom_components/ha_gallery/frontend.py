"""Frontend for Home Assistant Gallery."""
from homeassistant.core import HomeAssistant
from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http.view import HomeAssistantView
from homeassistant.helpers.typing import ConfigType

from . import DOMAIN

FRONTEND_SCRIPT_URL = f"/frontend_static/ha_gallery.js"


async def async_setup_frontend(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the Home Assistant Gallery frontend."""
    hass.http.register_static_path(
        FRONTEND_SCRIPT_URL,
        hass.config.path("custom_components", DOMAIN, "ha_gallery.js"),
        cache_headers=False,
    )

    add_extra_js_url(hass, FRONTEND_SCRIPT_URL)
    return True
