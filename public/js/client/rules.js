/* Rule guides for every game mode, rendered with the real card art. */
(function () {
  'use strict';
  function c(col, v) { return { c: col, v: v }; }
  var W = 'wild';

  var R = {};

  R.classic = {
    intro: 'The original. Be the first to play every card in your hand by matching the top card of the discard pile by <b>colour</b>, <b>number</b> or <b>symbol</b>.',
    deck: '108 cards: in each of red, yellow, green and blue - one 0, two each of 1-9, two Skip, two Reverse, two Draw Two. Plus 4 Wild and 4 Wild Draw Four.',
    setup: ['Each player is dealt 7 cards (changeable in settings).', 'The top card of the draw pile starts the discard pile. If it is an action card its effect applies to the first player; a Wild Draw Four is put back and another card is turned.', 'The player to the dealer\'s left starts and play goes clockwise.'],
    turn: [
      'Play one card that matches the top discard by colour, number or symbol - or play a Wild.',
      'If you can\'t (or don\'t want to) play, draw one card. If it can be played you may play it immediately, otherwise your turn ends.',
      'When you have two cards and are about to play one, press <b>UNO!</b>. If you forget and another player catches you before the next player moves, you draw 2.',
      'The first player to empty their hand wins the round.'
    ],
    cards: [
      [c('red', '7'), 'Number cards', 'Match by colour or number.'],
      [c('blue', 'skip'), 'Skip', 'The next player loses their turn.'],
      [c('green', 'reverse'), 'Reverse', 'Reverses the direction of play. With two players it works like a Skip.'],
      [c('yellow', 'draw2'), 'Draw Two', 'The next player draws 2 cards and loses their turn.'],
      [c(W, 'wild'), 'Wild', 'Play on anything and choose the next colour.'],
      [c(W, 'wild4'), 'Wild Draw Four', 'Choose the colour; the next player draws 4 and loses their turn. Only legal if you hold no card of the current colour - the next player may <b>challenge</b>: if you were bluffing you draw 4 instead; if you were honest the challenger draws 6.']
    ],
    extra: [
      '<b>House rules</b> you can switch on: Stacking (+2 on +2, +4 on +4/+2), 7-0 (7 = swap hands with a player of your choice, 0 = everyone passes their hand), Jump-in (play an identical card out of turn), Draw until playable, Forced play.'
    ],
    scoring: 'The round winner scores the cards left in opponents\' hands: numbers = face value, Skip/Reverse/Draw Two = 20, Wild/Wild Draw Four = 50. In "Play to target" mode the first to 500 wins.'
  };

  R.flip = {
    intro: 'Every card has a <b>Light Side</b> and a <b>Dark Side</b>. Play on the Light Side until someone plays a <b>Flip</b> card - then the whole game (hands, draw pile and discard pile) turns over to the much nastier Dark Side.',
    deck: '112 double-sided cards. Light Side (red, yellow, green, blue): 1-9 ×2, Draw One, Reverse, Skip and Flip ×2 per colour, 4 Wild, 4 Wild Draw Two. Dark Side (pink, teal, orange, purple): 1-9 ×2, Draw Five, Reverse, Skip Everyone and Flip ×2 per colour, 4 Wild, 4 Wild Draw Color.',
    setup: ['Deal 7 cards Light Side towards each player. You can see the Dark Side of everybody else\'s cards - and the top of the draw pile shows its other side too!', 'Play starts on the Light Side.'],
    turn: [
      'Match colour, number or symbol of the active side, exactly like Classic.',
      'Can\'t play? Draw one; play it if you can.',
      'A <b>Flip</b> card turns everything over. Now everyone looks at the other side of their cards.',
      'Call UNO with one card left - missing it costs 2 cards.'
    ],
    cards: [
      [c('red', 'draw1'), 'Draw One (Light)', 'Next player draws 1 and loses their turn.'],
      [c('blue', 'flip'), 'Flip', 'Turn the whole game over to the other side.'],
      [c(W, 'wild2'), 'Wild Draw Two (Light)', 'Choose a colour; next player draws 2 and loses their turn. Challengeable like Wild Draw Four.'],
      [c('teal', 'draw5'), 'Draw Five (Dark)', 'Next player draws 5 and loses their turn.'],
      [c('pink', 'skipall'), 'Skip Everyone (Dark)', 'Everyone else is skipped - you play again.'],
      [c(W, 'wildcolor'), 'Wild Draw Color (Dark)', 'Choose a colour. The next player draws until they get a card of that colour and loses their turn. Challengeable.']
    ],
    extra: ['If the card flipped onto the discard pile is a Wild, the player who flipped chooses the colour.'],
    scoring: 'Light: numbers face value, Draw One 10, Reverse/Skip/Flip 20, Wild 40, Wild Draw Two 50. Dark: numbers face value, Draw Five/Reverse/Flip 20, Skip Everyone 30, Wild 40, Wild Draw Color 60. First to 500.'
  };

  R.nomercy = {
    intro: 'The most brutal UNO ever. A huge deck full of Draw 6 and Draw 10 cards, mandatory stacking, swapping hands - and if you ever hold <b>25 cards you are knocked out</b>.',
    deck: '168-card box (164 playing cards): 0-9 ×2 per colour; per colour 3 Skip, 3 Reverse, 2 Draw Two, 2 Draw Four, 3 Discard All, 2 Skip Everyone; 8 Wild Reverse Draw Four, 4 Wild Draw Six, 4 Wild Draw Ten, 8 Wild Color Roulette.',
    setup: ['Deal 7 to each player. A number card starts the discard pile.'],
    turn: [
      'Match colour, number or symbol.',
      'If you cannot play you must <b>keep drawing until you draw a playable card</b> - then you must play it.',
      '<b>Stacking:</b> when hit by a Draw card you may play a Draw card of <b>equal or higher</b> value (any colour) to pass the growing total to the next player. Whoever can\'t stack draws the whole pile of penalties.',
      '<b>7</b> = swap hands with a player of your choice. <b>0</b> = everyone passes their hand in the direction of play.',
      '<b>Mercy Rule:</b> reach 25 cards and you are out of the round.',
      'Win by emptying your hand or by being the last player standing.'
    ],
    cards: [
      [c('red', 'draw4'), 'Draw Four', 'Next player draws 4 (stackable).'],
      [c('green', 'discardall'), 'Discard All', 'Also discard every card of this colour from your hand.'],
      [c('blue', 'skipall'), 'Skip Everyone', 'Skip all other players and take another turn.'],
      [c(W, 'wildrev4'), 'Wild Reverse Draw Four', 'Reverse direction, then the next player (in the new direction) draws 4. With 2 players, you take the 4 unless you stack!'],
      [c(W, 'wild6'), 'Wild Draw Six', 'Choose a colour; next player draws 6.'],
      [c(W, 'wild10'), 'Wild Draw Ten', 'Choose a colour; next player draws 10.'],
      [c(W, 'roulette'), 'Wild Color Roulette', 'The next player names a colour, then flips cards from the draw pile until that colour shows up - keeping them all - and loses their turn.']
    ],
    extra: [],
    scoring: 'Numbers face value, coloured actions 20, wild actions 50, plus 250 for every player knocked out. First to 1000.'
  };

  R.allwild = {
    intro: 'Every single card is a Wild - there is no colour or number matching at all, so <b>every card can always be played</b>. It\'s all about the action.',
    deck: '112 cards: Wild, Wild Reverse, Wild Skip, Wild Skip Two, Wild Draw Two, Wild Draw Four, Wild Targeted Draw Two, Wild Forced Swap.',
    setup: ['Deal 7 cards each. Any card starts the game.'],
    turn: ['Play any card - it always matches.', 'You may draw one card instead (and play it if you like).', 'Shout UNO with one card left.'],
    cards: [
      [c(W, 'wild'), 'Wild', 'No effect - just a card.'],
      [c(W, 'wildrev'), 'Wild Reverse', 'Reverse the direction.'],
      [c(W, 'wildskip'), 'Wild Skip', 'Skip the next player.'],
      [c(W, 'wildskip2'), 'Wild Skip Two', 'Skip the next two players.'],
      [c(W, 'wild2'), 'Wild Draw Two', 'Next player draws 2 and loses their turn.'],
      [c(W, 'wild4'), 'Wild Draw Four', 'Next player draws 4 and loses their turn.'],
      [c(W, 'wildtarget2'), 'Wild Targeted Draw Two', 'Choose ANY player - they draw 2.'],
      [c(W, 'wildswap'), 'Wild Forced Swap', 'Swap hands with any player.']
    ],
    extra: [],
    scoring: 'Wild/Reverse/Skip 20, Skip Two & Draw Two 30, Targeted Draw Two & Forced Swap 40, Draw Four 50. First to 500.'
  };

  R.attack = {
    intro: 'There is no draw pile - instead there\'s the <b>Card Launcher</b>. Whenever you have to draw you hit the launcher. Sometimes nothing happens... sometimes it fires a pile of cards at you!',
    deck: '112 cards: 1-9 ×2, 2 Skip, 2 Reverse, 2 Hit 2, 1 Discard All and 1 Trade Hands per colour; 4 Wild, 2 Wild Hit-Fire, 2 Wild All Hit.',
    setup: ['Deal 7 each; the rest goes into the launcher.'],
    turn: [
      'Match colour, number or symbol.',
      'Can\'t play? Hit the launcher once. Keep whatever flies out - your turn ends either way.',
      'Call UNO with one card left.'
    ],
    cards: [
      [c('red', 'hit2'), 'Hit 2', 'The next player must hit the launcher twice, then loses their turn.'],
      [c('yellow', 'discardall'), 'Discard All', 'Discard every card of this colour from your hand too.'],
      [c('green', 'trade'), 'Trade Hands', 'Swap hands with any player.'],
      [c(W, 'wildhit'), 'Wild Hit-Fire', 'Choose a colour. The next player hits the launcher until it fires.'],
      [c(W, 'wildallhit'), 'Wild All Hit', 'Choose a colour. Every other player hits the launcher once.']
    ],
    extra: ['The digital launcher fires nothing about 58% of the time, 1-2 cards about 22%, and occasionally a big burst of up to 9.'],
    scoring: 'Numbers face value, actions 20, wilds 50. First to 500.'
  };

  R.liars = {
    intro: 'UNO with bluffing. Some cards carry the <b>Liar circles</b>: those cards are always played <b>face-down</b> while you announce what they are - true or false. The next player either believes you or calls <b>LIAR!</b>',
    deck: '112 cards: per colour 0, 1-9 ×2, 10, two Skip, Reverse and Draw Two; 2 Wild and 2 Wild Draw Four. The second 1, 3, 5, 7 and 9 of every colour are Liar cards (20 in total).',
    setup: ['Deal 7 each. Play as normal UNO.'],
    turn: [
      '<b>Normal cards</b> are played face-up and must match, exactly like Classic UNO.',
      '<b>Liar cards</b> (circle around the middle and in two corners) are played face-down. Tap one and either tell the truth, or claim it\'s any card that would be legal right now (e.g. "Red 7" or "Wild - blue").',
      'The next player decides: <b>Believe</b> - the announced card counts as played, with its effect. <b>Liar!</b> - the card is revealed.',
      'Caught lying: you take the card back and draw the penalty (default 2). Telling the truth: the accuser draws the penalty and the card takes effect.',
      '<b>7</b> = swap hands with a player you choose. <b>10</b> = everybody passes their hand on.'
    ],
    cards: [
      [c('blue', '10'), '10', 'Everyone passes their hand in the direction of play.'],
      [c('red', '7'), '7', 'Swap hands with any player.'],
      [{ c: 'green', v: '9', l: 1 }, 'Liar card', 'Has circles. Always played face-down with an announcement - the only cards you can bluff with.']
    ],
    extra: ['Adapted from Mattel\'s UNO Liar\'s (Bluffers) - the official rule sheet details may differ slightly; penalties are adjustable.'],
    scoring: 'Classic scoring: numbers face value, actions 20, wilds 50.'
  };

  R.dare = {
    intro: 'Classic UNO plus dares! When a Dare card hits you, either <b>perform a dare</b> or <b>draw the cards</b>. Dares come in three flavours: Family, Show-Off and Daredevil.',
    deck: '112 cards: per colour 0, 1-9 ×2, two Skip, two Reverse, one Draw Two and two Dare cards; 3 Wild, 3 Wild Draw Four, 2 Wild Dare.',
    setup: ['Deal 7 each. Best played with friends in the same room (Pass & Play) - or on a video call.'],
    turn: [
      'Normal UNO matching rules.',
      '<b>Dare card:</b> the next player chooses: take a dare (category from the card colour: red = Daredevil, yellow = Show-Off, green/blue = Family) or draw 2.',
      'Complete the dare (the table judges) and you take your turn normally. Chicken out after accepting and you draw 2 extra.',
      '<b>Wild Dare:</b> choose a colour - the next player must take a dare of that colour\'s category or draw 4.'
    ],
    cards: [
      [c('red', 'dare'), 'Dare (Daredevil)', 'Push-ups, planks, running...'],
      [c('yellow', 'dare'), 'Dare (Show-Off)', 'Dancing, singing, acting...'],
      [c('green', 'dare'), 'Dare (Family)', 'Jokes, impressions, compliments...'],
      [c(W, 'wilddare'), 'Wild Dare', 'Pick the colour (and the category). Dare or draw 4.']
    ],
    extra: ['Family deck: 48 all-ages dares written for this app.', '<b>Adults only (18+) deck:</b> choose it under Rules &amp; options. You\'ll be asked to verify your age first (and so will anyone joining your online room). Red = Spicy, yellow = Party, green/blue = Confession dares - cheeky, never explicit. You can always draw cards instead of doing a dare.'],
    scoring: 'Classic scoring; Dare 20, Wild Dare 50.'
  };

  R.dos = {
    intro: 'UNO\'s sibling. Instead of one discard pile there is a <b>Center Row</b> of cards. Match their numbers with one card - or two cards that <b>add up</b> to them. Shout <b>DOS!</b> when you\'re down to two cards.',
    deck: '108 cards: per colour three each of 1, 3, 4, 5, two each of 6-10, two Wild # cards; plus 12 Wild DOS cards.',
    setup: ['Deal 7 each and turn 2 cards face-up to form the Center Row.'],
    turn: [
      '<b>Single Number Match:</b> play one card with the same number as a Center Row card.',
      '<b>Double Number Match:</b> play two cards whose numbers add up to a Center Row card.',
      'You may match several Center Row cards in one turn, but each only once. Press <b>End Turn</b> when done.',
      '<b>Color Match bonus:</b> if your matching card(s) are also the same colour: Single Color Match - add one card from your hand to the Center Row. Double Color Match - add a card AND every other player draws 1.',
      'Can\'t match? Draw a card. If it makes a match you may play it, otherwise you must add one card from your hand to the Center Row.',
      'At the end of your turn matched cards are discarded and the Center Row is refilled to 2 cards.',
      'With two cards left shout DOS - if someone catches you first, draw 2.'
    ],
    cards: [
      [c('green', '7'), 'Number card', 'Match a 7 with a 7, or with 3+4, 1+6, 5+2...'],
      [c('red', 'hash'), 'Wild #', 'Counts as any number (1-10) in its own colour.'],
      [c(W, 'dos'), 'Wild DOS', 'Counts as a 2 of any colour.']
    ],
    extra: ['How to play here: tap one or two cards in your hand to select them, then tap a Center Row card.'],
    scoring: 'The winner scores cards left in other hands: numbers face value, Wild DOS 20, Wild # 40. First to 200.'
  };

  var GENERAL = [
    ['Playing a card', 'Click / tap a glowing card, or drag it up and throw it onto the pile.'],
    ['Drawing', 'Click the draw pile (or the Draw button). In UNO Attack! click the launcher.'],
    ['UNO!', 'Press the big UNO button while you hold two cards (before playing) - or right after you play down to one card. Press CATCH! when someone else forgets.'],
    ['Wild cards', 'A colour picker appears after you play a wild.'],
    ['Pass & Play', 'One device for everybody: hand it over when the screen says so - your cards stay hidden in between.'],
    ['Online', 'Create a room, share the 5-letter code (or link) with friends. Empty seats can be filled with CPU players. If someone disconnects a CPU plays for them until they come back.'],
    ['Liar\'s', 'Tap a card with circles (a Liar card) to play it face-down - then tap "Tell the truth" or pick a colour and a card to claim.'],
    ['Keyboard', 'D = draw, U = UNO, C = catch, P = pass/keep, 1-4 = choose colour, Esc = menu.']
  ];

  window.UNORules = { variants: R, general: GENERAL };
})();
