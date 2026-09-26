#!/bin/sh
set -eu

schedule=/state/schedule.m3u
played=/state/played.txt
[ -f "$schedule" ] || exit 0
while IFS= read -r path || [ -n "$path" ]; do
  [ -n "$path" ] || continue
  if [ -f "$played" ] && grep -Fqx -- "$path" "$played"; then continue; fi
  printf '%s\n' "$path"
done < "$schedule"
