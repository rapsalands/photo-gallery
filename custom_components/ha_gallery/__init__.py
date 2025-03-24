"""The HA Photo Gallery integration."""
import os
import logging
import asyncio
import voluptuous as vol

from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntry
from homeassistant.exceptions import ConfigEntryNotReady
import homeassistant.helpers.config_validation as cv

from .const import (
    DOMAIN,
    CONF_MEDIA_PATH,
)

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

        # Register the frontend
        hass.async_create_task(
            hass.config_entries.async_forward_entry_setup(entry, "frontend")
        )

        entry.async_on_unload(entry.add_update_listener(update_listener))
        _LOGGER.info("HA Gallery setup completed for entry %s", entry.entry_id)
        return True

    except Exception as ex:
        _LOGGER.exception("Error setting up HA Gallery: %s", str(ex))
        raise ConfigEntryNotReady from ex

async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    _LOGGER.debug("Unloading config entry %s", entry.entry_id)
    
    # Unload frontend
    unload_ok = await hass.config_entries.async_forward_entry_unload(entry, "frontend")

    if unload_ok:
        _LOGGER.debug("Successfully unloaded entry %s", entry.entry_id)
        hass.data[DOMAIN].pop(entry.entry_id)
    else:
        _LOGGER.error("Failed to unload entry %s", entry.entry_id)

    return unload_ok

async def update_listener(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Update listener."""
    _LOGGER.debug("Reloading config entry %s", entry.entry_id)
    await hass.config_entries.async_reload(entry.entry_id)
