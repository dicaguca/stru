# Sounds

Custom audio clips, referenced from `SOUND_FILES` in `app.jsx`:

| File | Plays when... |
|---|---|
| `session-start.mp3` | A focus session starts (played immediately — add lead-in silence in the clip itself if needed) |
| `session-10.mp3` | 10 minutes remain in a focus session (triggered 2s early, at 10:02 remaining, so the clip's content lands on the actual mark) |
| `session-5.mp3` | 5 minutes remain in a focus session (triggered 2s early, at 5:02 remaining) |
| `session-end.mp3` | A focus session ends (triggered 2s early, at 0:02 remaining; falls back to playing at actual end if the early trigger was missed, e.g. a manual early stop) |

Breaks still use the original synthesized beeps (`playBreakBeeps` in `app.jsx`) — unchanged.
