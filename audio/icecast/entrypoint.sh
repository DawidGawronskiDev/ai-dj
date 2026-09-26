#!/bin/sh
set -eu
: "${ICECAST_SOURCE_PASSWORD:?Set ICECAST_SOURCE_PASSWORD}"
: "${ICECAST_ADMIN_PASSWORD:?Set ICECAST_ADMIN_PASSWORD}"
export ICECAST_RELAY_PASSWORD="${ICECAST_RELAY_PASSWORD:-$ICECAST_SOURCE_PASSWORD}"
envsubst < /etc/icecast2/icecast.xml.template > /etc/icecast2/icecast.xml
exec icecast2 -c /etc/icecast2/icecast.xml
