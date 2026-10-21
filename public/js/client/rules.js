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

  /* ================= Desi Patti ================= */
  function sc(s, r) { return { s: s, r: r }; }

  R.bhabhi = {
    intro: 'The great Indian "get rid of your cards" game (also called Get Away). Follow suit, dodge the pick-ups - the last player still holding cards is the <b>Bhabhi</b>!',
    deck: 'One standard 52-card deck, Aces high. All cards are dealt out (some players may get one more card).',
    setup: ['Shuffle and deal every card.', 'The player holding the <b>Ace of Spades</b> starts by leading it.'],
    turn: [
      'Going round the table, everyone plays one card to the trick and <b>must follow the suit led</b> if they can.',
      'If everyone follows suit, the trick goes out of play and the player of the highest card leads next.',
      'If someone can\'t follow suit, they play any other card - a <b>thulla</b>. The trick stops at once and the player who played the <b>highest card of the led suit picks up the whole trick</b> into their hand, then leads.',
      'Run out of cards and you are <b>safe</b>. The last player left with cards is the Bhabhi.'
    ],
    cardsTitle: 'Key cards',
    cards: [
      [sc('S', 'A'), 'Ace of Spades', 'Whoever holds it opens the game with it.'],
      [sc('H', 'K'), 'High cards', 'Dangerous: the highest card of the led suit picks up when someone throws a thulla.'],
      [sc('C', '2'), 'Low cards', 'Safe to follow with - you rarely end up as the one picking up.']
    ],
    extra: ['Tip: when you can\'t follow suit, throw your biggest, most dangerous card as the thulla.'],
    scoring: 'Each round everyone except the Bhabhi scores 1 point. With several rounds, the most points wins.'
  };

  R.bluff = {
    intro: 'Known as Bluff, Cheat or "Mai Bluff". Get rid of all your cards by placing them face-down and announcing what they are - truthfully or not.',
    deck: 'One 52-card deck (or two decks for big tables). All cards are dealt.',
    setup: ['Deal all cards. The player after the dealer starts the first pile.'],
    turn: [
      'Start a pile: put <b>1-4 cards face-down</b> and claim a rank, e.g. "three Kings".',
      'Each next player either adds 1-4 cards claiming the <b>same rank</b>, <b>passes</b>, or calls <b>Bluff!</b> on the previous player\'s cards.',
      'Bluff called: the last play is turned over. If any card isn\'t the claimed rank, the bluffer takes the whole pile. If it was all true, the caller takes it. The player who did not pick up starts the next pile.',
      'If everyone passes in a row, the pile is cleared away and the last player to play starts a new pile.',
      'Play your last card and survive the next player\'s turn without being caught - you win!'
    ],
    cardsTitle: 'Tips',
    cards: [
      [sc('H', 'K'), 'Hold your sets', 'Claiming a rank you really hold makes your bluffs later much safer.'],
      [sc('S', 'Q'), 'Count the cards', 'There are only four of each rank - if more are claimed, someone is lying!'],
      ['back', 'Face-down pile', 'Only the last play is checked when someone calls Bluff.']
    ],
    extra: ['How to play here: tap 1-4 cards to select them, then press Play. Starting a pile asks you which rank to claim.'],
    scoring: 'The winner of each round scores 1 point.'
  };

  R.seep = {
    intro: 'Seep (Sweep / Sweeep) is the classic North-Indian fishing game for 2 players or 4 players in two teams. Capture cards by value, build "houses", and sweep the floor clean for a big bonus.',
    deck: 'One 52-card deck. Values: Ace = 1, number cards their number, Jack = 11, Queen = 12, King = 13.',
    setup: [
      'The player after the dealer gets 4 cards and must <b>bid</b> a house value from 9 to 13 that they hold (no card of 9+ means a redeal).',
      'Four cards are dealt face-up to the floor. The bidder then builds a house of the bid value, captures with it, or throws that card.',
      'The rest is dealt so everyone holds 12 cards (2 players: the second half is dealt once hands run out).'
    ],
    turn: [
      '<b>Capture</b>: play a card and take every floor card (and house) whose values add up to it in groups - e.g. a 9 takes 4+5 and 2+7.',
      '<b>Build a house</b>: play a card onto floor cards to make 9-13. You must hold another card of that value to capture it later.',
      '<b>Raise</b> an unbroken house to a higher value, or make it <b>pakka</b> (cement it) by adding a card of the same value.',
      '<b>Throw</b>: put a card loose on the floor - not allowed while you own a house on the floor.',
      '<b>Seep</b>: clear the whole floor with a capture for a 50-point bonus (not on the very last move).',
      'When all cards are played, whoever captured last takes what is left on the floor.'
    ],
    cardsTitle: 'Point cards (100 in total)',
    cards: [
      [sc('S', 'K'), 'Spades', 'Every spade is worth its value: A♠ = 1 … K♠ = 13 (91 points in all).'],
      [sc('H', 'A'), 'Other Aces', 'A♥, A♦ and A♣ are worth 1 point each.'],
      [sc('D', '10'), 'Ten of Diamonds', 'Worth 6 points - the famous "dus".']
    ],
    extra: ['How to play here: tap a card and choose what it should do (capture, build, raise, cement or throw).'],
    scoring: 'Each side scores its captured point cards plus 50 per seep. Over several rounds, the highest total wins.'
  };

  R.sevens = {
    intro: 'Satte Pe Satta (Sevens / Fan-Tan): build the four suits outwards from the sevens. The first player to empty their hand wins.',
    deck: 'One 52-card deck. Ace is low (A-2-3 … J-Q-K).',
    setup: ['Deal all cards. Whoever holds the <b>7 of Hearts</b> plays it first.'],
    turn: [
      'On your turn play one card: a <b>7</b> starts a new suit row, or a card <b>next in sequence</b> to a row already on the table (6 or 8 of that suit, then 5 or 9, and so on).',
      'You must play if you can. If no card fits, you pass.',
      'The rows grow down to the Ace and up to the King.'
    ],
    cardsTitle: 'Key cards',
    cards: [
      [sc('H', '7'), '7 of Hearts', 'Opens the game.'],
      [sc('S', '7'), 'Other sevens', 'Each one opens its suit\'s row.'],
      [sc('C', 'K'), 'Aces and Kings', 'The ends of each row - hold them back to block opponents.']
    ],
    extra: ['Tip: hold on to 7s and cards next to them when other players are waiting on that suit.'],
    scoring: 'The winner scores the number of cards left in everyone else\'s hands.'
  };

  R.gadha = {
    intro: 'Gadha Chor (the Indian Old Maid): pull cards from your neighbour, throw away pairs, and don\'t get stuck with the odd card - or you\'re the <b>Gadha</b> (donkey)!',
    deck: 'One 52-card deck with <b>one card secretly removed</b>. Its partner can never be paired - that\'s the Gadha card.',
    setup: ['Deal all remaining cards.', 'Everyone throws away their pairs straight away.'],
    turn: [
      'A <b>pair</b> is two cards of the same rank <b>and the same colour</b> (e.g. 7♥ + 7♦, or K♠ + K♣).',
      'On your turn pull one card, unseen, from the next player\'s hand. If it makes a pair, throw the pair away.',
      'Run out of cards and you are safe. The last player holding a card is the Gadha.'
    ],
    cardsTitle: 'Pairs',
    cards: [
      [sc('H', '7'), '7♥ + 7♦', 'Same rank, both red: a pair.'],
      [sc('S', 'K'), 'K♠ + K♣', 'Same rank, both black: a pair.'],
      ['back', 'The hidden card', 'Revealed at the end of the round.']
    ],
    extra: ['How to play here: on your turn, tap any card in the glowing neighbour\'s hand to pull it.'],
    scoring: 'Everyone except the Gadha scores 1 point per round.'
  };

  R.teenpatti = {
    intro: 'Teen Patti ("three cards") - India\'s favourite betting game, played here with <b>points/chips only, never real money</b>. Play blind or look at your cards, keep betting, and win the pot with the best three-card hand.',
    deck: 'One 52-card deck. Each player gets 3 cards. Everyone starts with the same chip stack.',
    setup: ['Every player puts the <b>boot</b> into the pot.', 'Three cards each are dealt face-down. Everyone starts <b>blind</b> (without looking).'],
    turn: [
      '<b>Blind</b> players bet the current stake (chaal) or double it (raise). Look at your cards any time with <b>See</b>.',
      '<b>Seen</b> players must bet twice the stake (or four times to raise).',
      '<b>Pack</b> to fold and drop out of the round.',
      '<b>Show</b>: when only two players are left, pay a chaal to compare hands - best hand takes the pot.',
      '<b>Side show</b>: a seen player can ask the previous seen player to compare privately; if they accept, the weaker hand packs.',
      'When the pot reaches the pot limit, everyone left must show.'
    ],
    cardsTitle: 'Hand rankings (best first)',
    cards: [
      [sc('S', 'A'), 'Trail (Trio)', 'Three of a kind - A-A-A is the best hand.'],
      [sc('H', 'K'), 'Pure Sequence', 'Three in a row of one suit. A-K-Q is highest, then A-2-3.'],
      [sc('D', 'Q'), 'Sequence (Run)', 'Three in a row, mixed suits.'],
      [sc('C', 'J'), 'Colour', 'Three of the same suit, not in sequence.'],
      [sc('H', '10'), 'Pair', 'Two of the same rank.'],
      [sc('S', '9'), 'High Card', 'None of the above - highest card wins.']
    ],
    extra: ['This is a points-only game for fun. No real money is involved.'],
    scoring: 'Chips won stay with you between rounds. After the last round - or when only one player has chips - the biggest stack wins.'
  };

  R.courtpiece = {
    intro: 'Court Piece (Rang / Coat Piece) is the beloved partnership trick-taking game. Two teams, one trump suit, thirteen tricks.',
    deck: 'One 52-card deck, Aces high. Exactly 4 players: you and the player opposite you are partners.',
    setup: [
      'The player after the dealer gets 5 cards and chooses the <b>trump suit (rang)</b>.',
      'Then everyone is dealt up to 13 cards. The trump caller leads the first trick.'
    ],
    turn: [
      'Follow the suit that was led if you can; otherwise play any card - including a trump to <b>cut</b>.',
      'The highest trump wins the trick, or the highest card of the led suit if no trump was played.',
      'The trick winner leads the next one.',
      'The first team to win <b>7 tricks</b> wins the hand. Winning the first 7 without the other team taking any is a <b>Kot</b>!'
    ],
    cardsTitle: 'Key ideas',
    cards: [
      [sc('S', 'A'), 'Aces', 'The strongest card of each suit - unless it gets cut by a trump.'],
      [sc('H', '2'), 'Trumps', 'Even a 2 of trumps beats an Ace of another suit.'],
      [sc('D', 'J'), 'Partners', 'If your partner is already winning the trick, throw a low card.']
    ],
    extra: [],
    scoring: 'Winning a hand = 1 point, a Kot = 3 points. After the set number of rounds the team with more points wins.'
  };

  var GENERAL = [
    ['Playing a card', 'Click / tap a glowing card, or drag it up and throw it onto the pile.'],
    ['Drawing', 'Click the draw pile (or the Draw button). In UNO Attack! click the launcher.'],
    ['UNO!', 'Press the big UNO button while you hold two cards (before playing) - or right after you play down to one card. Press CATCH! when someone else forgets.'],
    ['Wild cards', 'A colour picker appears after you play a wild.'],
    ['Pass & Play', 'One device for everybody: hand it over when the screen says so - your cards stay hidden in between.'],
    ['Online', 'Create a room, share the 5-letter code (or link) with friends. Empty seats can be filled with CPU players. If someone disconnects a CPU plays for them until they come back.'],
    ['Liar\'s', 'Tap a card with circles (a Liar card) to play it face-down - then tap "Tell the truth" or pick a colour and a card to claim.'],
    ['Big hands', 'With lots of cards your hand squeezes into a stack. Hover over it (or slide a finger along it) and the cards around your pointer fan open so you can read them.'],
    ['Desi Patti', 'Switch between UNO and the Indian card-game hall with the UNO / Desi Patti switch at the top of the home page, and choose the Indian or Pro look.'],
    ['Keyboard', 'D = draw, U = UNO, C = catch, P = pass/keep, 1-4 = choose colour, Esc = menu.']
  ];

  window.UNORules = { variants: R, general: GENERAL };
})();
