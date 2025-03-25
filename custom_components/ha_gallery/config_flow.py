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
            
            # Validate media sources
            if CONF_MEDIA_SOURCES in user_input:
                valid = True
                for source in user_input[CONF_MEDIA_SOURCES]:
                    if source[CONF_SOURCE_TYPE] not in SOURCE_TYPES:
                        self._errors[CONF_MEDIA_SOURCES] = "invalid_source_type"
                        valid = False
                        break
                    
                    path = source[CONF_SOURCE_PATH]
                    if source[CONF_SOURCE_TYPE] == 'local':
                        if not path.startswith('/local/'):
                            self._errors[CONF_MEDIA_SOURCES] = "invalid_local_path"
                            valid = False
                            break
                    elif source[CONF_SOURCE_TYPE] == 'media_source':
                        if not path.startswith('media-source://'):
                            self._errors[CONF_MEDIA_SOURCES] = "invalid_media_source_path"
                            valid = False
                            break
                
                if valid:
                    return self.async_create_entry(
                        title="HA Gallery",
                        data=user_input
                    )
            else:
                self._errors["base"] = "no_media_sources"

        # Show configuration form
        schema = vol.Schema({
            vol.Required(CONF_MEDIA_SOURCES): {
                vol.Required("source_1"): {
                    vol.Required(CONF_SOURCE_TYPE): vol.In(SOURCE_TYPES),
                    vol.Required(CONF_SOURCE_PATH): str,
                },
                vol.Optional("source_2"): {
                    vol.Required(CONF_SOURCE_TYPE): vol.In(SOURCE_TYPES),
                    vol.Required(CONF_SOURCE_PATH): str,
                },
                vol.Optional("source_3"): {
                    vol.Required(CONF_SOURCE_TYPE): vol.In(SOURCE_TYPES),
                    vol.Required(CONF_SOURCE_PATH): str,
                },
            },
            vol.Optional(CONF_TRANSITION_INTERVAL, default=DEFAULT_TRANSITION_INTERVAL): vol.Coerce(int),
            vol.Optional(CONF_SHUFFLE, default=DEFAULT_SHUFFLE): bool,
            vol.Optional(CONF_FIT_MODE, default=DEFAULT_FIT_MODE): vol.In(FIT_MODES),
            vol.Optional(CONF_DEFAULT_VOLUME, default=DEFAULT_VOLUME): vol.All(
                vol.Coerce(int), vol.Range(min=0, max=100)
            ),
        })

        return self.async_show_form(
            step_id="user",
            data_schema=schema,
            errors=self._errors,
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: config_entries.ConfigEntry) -> config_entries.OptionsFlow:
        """Get the options flow for this handler."""
        _LOGGER.debug("Creating options flow for entry: %s", config_entry.entry_id)
        return OptionsFlowHandler(config_entry)


class OptionsFlowHandler(config_entries.OptionsFlow):
    """Handle options flow for the integration."""

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        """Initialize options flow."""
        self.config_entry = config_entry
        _LOGGER.debug("Initializing options flow for entry: %s", config_entry.entry_id)

    async def async_step_init(self, user_input: Optional[Dict[str, Any]] = None) -> FlowResult:
        """Manage options."""
        _LOGGER.debug("Starting options step with input: %s", user_input)

        if user_input is not None:
            _LOGGER.info("Updating options for entry: %s", self.config_entry.entry_id)
            return self.async_create_entry(title="", data=user_input)

        options = {
            vol.Required(
                CONF_TRANSITION_INTERVAL,
                default=self.config_entry.options.get(
                    CONF_TRANSITION_INTERVAL,
                    self.config_entry.data.get(CONF_TRANSITION_INTERVAL, DEFAULT_TRANSITION_INTERVAL)
                )
            ): vol.All(vol.Coerce(int), vol.Range(min=1)),
            vol.Required(
                CONF_SHUFFLE,
                default=self.config_entry.options.get(
                    CONF_SHUFFLE,
                    self.config_entry.data.get(CONF_SHUFFLE, DEFAULT_SHUFFLE)
                )
            ): bool,
            vol.Required(
                CONF_FIT_MODE,
                default=self.config_entry.options.get(
                    CONF_FIT_MODE,
                    self.config_entry.data.get(CONF_FIT_MODE, DEFAULT_FIT_MODE)
                )
            ): vol.In(FIT_MODES),
            vol.Required(
                CONF_DEFAULT_VOLUME,
                default=self.config_entry.options.get(
                    CONF_DEFAULT_VOLUME,
                    self.config_entry.data.get(CONF_DEFAULT_VOLUME, DEFAULT_VOLUME)
                )
            ): vol.All(vol.Coerce(int), vol.Range(min=0, max=100)),
        }

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(options)
        )
