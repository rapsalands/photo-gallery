"""The HA Photo Gallery integration."""
import os
import logging
import asyncio
import voluptuous as vol

from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntry
from homeassistant.exceptions import ConfigEntryNotReady
import homeassistant.helpers.config_validation as cv
from homeassistant.components import websocket_api

from .const import (
    DOMAIN,
    CONF_MEDIA_PATH,
)
from .frontend import async_setup_frontend
from .media import get_media_list

_LOGGER = logging.getLogger(__name__)

CONFIG_SCHEMA = vol.Schema(
    {
        DOMAIN: vol.Schema(
            {
                vol.Required(CONF_MEDIA_PATH): cv.string,
            }
        )
    },
    extra=vol.ALLOW_EXTRA,
)

async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up the HA Gallery component."""
    _LOGGER.debug("Setting up HA Gallery integration")
    hass.data.setdefault(DOMAIN, {})

    # Register WebSocket API
    websocket_api.async_register_command(hass, websocket_get_media)

    # Set up frontend
    if not await async_setup_frontend(hass):
        _LOGGER.error("Failed to set up frontend")
        return False

    if DOMAIN in config:
        _LOGGER.debug("Found configuration.yaml config: %s", config[DOMAIN])
        hass.async_create_task(
            hass.config_entries.flow.async_init(
                DOMAIN,
                context={"source": "import"},
                data=config[DOMAIN],
            )
        )

    return True

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up HA Gallery from a config entry."""
    _LOGGER.debug("Setting up config entry %s", entry.entry_id)
    try:
        media_path = entry.data[CONF_MEDIA_PATH]
        _LOGGER.debug("Validating media path: %s", media_path)
        if not os.path.isdir(media_path):
            _LOGGER.error("Media path does not exist: %s", media_path)
            raise ConfigEntryNotReady(f"Media path {media_path} does not exist")

        hass.data.setdefault(DOMAIN, {})
        hass.data[DOMAIN][entry.entry_id] = entry.data
        _LOGGER.debug("Stored config data: %s", entry.data)

        entry.async_on_unload(entry.add_update_listener(update_listener))
        _LOGGER.info("HA Gallery setup completed for entry %s", entry.entry_id)
        return True

    except Exception as ex:
        _LOGGER.exception("Error setting up HA Gallery: %s", str(ex))
        raise ConfigEntryNotReady from ex

async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    _LOGGER.debug("Unloading config entry %s", entry.entry_id)

    if entry.entry_id in hass.data[DOMAIN]:
        hass.data[DOMAIN].pop(entry.entry_id)
        _LOGGER.debug("Successfully unloaded entry %s", entry.entry_id)
        return True

    return False

async def update_listener(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Update listener."""
    _LOGGER.debug("Reloading config entry %s", entry.entry_id)
    await hass.config_entries.async_reload(entry.entry_id)

@websocket_api.websocket_command({
    vol.Required("type"): "ha_gallery/get_media",
    vol.Required("media_path"): str,
})
@websocket_api.async_response
async def websocket_get_media(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Handle get media command."""
    media_path = msg["media_path"]
    _LOGGER.debug("WebSocket request for media in path: %s", media_path)

    def get_media():
        """Get media list in executor."""
        return get_media_list(media_path)

    media_list = await hass.async_add_executor_job(get_media)
    
    connection.send_result(msg["id"], {
        "success": True,
        "media_list": media_list
    })
