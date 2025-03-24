"""The Home Assistant Gallery integration."""
import os
import logging
from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.exceptions import ConfigEntryNotReady

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)
PLATFORMS = [Platform.FRONTEND]

async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up the Home Assistant Gallery component."""
    hass.data.setdefault(DOMAIN, {})
    return True

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Home Assistant Gallery from a config entry."""
    try:
        # Validate that the configured media path exists
        media_path = entry.data["media_path"]
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
