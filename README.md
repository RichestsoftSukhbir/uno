# UNO Arena

A 3D UNO card-game website with 8 game modes. You can play against the computer, pass one device around (pass & play), or play online with friends.

| Mode | What's special |
|------|----------------|
| **UNO Classic** | Official 108-card rules: Wild Draw Four challenges, UNO calls, official starting-card effects. Optional house rules: stacking, 7-0, jump-in, draw until playable, forced play. |
| **UNO Flip!** | Double-sided cards. A Flip card turns over every hand, the draw pile and the discard pile. Dark Side cards: Draw 5, Skip Everyone, Wild Draw Color. |
| **UNO Show 'Em No Mercy** | 168-card deck with Draw 6, Draw 10, Color Roulette, Discard All and Skip Everyone. Stacking at equal or higher value, 7-0 swaps, draw until playable, Mercy Rule (25 cards = out). |
| **UNO All Wild!** | Every card is Wild: Skip Two, Targeted Draw Two, Forced Swap... |
| **UNO Attack!** | A card launcher replaces the draw pile. It randomly fires 0-9 cards. Also Hit 2, Wild Hit-Fire, Wild All Hit and Trade Hands. |
| **UNO Liar's** | Play a card face-down and announce a card. Your opponent believes you or calls LIAR. 7 swaps hands and 10 rotates hands. |
| **UNO Dare!** | Dare cards: take a Family, Show-Off or Daredevil dare, or draw cards. Includes 48 original dares. |
| **DOS** | Center Row play. Single and double number matches, colour-match bonuses, and you shout DOS at two cards. |

The rules guide for every mode is built into the game (📖 button).

## Run it

You need Node 12 or newer.

```bash
npm install     # installs ws and gsap, and copies gsap into public/vendor
npm start       # http://localhost:3000
```

- **vs Computer** and **Pass & Play** run entirely in the browser. After the first load they also work offline, because the site installs as a PWA.
- **Online** needs the server to be running. Create a room, then share the 5-letter code or the invite link (`/?room=CODE`). Other people on your network can join through `http://<your-ip>:3000`.
  - The server runs the game, so each player only ever receives their own cards.
  - The host can fill empty seats with CPU players.
  - If a player disconnects, a CPU plays for them until they reconnect (reloading the page rejoins automatically).
  - The host can set a turn timer.
- To deploy, the app can run on any Node host (Render, Railway, Fly.io, a VPS...). The port comes from `PORT`.

## Controls

- **Play a card:** click a glowing card, or drag it upward and throw it onto the pile.
- **Draw:** click the draw pile or press **D**.
- **UNO:** press **UNO!** or **U**. **Catch** a player who forgot with **C**.
- **Other keys:** **1-4** chooses a colour, **P** passes or keeps a drawn card, **E** ends your turn in DOS, **Esc** opens the menu.

## Project layout

```
server.js                    HTTP + WebSocket rooms (server-authoritative)
public/index.html            screens, HUD and dialogs
public/css/style.css         3D table, cards, HUD and responsive layout
public/js/shared/engine.js   rules engine for all 8 modes (browser + Node)
public/js/shared/bots.js     CPU players (easy / normal / hard)
public/js/shared/controller.js  game loop: bot timing, UNO catching, turn timers
public/js/client/table.js    CSS-3D renderer animated with GSAP
public/js/client/cards.js    card art (classic faces reuse the path data of the
                             "UNO Classic cards deck" SVG)
public/js/client/sound.js    synthesised sound effects (Web Audio, no files)
public/js/client/rules.js    in-game rule guides
public/js/client/app.js      menus, sessions, HUD and input
test/simulate.js             thousands of bot-vs-bot games per mode with invariant checks
test/online.js               two simulated players finishing an online game
```

## Tests

```bash
npm test                         # 300 bot games per mode; checks legality, card conservation, unique ids
node test/simulate.js flip 2000  # one mode, more games
node test/online.js nomercy      # online round-trip (server must be running)
```

## Notes on rules sources

- **Classic, Flip, No Mercy, All Wild, Attack and DOS** follow the published Mattel rules.
- **No Mercy** has 164 playing cards; the box contains 168 cards including rule cards.
- **UNO Liar's:** Mattel's full rule sheet isn't publicly available, so the face-down announcement and challenge flow is an adaptation. The penalties can be changed in the options.
- **UNO Dare!** uses original dares written for this app.

UNO is a trademark of Mattel. This is a non-commercial fan project.
