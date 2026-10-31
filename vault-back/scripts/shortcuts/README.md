# Apple Shortcuts generator

`generate_sync_shortcut.py` writes the two unsigned shortcuts served by the app, with no
manual building in the Shortcuts app:

- `VaultedMind Sync`: reads the day's Health data, POSTs it to
  `/integrations/health/batch` with the single-use `X-Sync-Token` handed over by the app
  (`shortcuts://run-shortcut?name=VaultedMind%20Sync&input=text&text=<token>`), then ends
  with an alert asking to come back with the iOS back button (top left). There is no final
  Open URL: it would open Safari or Chrome instead of the installed PWA, which refreshes
  itself on `visibilitychange`/`pageshow` thanks to the pending marker saved before leaving
  (`?healthSync=1` is still handled for older shortcuts).
- `VaultedMind Sync Debug`: same reads, but shows the JSON body in "Show Result" instead of
  sending it.

## Regenerate and sign (macOS)

```bash
cd vault-back/scripts/shortcuts
python3 -I generate_sync_shortcut.py /tmp/vm-shortcuts

plutil -lint "/tmp/vm-shortcuts/VaultedMind Sync.unsigned.shortcut"

shortcuts sign --mode anyone \
  --input "/tmp/vm-shortcuts/VaultedMind Sync.unsigned.shortcut" \
  --output ../../../vault-front/public/shortcuts/vaultedmind-sync.shortcut
shortcuts sign --mode anyone \
  --input "/tmp/vm-shortcuts/VaultedMind Sync Debug.unsigned.shortcut" \
  --output ../../../vault-front/public/shortcuts/vaultedmind-sync-debug.shortcut
```

Signing only works on macOS. Commit the signed files; CI does not regenerate them.

## What is encoded

Every action encoding comes from a real public shortcut kept in `reference/` (each file
records its source link) or from the Cherri action definitions
(https://github.com/electrikmilk/cherri):

| Reference file | Source |
| --- | --- |
| `reference/0baed2509a444f4d91d6047f6750fbe2.json` | https://www.icloud.com/shortcuts/0baed2509a444f4d91d6047f6750fbe2 (aeshef/obsidian-agent): Health type labels, `GroupBy Day`, date filter, `statistics` |
| `reference/22bb56e73c354d9aa76a3678548dfe3a.json` | https://www.icloud.com/shortcuts/22bb56e73c354d9aa76a3678548dfe3a (heartbridge README) |
| `reference/7dde7305c41a4a1f90e1817e5d12f37f.json` | https://www.icloud.com/shortcuts/7dde7305c41a4a1f90e1817e5d12f37f (steveredden/health-to-sfs): `properties.health.quantity` on `Repeat Item` |
| `reference/b542799bc07940afb3ad1f09fb1219d5.json` | https://www.icloud.com/shortcuts/b542799bc07940afb3ad1f09fb1219d5 (IXIN0530/pocketHeso) |

Facts verified on a real iPhone with an earlier test shortcut: the filter `Start Date is today`
works, and a sleep sample's Duration is in seconds. Summing sleep samples over-counts
(overlapping In Bed, stage and awake samples, several sources), so sleep is sent raw and
computed on the server.

Health types sent (label as Apple names it in the reference files):

| Backend metric | Health type | Aggregate |
| --- | --- | --- |
| `STEPS` | Steps | Sum, grouped by day |
| `ACTIVE_CALORIES` | Active Calories | Sum, grouped by day |
| `EXERCISE_MINUTES` | Exercise Time | Sum, grouped by day |
| `RESTING_HEART_RATE` | Resting Heart Rate | Average of the day's samples |
| `HEART_RATE_VARIABILITY` | Heart Rate Variability | Average of the day's samples |
| `RESPIRATORY_RATE` | Respiratory Rate | Average of the day's samples |
| sleep | Sleep | raw samples of the last 2 days as `label|start|end` lines |

Not generated, because no real shortcut confirms their type label: `DAYLIGHT_MINUTES`
(Time in Daylight) and `MINDFULNESS_MINUTES` (Mindful Minutes is a category type). The
backend accepts both, so they can be added here once a label is confirmed.

The sleep samples travel as text lines (`sleepLines`) rather than a JSON array of
dictionaries: a list variable inside a JSON dictionary is the one place where Shortcuts' type
handling is uncertain, while text is always safe. The backend also accepts the
`sleepSamples` array form.
