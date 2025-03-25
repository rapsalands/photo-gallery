"""Config flow for HA Gallery integration."""
import os
import logging
import voluptuous as vol
from typing import Any, Optional, Dict

from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.data_entry_flow import FlowResult

from .const import (
    DOMAIN,
    CONF_MEDIA_SOURCES,
    CONF_SOURCE_TYPE,
    CONF_SOURCE_PATH,
    CONF_TRANSITION_INTERVAL,
    CONF_SHUFFLE,
    CONF_FIT_MODE,
    CONF_DEFAULT_VOLUME,
    DEFAULT_TRANSITION_INTERVAL,
    DEFAULT_SHUFFLE,
    DEFAULT_FIT_MODE,
    DEFAULT_VOLUME,
    FIT_MODES,
    SOURCE_TYPES,
)

_LOGGER = logging.getLogger(__name__)

class HaGalleryConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow."""

    VERSION = 1

    def __init__(self) -> None:
        """Initialize the config flow."""
        self._errors: Dict[str, str] = {}
        _LOGGER.debug("Initializing HA Gallery config flow")

    async def async_step_import(self, import_config: Optional[Dict[str, Any]] = None) -> FlowResult:
        """Import a config entry from configuration.yaml."""
        _LOGGER.debug("Starting import step with config: %s", import_config)
        return await self.async_step_user(import_config)

    async def async_step_user(self, user_input: Optional[Dict[str, Any]] = None) -> FlowResult:
        """Handle a flow initialized by the user."""
        _LOGGER.debug("Starting user step with input: %s", user_input)
        self._errors = {}

        if user_input is not None:
            _LOGGER.debug("Processing user input: %s", user_input)
            
            # Convert the flat structure to media_sources list
            media_sources = []
            source_count = 1
            
            while f"source_{source_count}_type" in user_input:
                source_type = user_input[f"source_{source_count}_type"]
                path = user_input[f"source_{source_count}_path"]
                
                # Validate path format
                if source_type == 'local' and not path.startswith('/local/'):
                    self._errors[f"source_{source_count}_path"] = "invalid_local_path"
                elif source_type == 'media_source' and not path.startswith('media-source://'):
                    self._errors[f"source_{source_count}_path"] = "invalid_media_source_path"
                else:
                    media_sources.append({
                        CONF_SOURCE_TYPE: source_type,
                        CONF_SOURCE_PATH: path
                    })
                source_count += 1
            
            if not self._errors and media_sources:
                # Create entry with the converted structure
                return self.async_create_entry(
                    title="HA Gallery",
                    data={
                        CONF_MEDIA_SOURCES: media_sources,
                        CONF_TRANSITION_INTERVAL: user_input.get(CONF_TRANSITION_INTERVAL, DEFAULT_TRANSITION_INTERVAL),
                        CONF_SHUFFLE: user_input.get(CONF_SHUFFLE, DEFAULT_SHUFFLE),
                        CONF_FIT_MODE: user_input.get(CONF_FIT_MODE, DEFAULT_FIT_MODE),
                        CONF_DEFAULT_VOLUME: user_input.get(CONF_DEFAULT_VOLUME, DEFAULT_VOLUME),
                    }
                )
            elif not media_sources:
                self._errors["base"] = "no_media_sources"

        # Show configuration form with a flat structure
        schema = {
            vol.Required("source_1_type"): vol.In(SOURCE_TYPES),
            vol.Required("source_1_path"): str,
            vol.Optional("source_2_type"): vol.In(SOURCE_TYPES),
            vol.Optional("source_2_path"): str,
            vol.Optional("source_3_type"): vol.In(SOURCE_TYPES),
            vol.Optional("source_3_path"): str,
            vol.Optional(CONF_TRANSITION_INTERVAL, default=DEFAULT_TRANSITION_INTERVAL): vol.Coerce(int),
            vol.Optional(CONF_SHUFFLE, default=DEFAULT_SHUFFLE): bool,
            vol.Optional(CONF_FIT_MODE, default=DEFAULT_FIT_MODE): vol.In(FIT_MODES),
            vol.Optional(CONF_DEFAULT_VOLUME, default=DEFAULT_VOLUME): vol.All(
                vol.Coerce(int), vol.Range(min=0, max=100)
            ),
        }

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(schema),
            errors=self._errors,
        )

@config_entries.HANDLERS.register(DOMAIN)
class OptionsFlowHandler(config_entries.OptionsFlow):
    """Handle options flow for the integration."""

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        """Initialize options flow."""
        self.config_entry = config_entry
        _LOGGER.debug("Initializing options flow for entry: %s", config_entry.entry_id)

    async def async_step_init(self, user_input: Optional[Dict[str, Any]] = None) -> FlowResult:
        """Manage options."""
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)

        schema = {
            vol.Optional(
                CONF_TRANSITION_INTERVAL,
                default=self.config_entry.options.get(
                    CONF_TRANSITION_INTERVAL, DEFAULT_TRANSITION_INTERVAL
                ),
            ): vol.Coerce(int),
            vol.Optional(
                CONF_SHUFFLE,
                default=self.config_entry.options.get(CONF_SHUFFLE, DEFAULT_SHUFFLE),
            ): bool,
            vol.Optional(
                CONF_FIT_MODE,
                default=self.config_entry.options.get(CONF_FIT_MODE, DEFAULT_FIT_MODE),
            ): vol.In(FIT_MODES),
            vol.Optional(
                CONF_DEFAULT_VOLUME,
                default=self.config_entry.options.get(CONF_DEFAULT_VOLUME, DEFAULT_VOLUME),
            ): vol.All(vol.Coerce(int), vol.Range(min=0, max=100)),
        }

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(schema),
        )
