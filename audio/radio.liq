# Approved local files only. The controller publishes a full remaining schedule.
settings.server.telnet := false

state_dir = "/state"
music_queue = request.queue(id="music_queue", interactive=false, prefetch=1)
loaded_schedule = ref("")

def load_schedule() =
  schedule_file = "#{state_dir}/schedule.m3u"
  if file.exists("#{state_dir}/run.flag") and file.exists(schedule_file) then
    contents = file.contents(schedule_file)
    if contents != loaded_schedule() then
      uris = process.read.lines("/bin/sh /etc/liquidsoap/filter-schedule.sh")
      requests = list.map(fun (uri) -> request.create(uri), uris)
      music_queue.set_queue(requests)
      loaded_schedule := contents
      log("Loaded #{list.length(uris)} remaining tracks")
    end
  end
end
thread.run(every=0.5, load_schedule)

music = music_queue
music = crossfade(duration=5.0, music)
music = switch(track_sensitive=false, [({file.exists("#{state_dir}/run.flag")}, music)])
music.on_metadata(synchronous=false, fun (m) ->
  begin
  fname = m["filename"]
  file.write(data="#{fname}\n", append=true, "#{state_dir}/played.txt")
  file.write(
    data=json.stringify(compact=true, {
      filename = fname,
      startedAt = time()
    }),
    atomic=true,
    temp_dir=state_dir,
    "#{state_dir}/now-playing.json"
  )
  end
)
output.icecast(
  %mp3(bitrate=192, samplerate=44100, stereo=true),
  fallible=true,
  host="icecast",
  port=8000,
  password=environment.get("ICECAST_SOURCE_PASSWORD"),
  mount="/live.mp3",
  name="AI DJ rehearsal",
  music
)
