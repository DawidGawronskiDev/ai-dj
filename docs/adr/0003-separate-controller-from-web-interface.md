# Keep playback independent of the web interface

Next.js provides the operator interface while a separate persistent controller owns selection and the upcoming queue. Liquidsoap performs playback and sends audio through Icecast to a dedicated venue player. This adds a service boundary but lets playback continue when the browser closes or Next.js restarts; model output is validated by the controller before entering the queue.
