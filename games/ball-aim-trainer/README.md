# Ball Aim Trainer

A lightweight first-person 3D target-shooting game built with Godot 4.7.

## MVP rules

- The player stays in one position and aims with the mouse.
- Twelve invisible spawn slots are arranged in front of the camera.
- Nine balls are active at a time.
- Hitting a ball moves it to a random unoccupied slot after a short effect.
- A round lasts 60 seconds.
- The result screen reports score, hits, accuracy, best streak, and reaction time.

## Controls

- Mouse: aim
- Left mouse button: shoot
- Escape: release the mouse cursor
- R: restart the round

## Project layout

- `src/`: Godot source project
- `web/`: generated Web export

The game is intentionally built from procedural geometry and synthesized sound,
so the MVP has no third-party art or audio assets.
