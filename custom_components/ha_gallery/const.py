"""Constants for the Home Assistant Gallery integration."""
DOMAIN = "ha_gallery"

# Configuration
CONF_MEDIA_PATH = "media_path"
CONF_TRANSITION_INTERVAL = "transition_interval"
CONF_SHUFFLE = "shuffle"
CONF_FIT_MODE = "fit_mode"
CONF_DEFAULT_VOLUME = "default_volume"

# Defaults
DEFAULT_TRANSITION_INTERVAL = 5
DEFAULT_SHUFFLE = False
DEFAULT_FIT_MODE = "contain"
DEFAULT_VOLUME = 50

# Options
FIT_MODES = ["contain", "cover", "stretch"]
