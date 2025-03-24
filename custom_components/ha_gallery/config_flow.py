"""Config flow for Home Assistant Gallery integration."""
from __future__ import annotations

import os
import voluptuous as vol
from typing import Any

from homeassistant.config_entries import ConfigFlow, OptionsFlow, ConfigEntry
from homeassistant.data_entry_flow import FlowResult
from homeassistant.core import callback
import homeassistant.helpers.config_validation as cv

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

from .options import HAGalleryOptionsFlow

DATA_SCHEMA = vol.Schema({
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

class HAGalleryConfigFlow(ConfigFlow, domain=DOMAIN):
    """Config flow for HA Gallery."""

    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> FlowResult:
        """Handle a flow initialized by the user."""
        errors = {}

        if user_input is not None:
            if not os.path.isdir(user_input[CONF_MEDIA_PATH]):
                errors[CONF_MEDIA_PATH] = "invalid_path"
            else:
                return self.async_create_entry(
                    title=f"Gallery: {os.path.basename(user_input[CONF_MEDIA_PATH])}",
                    data=user_input,
                )

        return self.async_show_form(
            step_id="user",
            data_schema=DATA_SCHEMA,
            errors=errors,
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        """Get the options flow."""
        return HAGalleryOptionsFlow(config_entry)
