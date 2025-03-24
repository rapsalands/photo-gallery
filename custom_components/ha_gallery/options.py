"""Options flow handler for HA Gallery."""
from __future__ import annotations

from typing import Any
import voluptuous as vol

from homeassistant.config_entries import OptionsFlow, ConfigEntry
from homeassistant.data_entry_flow import FlowResult
import homeassistant.helpers.config_validation as cv

from .const import (
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

class HAGalleryOptionsFlow(OptionsFlow):
    """Handle options."""

    def __init__(self, config_entry: ConfigEntry) -> None:
        """Initialize options flow."""
        self.config_entry = config_entry

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> FlowResult:
        """Manage the options."""
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)

        schema = {
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
            data_schema=vol.Schema(schema),
        )
