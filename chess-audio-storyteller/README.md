# Chess Audio Storyteller

Replay chess with move-by-move US English or Tamil audio. Choose Storyteller for a narrative, Quick take for short calls, or Club coach for positional details. The captions and copied script follow the selected audio language.

[Open Chess Audio Storyteller](https://venkatasubramani.github.io/chess-audio-storyteller/)

## Championship games

The app checks the [Gukesh–Sindarov broadcast](https://lichess.org/broadcast/fide-world-chess-championship-2026/qfkdt8mn) on opening and every minute while visible. New rounds appear after their first move. Playback can wait for the next live move. Replaying an earlier game keeps its place. The last successful update is saved in the browser, and the first two games ship with the app.

## Player reactions

The player who made the move gets the reaction, including after the board is flipped. A good or strong move gets a smiling face with `!!`. A blunder gets a surprised face with `??`. Other players use a chess icon. Next highlight jumps between marked moves.

The shipped games include centipawn evaluations from the Lichess broadcast and selected marks from [GM David Navara’s annotated games](https://lichess.org/study/iCORwmvf). Two original Game 2 highlights covering the attack and defense of b2 are labeled Storyteller pick. The app also reads main-line PGN glyphs, numeric annotations and `[%eval]` comments. Unrated moves stay neutral.

For moves without a published verdict, the app can run [Stockfish 11](https://github.com/nmrugg/stockfish.js/tree/2b87d5d16a613f3ce05b1dd0bbb58465501ed30a) in a browser worker at depth 11. These are app estimates. A move earns a strong reaction when it is the engine’s first choice and at least eight winning-chance percentage points ahead of the next choice. Drops of six, twelve and twenty-two points trigger an inaccuracy, mistake and blunder, respectively. The calculation uses the mover’s perspective and the [Lichess winning-chances curve](https://lichess.org/page/accuracy). The visible source distinguishes commentary picks, PGN marks, broadcast evaluations and the local engine.

## Audio and assets

The app prefers a matching system voice. When the voice is missing or cannot start, the site’s bundled US English or Tamil synthesizer reads the same script. Speech generation and move analysis run in the browser. The illustrated player stickers were created for this project.

The fallback includes [Spellophone 0.2.1](https://www.npmjs.com/package/@spelling-creator/spellophone/v/0.2.1), [its source](https://github.com/Spelling-Creator/spellophone), and the eSpeak NG 1.52 voice data for English and Tamil. The Stockfish distribution is the unmodified stockfish@11.0.0 asm.js worker, gzip-compressed. The [speech license](./speech/LICENSE) and [Stockfish license](./analysis/COPYING.txt) accompany the distributed components.

GitHub Pages serves the files in this directory. To regenerate the utility stylesheet after editing HTML classes, run `npx tailwindcss@3.4.17 --content ./index.html -o ./studio.css --minify` here.
