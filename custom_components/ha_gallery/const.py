"""Constants for the HA Photo Gallery integration."""
DOMAIN = "ha_gallery"

# Configuration
CONF_MEDIA_SOURCES = "media_sources"
CONF_SOURCE_TYPE = "type"
CONF_SOURCE_PATH = "path"
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
SOURCE_TYPES = ["local", "media_source"]
