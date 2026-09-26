# Prepare music for offline venue playback

Playback runs at the venue and uses approved music prepared locally before the event. A prepared fallback order keeps eligible music available if the LLM or internet fails; speech is omitted when TTS fails. This trades preparation time and local storage for continuity independent of live Navidrome and LLM requests. If eligible music is exhausted, playback stops unless the operator has authorized repeats.
