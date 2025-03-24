"""The Home Assistant Gallery integration."""
from __future__ import annotations

import os
import logging
import voluptuous as vol

from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.exceptions import ConfigEntryNotReady
import homeassistant.helpers.config_validation as cv

from .const import (
    DOMAIN,
    CONF_MEDIA_PATH,
    CONF_TRANSITION_INTERVAL,
    CONF_SHUFFLE,
    CONF_FIT_MODE,
    CONF_DEFAULT_VOLUME,
)

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[Platform] = [Platform.FRONTEND]

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
    """Set up the Home Assistant Gallery component."""
    if DOMAIN in config:
        hass.async_create_task(
            hass.config_entries.flow.async_init(
                DOMAIN,
                context={"source": "import"},
                data=config[DOMAIN],
            )
        )
    return True

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Home Assistant Gallery from a config entry."""
    try:
        # Validate that the configured media path exists
        media_path = entry.data[CONF_MEDIA_PATH]
        if not os.path.isdir(media_path):
            raise ConfigEntryNotReady(f"Media path {media_path} does not exist")

        hass.data.setdefault(DOMAIN, {})
        hass.data[DOMAIN][entry.entry_id] = entry.data

        await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
        
        entry.async_on_unload(entry.add_update_listener(update_listener))
        
        return True
    except Exception as ex:
        _LOGGER.error("Error setting up Home Assistant Gallery: %s", str(ex))
        raise ConfigEntryNotReady from ex

async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        hass.data[DOMAIN].pop(entry.entry_id)
    return unload_ok

async def update_listener(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Handle options update."""
    await hass.config_entries.async_reload(entry.entry_id)
