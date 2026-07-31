# Dark Commute Privacy Notes

Dark Commute stores the current game save and accessibility preferences locally in the player’s browser or app webview.

Standard gameplay actions are deterministic and do not require sending player text to an external narrative service.

When a player voluntarily uses **Try Something Else**, the app sends:

- the text entered by the player;
- the player’s chosen display name;
- a limited snapshot of current location, time, survival stats, inventory, active story flags, and recent game log entries.

This information is used only to generate optional flavor narration. The narrative service is not authoritative and cannot change game state. The production Android release must link this disclosure to the final public privacy policy and accurately complete Google Play’s Data Safety form.

No advertising SDK, analytics SDK, location permission, contacts permission, microphone permission, or camera permission is included in this web foundation.
