"""Config flow for Home Assistant Gallery integration."""
import os
import voluptuous as vol
from typing import Any, Dict, Optional

from homeassistant import config_entries
from homeassistant.core import HomeAssistant, callback
from homeassistant.data_entry_flow import FlowResult
import homeassistant.helpers.config_validation as cv

from . import DOMAIN

CONF_MEDIA_PATH = "media_path"
CONF_TRANSITION_INTERVAL = "transition_interval"
CONF_SHUFFLE = "shuffle"
CONF_FIT_MODE = "fit_mode"
CONF_DEFAULT_VOLUME = "default_volume"

FIT_MODES = ["cover", "contain", "stretch"]

class HAGalleryConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Home Assistant Gallery."""

    VERSION = 1

    async def async_step_user(self, user_input: Optional[Dict[str, Any]] = None) -> FlowResult:
        """Handle the initial step."""
        errors = {}

        if user_input is not None:
            media_path = user_input[CONF_MEDIA_PATH]
            
            # Validate media path
            if not os.path.isdir(media_path):
                errors[CONF_MEDIA_PATH] = "invalid_path"
            else:
                return self.async_create_entry(
                    title="Home Assistant Gallery",
                    data=user_input
                )

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema({
                vol.Required(CONF_MEDIA_PATH, default="/media"): str,
                vol.Required(CONF_TRANSITION_INTERVAL, default=5): vol.All(
                    vol.Coerce(int), vol.Range(min=1)
                ),
                vol.Required(CONF_SHUFFLE, default=False): bool,
                vol.Required(CONF_FIT_MODE, default="contain"): vol.In(FIT_MODES),
                vol.Required(CONF_DEFAULT_VOLUME, default=50): vol.All(
                    vol.Coerce(int), vol.Range(min=0, max=100)
                ),
            }),
            errors=errors,
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        """Get the options flow for this handler."""
        return HAGalleryOptionsFlow(config_entry)


class HAGalleryOptionsFlow(config_entries.OptionsFlow):
    """Handle options."""

    def __init__(self, config_entry):
        """Initialize options flow."""
        self.config_entry = config_entry

    async def async_step_init(self, user_input: Optional[Dict[str, Any]] = None) -> FlowResult:
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
                        self.config_entry.data.get(CONF_TRANSITION_INTERVAL, 5)
                    )
                ): vol.All(vol.Coerce(int), vol.Range(min=1)),
                vol.Required(
                    CONF_SHUFFLE,
                    default=self.config_entry.options.get(
                        CONF_SHUFFLE,
                        self.config_entry.data.get(CONF_SHUFFLE, False)
                    )
                ): bool,
                vol.Required(
                    CONF_FIT_MODE,
                    default=self.config_entry.options.get(
                        CONF_FIT_MODE,
                        self.config_entry.data.get(CONF_FIT_MODE, "contain")
                    )
                ): vol.In(FIT_MODES),
                vol.Required(
                    CONF_DEFAULT_VOLUME,
                    default=self.config_entry.options.get(
                        CONF_DEFAULT_VOLUME,
                        self.config_entry.data.get(CONF_DEFAULT_VOLUME, 50)
                    )
                ): vol.All(vol.Coerce(int), vol.Range(min=0, max=100)),
            })
        )
