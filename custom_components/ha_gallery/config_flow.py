"""Config flow for Home Assistant Gallery integration."""
from __future__ import annotations

import os
import voluptuous as vol
from typing import Any

from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.data_entry_flow import FlowResult
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

class HAGalleryConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Home Assistant Gallery."""

    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> FlowResult:
        """Handle the initial step."""
        errors = {}

        if user_input is not None:
            media_path = user_input[CONF_MEDIA_PATH]
            
            # Validate media path
            if not os.path.isdir(media_path):
                errors[CONF_MEDIA_PATH] = "invalid_path"
            else:
                # Check if this path is already configured
                await self.async_set_unique_id(media_path)
                self._abort_if_unique_id_configured()

                return self.async_create_entry(
                    title=f"Gallery: {os.path.basename(media_path)}",
                    data=user_input
                )

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema({
                vol.Required(CONF_MEDIA_PATH, default="/media"): str,
                vol.Required(CONF_TRANSITION_INTERVAL, default=DEFAULT_TRANSITION_INTERVAL): vol.All(
                    vol.Coerce(int), vol.Range(min=1)
                ),
                vol.Required(CONF_SHUFFLE, default=DEFAULT_SHUFFLE): bool,
                vol.Required(CONF_FIT_MODE, default=DEFAULT_FIT_MODE): vol.In(FIT_MODES),
                vol.Required(CONF_DEFAULT_VOLUME, default=DEFAULT_VOLUME): vol.All(
                    vol.Coerce(int), vol.Range(min=0, max=100)
                ),
            }),
            errors=errors,
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: config_entries.ConfigEntry) -> HAGalleryOptionsFlow:
        """Get the options flow for this handler."""
        return HAGalleryOptionsFlow(config_entry)


class HAGalleryOptionsFlow(config_entries.OptionsFlow):
    """Handle options."""

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        """Initialize options flow."""
        self.config_entry = config_entry

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> FlowResult:
        """Manage the options."""
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema({
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
            })
        )
