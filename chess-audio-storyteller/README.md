# Chess Audio Storyteller

Replay a chess game with spoken, move-by-move commentary. Choose Storyteller, Hype Shorts or Club Coach, follow the 2026 FIDE World Championship, or load your own PGN.

[Open Chess Audio Storyteller](https://venkatasubramani.github.io/chess-audio-storyteller/)

The app checks the [Gukesh–Sindarov broadcast on Lichess](https://lichess.org/broadcast/fide-world-chess-championship-2026/qfkdt8mn) when opened and every minute while visible. New rounds appear after their first move. Replaying an earlier round, the Opera Game or a custom PGN keeps your place during updates. With narration playing at the end of a live game, it waits for the next move.

The last successful update is saved in the visitor's browser. Games 1 and 2 also ship with the app for first visits when the feed is unavailable.

The portfolio publishes this directory directly on GitHub Pages. To regenerate the bundled stylesheet after changing utility classes, run `npx tailwindcss@3.4.17 --content ./index.html -o ./studio.css --minify` in this directory.
