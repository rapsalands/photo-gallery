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
    CONF_MEDIA_PATH,
    CONF_TRANSITION_INTERVAL,
    CONF_SHUFFLE,
    CONF_FIT_MODE,
    CONF_DEFAULT_VOLUME,
    DEFAULT_TRANSITION_INTERVAL,
    DEFAULT_SHUFFLE,
    DEFAULT_FIT_MODE,
    DEFAULT_VOLUME,
    FIT_MODES,
)

_LOGGER = logging.getLogger(__name__)

class HaGalleryConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow."""

    VERSION = 1

    def __init__(self) -> None:
        """Initialize the config flow."""
        self._errors: Dict[str, str] = {}

    async def async_step_import(self, import_config: Optional[Dict[str, Any]] = None) -> FlowResult:
        """Import a config entry from configuration.yaml."""
        return await self.async_step_user(import_config)

    async def async_step_user(self, user_input: Optional[Dict[str, Any]] = None) -> FlowResult:
        """Handle a flow initialized by the user."""
        self._errors = {}

        if user_input is not None:
            if not os.path.isdir(user_input[CONF_MEDIA_PATH]):
                self._errors[CONF_MEDIA_PATH] = "invalid_path"
            else:
                # Check if already configured
                await self.async_set_unique_id(user_input[CONF_MEDIA_PATH])
                self._abort_if_unique_id_configured()

                return self.async_create_entry(
                    title=f"Gallery: {os.path.basename(user_input[CONF_MEDIA_PATH])}",
                    data=user_input
                )

        # Show initial form
        data_schema = vol.Schema({
            vol.Required(CONF_MEDIA_PATH, default="/media"): str,
            vol.Required(CONF_TRANSITION_INTERVAL, default=DEFAULT_TRANSITION_INTERVAL): vol.All(
                vol.Coerce(int), vol.Range(min=1)
            ),
            vol.Required(CONF_SHUFFLE, default=DEFAULT_SHUFFLE): bool,
            vol.Required(CONF_FIT_MODE, default=DEFAULT_FIT_MODE): vol.In(FIT_MODES),
            vol.Required(CONF_DEFAULT_VOLUME, default=DEFAULT_VOLUME): vol.All(
                vol.Coerce(int), vol.Range(min=0, max=100)
            ),
        })

        return self.async_show_form(
            step_id="user",
            data_schema=data_schema,
            errors=self._errors,
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: config_entries.ConfigEntry) -> config_entries.OptionsFlow:
        """Get the options flow for this handler."""
        return OptionsFlowHandler(config_entry)


class OptionsFlowHandler(config_entries.OptionsFlow):
    """Handle options flow for the integration."""

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        """Initialize options flow."""
        self.config_entry = config_entry

    async def async_step_init(self, user_input: Optional[Dict[str, Any]] = None) -> FlowResult:
        """Manage options."""
        if user_input is not None:
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
