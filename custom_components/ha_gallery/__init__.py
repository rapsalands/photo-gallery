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
    CONF_MEDIA_SOURCES,
    CONF_SOURCE_TYPE,
    CONF_SOURCE_PATH,
    SOURCE_TYPES,
)
from .frontend import async_setup_frontend
from .media import get_media_list

_LOGGER = logging.getLogger(__name__)

MEDIA_SOURCE_SCHEMA = vol.Schema({
    vol.Required(CONF_SOURCE_TYPE): vol.In(SOURCE_TYPES),
    vol.Required(CONF_SOURCE_PATH): cv.string,
})

CONFIG_SCHEMA = vol.Schema(
    {
        DOMAIN: vol.Schema(
            {
                vol.Required(CONF_MEDIA_SOURCES): vol.All(
                    cv.ensure_list, [MEDIA_SOURCE_SCHEMA]
                ),
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
    _LOGGER.debug("Setting up config entry: %s", entry.data)
    
    hass.data[DOMAIN][entry.entry_id] = entry.data
    
    # Create a state entity to expose configuration
    hass.states.async_set(f"{DOMAIN}.config", "configured", entry.data)
    
    return True

async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    _LOGGER.debug("Unloading config entry: %s", entry.entry_id)
    
    hass.states.async_remove(f"{DOMAIN}.config")
    hass.data[DOMAIN].pop(entry.entry_id)
    
    return True

@websocket_api.websocket_command({
    vol.Required("type"): "ha_gallery/get_media",
    vol.Required("media_sources"): vol.All(cv.ensure_list, [MEDIA_SOURCE_SCHEMA]),
})
@websocket_api.async_response
async def websocket_get_media(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Handle get media WebSocket command."""
    try:
        media_list = get_media_list(msg["media_sources"])
        connection.send_result(msg["id"], {"success": True, "media_list": media_list})
    except Exception as ex:
        _LOGGER.error("Error getting media list: %s", ex)
        connection.send_error(msg["id"], "get_media_failed", str(ex))
