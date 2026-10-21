/*
 * Scripts for the animated rule demonstrations (played by demo.js).
 * Play order is clockwise: you -> left (Leo) -> top (Mia) -> right (Kai).
 * "card" links a demo to the matching entry in the rules' special-card list.
 */
(function () {
  'use strict';
  var C4 = { left: 5, top: 5, right: 5 };

  var D = {
    classic: [
      { title: 'How a turn works', steps: [
        ['counts', { you: 4, left: 5, top: 5, right: 5 }], ['pile', 'r7'], ['hand', ['b7', 'g5', 'r2', 'y9']],
        ['turn', 'you'], ['cap', 'The top card is a <b>Red 7</b>. Match its <b>colour</b> or its <b>number</b>.'],
        ['bad', 1], ['cap', 'Green 5 matches neither - not allowed.'],
        ['play', 'you', 0], ['cap', 'Blue 7 matches the number. Now the colour is <b>blue</b>.'],
        ['turn', 'left'], ['play', 'left', 'b3'], ['cap', 'Leo matches the colour with Blue 3.'],
        ['turn', 'top'], ['cap', 'Mia has no blue and no 3 - she draws a card.'], ['draw', 'top', 1],
        ['turn', 'right'], ['play', 'right', 'g3'], ['cap', 'Kai plays Green 3 (number match). Play continues clockwise.']
      ] },
      { title: 'Calling UNO', steps: [
        ['counts', { you: 2, left: 5, top: 4, right: 6 }], ['pile', 'g1'], ['hand', ['g4', 'b9']],
        ['turn', 'you'], ['cap', 'Down to two cards? Press <b>UNO!</b> before you play.'],
        ['bubble', 'you', 'UNO!', 'uno'], ['play', 'you', 0], ['cap', 'Safe - you have one card left.'],
        ['wait', 0.6], ['cap', 'But if you <b>forget</b> and someone catches you before the next player moves...'],
        ['bubble', 'left', 'CATCH!', 'red'], ['plus', 'you', 2], ['draw', 'you', 2, ['r5', 'y2']], ['cap', '...you draw 2 cards as a penalty.']
      ] },
      { card: 1, title: 'Skip', steps: [
        ['counts', C4], ['pile', 'b5'], ['turn', 'left'], ['play', 'left', 'bskip'],
        ['cap', 'Leo plays a <b>Skip</b>...'], ['skip', 'top'], ['cap', '...Mia loses her turn.'], ['turn', 'right'], ['cap', 'Play jumps straight to Kai.']
      ] },
      { card: 2, title: 'Reverse', steps: [
        ['counts', C4], ['pile', 'g6'], ['turn', 'left'], ['play', 'left', 'greverse'], ['reverse'],
        ['cap', 'A <b>Reverse</b> flips the direction of play.'], ['turn', 'you'], ['cap', 'Instead of Mia, it comes back to you - now anticlockwise.'],
        ['wait', 0.4], ['cap', 'With only two players, Reverse works like a Skip.']
      ] },
      { card: 3, title: 'Draw Two', steps: [
        ['counts', C4], ['pile', 'y4'], ['turn', 'left'], ['play', 'left', 'ydraw2'], ['cap', 'Leo plays <b>Draw Two</b>.'],
        ['plus', 'top', 2], ['draw', 'top', 2], ['skip', 'top'], ['cap', 'Mia draws 2 cards <b>and</b> loses her turn.'], ['turn', 'right']
      ] },
      { card: 4, title: 'Wild', steps: [
        ['counts', { you: 3, left: 5, top: 5, right: 5 }], ['pile', 'b5'], ['hand', ['wwild', 'r3', 'r8']], ['turn', 'you'],
        ['cap', 'A <b>Wild</b> can be played on anything.'], ['play', 'you', 0], ['cap', 'Then you choose the new colour...'], ['color', 'r'],
        ['cap', '...red! Leo must now play a red card (or a Wild).'], ['turn', 'left'], ['play', 'left', 'r1']
      ] },
      { card: 5, title: 'Wild Draw Four & challenge', steps: [
        ['counts', C4], ['pile', 'b2'], ['turn', 'left'], ['play', 'left', 'wwild4'], ['color', 'y'],
        ['cap', 'Leo plays <b>Wild Draw Four</b> and picks yellow. Mia should draw 4...'], ['turn', 'top'],
        ['cap', '...but she suspects Leo still had a <b>blue</b> card. She challenges!'], ['bubble', 'top', 'CHALLENGE!', 'dark'],
        ['banner', 'GUILTY!', 'good'], ['cap', 'Leo had blue - so <b>Leo</b> draws the 4 instead.'], ['draw', 'left', 4],
        ['cap', 'If Leo had been honest, Mia would have drawn 6.']
      ] }
    ],

    flip: [
      { card: 1, title: 'The Flip card', steps: [
        ['counts', { you: 3, left: 5, top: 5, right: 5 }], ['pile', 'r5'], ['hand', ['rflip', 'b3', 'y7']], ['turn', 'you'],
        ['cap', 'You play a <b>Flip</b> card on the Light Side...'], ['play', 'you', 0],
        ['flip', { pile: 'tskipall', hand: ['p8', 'odraw5'] }], ['banner', 'FLIP!', 'dark'],
        ['cap', '...and EVERYTHING turns over: hands, draw pile and discard pile. Welcome to the <b>Dark Side</b>.'], ['turn', 'left']
      ] },
      { card: 0, title: 'Draw One (Light)', steps: [
        ['counts', C4], ['pile', 'r4'], ['turn', 'left'], ['play', 'left', 'rdraw1'], ['plus', 'top', 1], ['draw', 'top', 1], ['skip', 'top'],
        ['cap', '<b>Draw One</b>: the next player draws 1 and loses their turn.'], ['turn', 'right']
      ] },
      { card: 2, title: 'Wild Draw Two (Light)', steps: [
        ['counts', C4], ['pile', 'g9'], ['turn', 'left'], ['play', 'left', 'wwild2'], ['color', 'b'], ['plus', 'top', 2], ['draw', 'top', 2], ['skip', 'top'],
        ['cap', 'Pick a colour, the next player draws 2 and is skipped. It can be challenged like Wild Draw Four.'], ['turn', 'right']
      ] },
      { card: 3, title: 'Draw Five (Dark)', steps: [
        ['dark'], ['counts', C4], ['pile', 't6'], ['turn', 'left'], ['play', 'left', 'tdraw5'], ['cap', 'On the Dark Side, <b>Draw Five</b> hits hard...'],
        ['plus', 'top', 5], ['draw', 'top', 5], ['skip', 'top'], ['cap', 'Mia draws 5 and loses her turn.'], ['turn', 'right']
      ] },
      { card: 4, title: 'Skip Everyone (Dark)', steps: [
        ['dark'], ['counts', { you: 3, left: 5, top: 5, right: 5 }], ['pile', 'p2'], ['hand', ['pskipall', 'p9', 'o4']], ['turn', 'you'],
        ['play', 'you', 0], ['skip', 'left'], ['skip', 'top'], ['skip', 'right'], ['cap', '<b>Skip Everyone</b>: every other player is skipped...'],
        ['turn', 'you'], ['cap', '...and you play again!'], ['play', 'you', 0]
      ] },
      { card: 5, title: 'Wild Draw Color (Dark)', steps: [
        ['dark'], ['counts', C4], ['pile', 'o3'], ['turn', 'left'], ['play', 'left', 'wwildcolor'], ['color', 't'],
        ['cap', 'Leo names <b>teal</b>. Mia must draw until she finds a teal card...'], ['roulette', 'top', ['p4', 'o8', 'u2', 't5']],
        ['cap', '...four cards this time, and she loses her turn.'], ['turn', 'right']
      ] }
    ],

    nomercy: [
      { title: 'Stacking draw cards', steps: [
        ['counts', C4], ['pile', 'r6'], ['turn', 'left'], ['play', 'left', 'rdraw4'], ['stack', 4], ['cap', 'Leo hits Mia with +4...'],
        ['turn', 'top'], ['play', 'top', 'wwild6'], ['stack', 10], ['cap', 'Mia <b>stacks</b> a +6 (equal or higher) - now +10 goes to Kai!'],
        ['turn', 'right'], ['cap', 'Kai has no draw card to stack. He takes all <b>10</b>.'], ['plus', 'right', 10], ['draw', 'right', 10], ['skip', 'right']
      ] },
      { title: 'Draw until you can play', steps: [
        ['counts', C4], ['pile', 'y5'], ['turn', 'top'], ['cap', 'No playable card? You must keep drawing until you get one...'],
        ['draw', 'top', 4], ['play', 'top', 'y1'], ['cap', '...then play it. No mercy!'], ['turn', 'right']
      ] },
      { title: '7 swaps, 0 passes', steps: [
        ['counts', { you: 6, left: 2, top: 7, right: 5 }], ['pile', 'b4'], ['hand', ['b7', 'r2', 'g9', 'y5', 'b1', 'g6']], ['turn', 'you'],
        ['cap', 'Play a <b>7</b> and swap hands with anyone - Leo only has 2 cards!'], ['play', 'you', 0], ['swap', 'you', 'left', ['r3', 'gdiscardall']],
        ['cap', 'Swapped. A <b>0</b> makes everyone pass their hand along the direction of play.'], ['turn', 'left'], ['play', 'left', 'b0'], ['rotate', ['y8', 'g2', 'r6', 'b9', 'wroulette', 'g4', 'y1']]
      ] },
      { card: 1, title: 'Discard All', steps: [
        ['counts', { you: 5, left: 5, top: 5, right: 5 }], ['pile', 'g7'], ['hand', ['gdiscardall', 'g3', 'b2', 'g8', 'r5']], ['turn', 'you'],
        ['play', 'you', 0], ['cap', '<b>Discard All</b>: also dump every card of that colour from your hand!'], ['discardAll', [0, 2]], ['turn', 'left']
      ] },
      { card: 2, title: 'Skip Everyone', steps: [
        ['counts', { you: 3, left: 5, top: 5, right: 5 }], ['pile', 'b2'], ['hand', ['bskipall', 'b6', 'y3']], ['turn', 'you'],
        ['play', 'you', 0], ['skip', 'left'], ['skip', 'top'], ['skip', 'right'], ['turn', 'you'], ['cap', 'Everyone else is skipped - your turn again.'], ['play', 'you', 0]
      ] },
      { card: 6, title: 'Wild Color Roulette', steps: [
        ['counts', C4], ['pile', 'r3'], ['turn', 'left'], ['play', 'left', 'wroulette'], ['cap', 'Roulette! Mia must name a colour...'],
        ['bubble', 'top', 'BLUE!', 'dark'], ['cap', '...then flip cards until blue appears - and keep them all.'], ['roulette', 'top', ['r9', 'y2', 'gskip', 'r1', 'b4']], ['turn', 'right']
      ] },
      { card: 5, title: 'Wild Draw Ten', steps: [
        ['counts', C4], ['pile', 'g2'], ['turn', 'left'], ['play', 'left', 'wwild10'], ['color', 'g'], ['plus', 'top', 10], ['draw', 'top', 10], ['skip', 'top'],
        ['cap', '<b>Wild Draw Ten</b>: pick a colour, next player draws 10 (unless they stack a +10).'], ['turn', 'right']
      ] },
      { title: 'The Mercy Rule', steps: [
        ['counts', { you: 4, left: 5, top: 6, right: 23 }], ['pile', 'y8'], ['turn', 'top'], ['play', 'top', 'wwild4'], ['color', 'b'],
        ['cap', 'Kai already holds 23 cards...'], ['draw', 'right', 4], ['out', 'right'], ['cap', 'At <b>25 or more</b> cards you are knocked out of the round.']
      ] }
    ],

    allwild: [
      { title: 'Everything matches', steps: [
        ['counts', C4], ['pile', 'wwild'], ['turn', 'you'], ['hand', ['wwildskip', 'wwild', 'wwild2']],
        ['cap', 'Every card is Wild - you can <b>always</b> play. It\'s all about the actions.'], ['play', 'you', 0], ['skip', 'left'], ['turn', 'top'],
        ['play', 'top', 'wwildrev'], ['reverse'], ['turn', 'left'], ['play', 'left', 'wwild4'], ['plus', 'you', 4], ['draw', 'you', 4, ['wwild', 'wwildswap', 'wwild', 'wwildskip2']]
      ] },
      { card: 3, title: 'Wild Skip Two', steps: [
        ['counts', C4], ['pile', 'wwild'], ['turn', 'left'], ['play', 'left', 'wwildskip2'], ['skip', 'top'], ['skip', 'right'],
        ['cap', 'The next <b>two</b> players are skipped.'], ['turn', 'you']
      ] },
      { card: 6, title: 'Wild Targeted Draw Two', steps: [
        ['counts', { you: 3, left: 5, top: 5, right: 1 }], ['pile', 'wwild'], ['hand', ['wwildtarget2', 'wwild', 'wwildrev']], ['turn', 'you'],
        ['cap', 'Kai is about to win... aim at <b>anyone</b> you like!'], ['play', 'you', 0], ['bubble', 'right', 'Me?!', 'dark'], ['plus', 'right', 2], ['draw', 'right', 2]
      ] },
      { card: 7, title: 'Wild Forced Swap', steps: [
        ['counts', { you: 6, left: 5, top: 2, right: 5 }], ['pile', 'wwild'], ['hand', ['wwildswap', 'wwild', 'wwild2', 'wwild', 'wwildrev', 'wwild4']], ['turn', 'you'],
        ['play', 'you', 0], ['cap', 'Swap hands with any player - Mia only had 2!'], ['swap', 'you', 'top', ['wwild', 'wwildskip']]
      ] }
    ],

    attack: [
      { title: 'The card launcher', launcher: true, steps: [
        ['counts', C4], ['pile', 'g4'], ['turn', 'top'], ['cap', 'Can\'t play? Hit the <b>launcher</b> instead of drawing...'], ['launch', 'top', 0],
        ['cap', 'Click... nothing! Lucky Mia.'], ['turn', 'right'], ['cap', 'Kai hits it too...'], ['launch', 'right', 5], ['cap', 'BOOM - 5 cards fly out at him.']
      ] },
      { card: 0, title: 'Hit 2', launcher: true, steps: [
        ['counts', C4], ['pile', 'r7'], ['turn', 'left'], ['play', 'left', 'rhit2'], ['cap', '<b>Hit 2</b>: the next player hits the launcher twice.'],
        ['launch', 'top', 0], ['launch', 'top', 3], ['skip', 'top'], ['turn', 'right']
      ] },
      { card: 2, title: 'Trade Hands', launcher: true, steps: [
        ['counts', { you: 7, left: 5, top: 3, right: 6 }], ['pile', 'g2'], ['hand', ['gtrade', 'r4', 'b8', 'y1', 'g9', 'r2', 'b5']], ['turn', 'you'],
        ['play', 'you', 0], ['cap', 'Trade your hand with anyone you choose.'], ['swap', 'you', 'top', ['y6', 'g3', 'rskip']]
      ] },
      { card: 4, title: 'Wild All Hit', launcher: true, steps: [
        ['counts', C4], ['pile', 'b6'], ['turn', 'you'], ['hand', ['wwildallhit', 'b2']], ['play', 'you', 0], ['color', 'b'],
        ['cap', 'Everyone else hits the launcher once!'], ['launch', 'left', 0], ['launch', 'top', 2], ['launch', 'right', 0]
      ] }
    ],

    liars: [
      { card: 2, title: 'Liar cards', steps: [
        ['counts', { you: 3, left: 5, top: 5, right: 5 }], ['pile', 'r5'], ['hand', ['g9*', 'b2', 'y4']], ['turn', 'you'],
        ['cap', 'Cards with <b>circles</b> are <b>Liar cards</b>. Normal cards are always played face-up as usual.'],
        ['bad', 1], ['cap', 'Blue 2 doesn\'t match Red 5 - and it isn\'t a Liar card, so it can\'t be bluffed.'],
        ['cap', 'Your Green 9 has circles: play it <b>face-down</b> and announce any legal card...'], ['facedown', 'you', 'Red 7'],
        ['turn', 'left'], ['bubble', 'left', 'I believe you…', 'dark'], ['cap', 'Leo believes it - your "Red 7" counts!']
      ] },
      { title: 'Caught lying', steps: [
        ['counts', C4], ['pile', 'b6'], ['turn', 'left'], ['facedown', 'left', 'Blue 4'], ['turn', 'top'],
        ['bubble', 'top', 'LIAR!', 'red'], ['reveal', 'g9*', false], ['cap', 'It was a Green 9! Leo takes the card back and draws 2.'], ['takeback', 'left'], ['plus', 'left', 2], ['draw', 'left', 2]
      ] },
      { title: 'Telling the truth', steps: [
        ['counts', C4], ['pile', 'r2'], ['turn', 'left'], ['facedown', 'left', 'Red 7'], ['turn', 'top'],
        ['bubble', 'top', 'LIAR!', 'red'], ['reveal', 'r7*', true], ['cap', 'It really was a Red 7 - the accuser (Mia) draws 2 and the card counts.'], ['plus', 'top', 2], ['draw', 'top', 2]
      ] },
      { card: 0, title: '10 passes hands', steps: [
        ['counts', { you: 3, left: 6, top: 2, right: 5 }], ['pile', 'b3'], ['hand', ['b10', 'r4', 'y8']], ['turn', 'you'], ['play', 'you', 0],
        ['cap', 'A <b>10</b>: everybody passes their hand to the next player.'], ['rotate', ['g1', 'y5', 'r9*', 'b2', 'wwild']]
      ] }
    ],

    dare: [
      { card: 0, title: 'Dare or draw', steps: [
        ['counts', C4], ['pile', 'r4'], ['turn', 'left'], ['play', 'left', 'rdare'], ['turn', 'top'], ['bubble', 'top', 'Dare or draw?', 'dark'],
        ['cap', 'Mia accepts the red (Daredevil) dare...'], ['dare', 'Do 10 push-ups!', 'daredevil'], ['bubble', 'top', 'DONE!', 'uno'],
        ['cap', 'Dare completed: no cards drawn, and she takes her turn.'], ['play', 'top', 'r8']
      ] },
      { card: 2, title: 'Chickening out', steps: [
        ['counts', C4], ['pile', 'g1'], ['turn', 'left'], ['play', 'left', 'gdare'], ['turn', 'top'], ['bubble', 'top', 'I\'ll draw…', 'dark'],
        ['cap', 'Refuse the dare and you draw 2 instead (and lose your turn).'], ['plus', 'top', 2], ['draw', 'top', 2], ['skip', 'top'], ['turn', 'right']
      ] },
      { card: 3, title: 'Wild Dare', steps: [
        ['counts', C4], ['pile', 'b5'], ['turn', 'left'], ['play', 'left', 'wwilddare'], ['color', 'y'],
        ['cap', 'Yellow means a <b>Show-Off</b> dare - or draw 4.'], ['dare', 'Talk like a pirate until your next turn!', 'showoff'], ['bubble', 'top', 'Arrr!', 'uno']
      ] }
    ],

    dos: [
      { title: 'Single number match', dos: true, two: true, steps: [
        ['counts', { you: 5, top: 7 }], ['center', ['b7', 'r4']], ['hand', ['y7', 'g3', 'r1', 'b9', 'g6']], ['turn', 'you'],
        ['cap', 'Match a Center Row card with a card of the <b>same number</b> - any colour.'], ['match', 0, [0]],
        ['cap', 'Done matching? End your turn: matched cards are discarded and the row refills to two.'], ['clear', ['g10']]
      ] },
      { title: 'Double number match', dos: true, two: true, steps: [
        ['counts', { you: 5, top: 7 }], ['center', ['g7', 'b9']], ['hand', ['r3', 'y4', 'g5', 'b1', 'r8']], ['turn', 'you'],
        ['cap', 'Or play <b>two cards that add up</b> to a Center Row number: 3 + 4 = 7.'], ['match', 0, [0, 1]],
        ['cap', 'Match several Center Row cards in one turn: 1 + 8 = 9.'], ['match', 1, [1, 2]], ['clear', ['y5', 'r3']]
      ] },
      { title: 'Color Match bonus', dos: true, two: true, steps: [
        ['counts', { you: 4, top: 7 }], ['center', ['r5', 'b8']], ['hand', ['r5', 'g2', 'y9', 'b6']], ['turn', 'you'],
        ['cap', 'Same number <b>and</b> same colour = Color Match!'], ['match', 0, [0], 'COLOR MATCH!'],
        ['cap', 'Bonus: add a card from your hand to the Center Row.'], ['clear', ['y3']], ['place', 0],
        ['cap', 'A <b>Double</b> Color Match also makes everyone else draw 1.']
      ] },
      { card: 1, title: 'Wild # card', dos: true, two: true, steps: [
        ['counts', { you: 3, top: 6 }], ['center', ['b6', 'y10']], ['hand', ['bhash', 'r2', 'g7']], ['turn', 'you'],
        ['cap', 'A <b>Wild #</b> can be any number in its own colour.'], ['match', 0, [0], 'COLOR MATCH!'], ['clear', ['r4']]
      ] },
      { title: 'No match? Draw', dos: true, two: true, steps: [
        ['counts', { you: 3, top: 6 }], ['center', ['g3', 'r1']], ['hand', ['b9', 'y10', 'g8']], ['turn', 'you'],
        ['cap', 'Nothing matches - draw one card.'], ['draw', 'you', 1, ['y6']], ['cap', 'Still nothing, so you must add a card to the Center Row.'], ['place', 0]
      ] },
      { title: 'Shout DOS!', dos: true, two: true, steps: [
        ['counts', { you: 3, top: 6 }], ['center', ['b4', 'g9']], ['hand', ['r4', 'y2', 'b7']], ['turn', 'you'],
        ['match', 0, [0]], ['bubble', 'you', 'DOS!', 'uno'], ['cap', 'Down to two cards? Shout <b>DOS!</b> - or draw 2 if you get caught.']
      ] }
    ]
  };
  /* ================= Desi Patti ================= */
  var P4 = { you: 4, left: 4, top: 4, right: 4 };
  D.bhabhi = [
    { patti: true, title: 'Everyone follows suit', steps: [
      ['counts', P4], ['hand', ['2H', '9S', 'KD', '5C']], ['turn', 'left'], ['cap', 'Leo leads the <b>Ace of Spades</b>. Everyone must follow with a spade.'],
      ['trick', 'left', 'AS'], ['turn', 'top'], ['trick', 'top', '4S'], ['turn', 'right'], ['trick', 'right', 'JS'], ['turn', 'you'], ['trick', 'you', 1],
      ['cap', 'All four followed suit - the trick goes <b>out</b> of the game.'], ['collect', 'out'], ['turn', 'left'], ['cap', 'Leo had the highest spade, so Leo leads again.']
    ] },
    { patti: true, title: 'Thulla! Someone picks up', steps: [
      ['counts', P4], ['hand', ['2H', '9C', 'KD', '5C']], ['turn', 'left'], ['trick', 'left', '8S'], ['turn', 'top'], ['trick', 'top', 'QS'],
      ['turn', 'right'], ['cap', 'Kai has no spades left, so he throws any card - a <b>thulla</b>!'], ['trick', 'right', 'AH'], ['bubble', 'right', 'THULLA!', 'red'],
      ['cap', 'The trick stops. Mia played the highest spade, so <b>Mia picks up all the cards</b>.'], ['collect', 'top'], ['turn', 'top'], ['cap', 'Mia leads the next trick.']
    ] },
    { patti: true, title: 'Safe - and the Bhabhi', steps: [
      ['counts', { you: 1, left: 0, top: 3, right: 0 }], ['hand', ['6D']], ['turn', 'top'], ['trick', 'top', '3D'], ['turn', 'you'], ['trick', 'you', 0],
      ['collect', 'out'], ['bubble', 'you', 'SAFE!', 'uno'], ['cap', 'You played your last card and the trick went out - you are <b>safe</b>.'],
      ['banner', 'BHABHI!', 'bad'], ['cap', 'Mia is the last one holding cards - she is the <b>Bhabhi</b>!']
    ] }
  ];
  D.bluff = [
    { patti: true, title: 'Claim a rank', steps: [
      ['counts', { you: 5, left: 6, top: 6, right: 6 }], ['hand', ['KH', 'KS', '4D', '9C', '2H']], ['turn', 'you'],
      ['cap', 'Start a pile: put cards face-down and claim a rank.'], ['facedown', 'you', 'Two Kings'], ['facedown', 'you', 'Two Kings'],
      ['turn', 'left'], ['cap', 'Leo must add "Kings" too - or pass, or call Bluff.'], ['facedown', 'left', 'One King'], ['turn', 'top'], ['bubble', 'top', 'Pass', 'dark']
    ] },
    { patti: true, title: 'Calling a bluff', steps: [
      ['counts', { you: 5, left: 6, top: 6, right: 6 }], ['turn', 'left'], ['facedown', 'left', 'Three Queens'], ['turn', 'top'], ['bubble', 'top', 'BLUFF!', 'red'],
      ['reveal', '7C', false], ['cap', 'Leo\'s card is a 7 - he lied! <b>Leo picks up the whole pile.</b>'], ['pickupPile', 'left'],
      ['cap', 'If the cards had really been Queens, Mia would have picked up instead.']
    ] }
  ];
  D.seep = [
    { patti: true, dos: true, two: true, title: 'Capture by value', steps: [
      ['counts', { you: 4, top: 4 }], ['center', ['4H', '5C', '9D', '2S']], ['hand', ['9S', 'KH', '7D', '3C']], ['turn', 'you'],
      ['cap', 'Play a 9: it captures every group adding up to 9 - <b>4 + 5</b> and the <b>9</b>.'], ['match', 2, [0]], ['take', [0, 1, 2]],
      ['label', 'Captured 4+5 and 9'], ['clear', []], ['cap', 'Spades and the 10♦ are worth points - the 9♠ alone is 9 points!']
    ] },
    { patti: true, dos: true, two: true, title: 'Build a house', steps: [
      ['counts', { you: 4, top: 4 }], ['center', ['6H', '2C']], ['hand', ['5D', 'JS', 'QC', '8H']], ['turn', 'you'],
      ['cap', 'Put your 5 on the 6: a <b>house of 11</b>. You hold the Jack (11) to take it later.'], ['match', 0, [0], 'House of 11'],
      ['turn', 'top'], ['cap', 'Next turn, capture your house with the Jack - or make it <b>pakka</b> by adding another 11.']
    ] },
    { patti: true, dos: true, two: true, title: 'Seep! (sweep)', steps: [
      ['counts', { you: 3, top: 3 }], ['center', ['3D', '7S']], ['hand', ['10H', 'QD', '4C']], ['turn', 'you'],
      ['cap', 'The floor holds 3 + 7 = 10. Play your 10 and take <b>everything</b>...'], ['match', 0, [0]], ['take', [0, 1]], ['clear', []], ['banner', 'SEEP! +50', 'good'],
      ['cap', 'Clearing the whole floor is a <b>seep</b>: 50 bonus points.']
    ] }
  ];
  D.sevens = [
    { patti: true, title: 'Build out from the sevens', steps: [
      ['counts', { you: 4, left: 5, top: 5, right: 5 }], ['gridSet', ['7H', '7S', '8S', '6H']], ['hand', ['5H', '9S', 'KD', '7D']], ['turn', 'you'],
      ['cap', 'Rows grow from each 7. You may play the <b>5♥</b> (next to 6♥), the <b>9♠</b> (next to 8♠) or the <b>7♦</b> to open diamonds.'],
      ['bad', 2], ['cap', 'K♦ can\'t go yet - diamonds aren\'t open and it isn\'t next in line.'], ['grid', 'you', '7D'],
      ['turn', 'left'], ['grid', 'left', '8D'], ['turn', 'top'], ['bubble', 'top', 'Pass', 'dark'], ['cap', 'No card fits? You must pass.']
    ] }
  ];
  D.gadha = [
    { patti: true, title: 'Pull a card, throw pairs', steps: [
      ['counts', { you: 3, left: 4, top: 3, right: 3 }], ['hand', ['7H', 'KS', '2C']], ['turn', 'you'],
      ['cap', 'Pull a card from your neighbour\'s hand without looking...'], ['steal', 'left', '7D'],
      ['cap', '7♦ matches your 7♥ - same rank, same colour. Throw the <b>pair</b> away!'], ['pairOut', [0, 3]],
      ['cap', 'Empty your hand to be safe. Whoever is left holding the odd card is the <b>Gadha</b>!']
    ] }
  ];
  D.teenpatti = [
    { patti: true, title: 'Blind, see, chaal & pack', steps: [
      ['counts', { you: 3, left: 3, top: 3, right: 3 }], ['cap', 'Everyone pays the boot into the pot and gets 3 cards, face-down.'],
      ['chips', 'you', 10], ['chips', 'left', 10], ['chips', 'top', 10], ['chips', 'right', 10], ['turn', 'left'],
      ['cap', 'Blind players bet the stake without looking...'], ['chips', 'left', 10], ['turn', 'top'], ['bubble', 'top', 'Seen', 'dark'],
      ['cap', '...seen players pay double (chaal).'], ['chips', 'top', 20], ['turn', 'right'], ['bubble', 'right', 'Pack', 'red'], ['cap', 'Pack to fold. Last one standing - or the best hand at the show - wins the pot.']
    ] },
    { patti: true, title: 'Hand rankings', steps: [
      ['hand', ['AS', 'AH', 'AD']], ['label', 'Trail (trio) - best'], ['wait', 1.4],
      ['label', 'Pure sequence &gt; Sequence &gt; Colour &gt; Pair &gt; High card'], ['wait', 1.6], ['cap', 'A-A-A beats everything. A-K-Q of one suit is the best pure sequence.']
    ] }
  ];
  D.courtpiece = [
    { patti: true, title: 'Trump cuts the trick', steps: [
      ['counts', { you: 5, left: 5, top: 5, right: 5 }], ['hand', ['3H', 'QC', '9D', 'AS', '5H']], ['label', 'Trump: ♥ Hearts'], ['turn', 'left'],
      ['cap', 'You and Mia (opposite) are partners. Leo leads clubs.'], ['trick', 'left', 'KC'], ['turn', 'top'], ['trick', 'top', '4C'],
      ['turn', 'right'], ['trick', 'right', 'AC'], ['turn', 'you'], ['cap', 'You have a club, so you must follow suit.'], ['trick', 'you', 1],
      ['cap', 'Kai\'s Ace of clubs wins - no trump was played.'], ['collect', 'right']
    ] },
    { patti: true, title: 'Cutting with a trump', steps: [
      ['counts', { you: 4, left: 4, top: 4, right: 4 }], ['hand', ['3H', '9D', 'AS', '5H']], ['label', 'Trump: ♥ Hearts'], ['turn', 'left'],
      ['trick', 'left', 'KC'], ['turn', 'top'], ['trick', 'top', '4C'], ['turn', 'right'], ['trick', 'right', 'AC'], ['turn', 'you'],
      ['cap', 'No clubs in your hand - <b>cut</b> with your smallest trump!'], ['trick', 'you', 0], ['bubble', 'you', 'Cut!', 'uno'], ['collect', 'you'],
      ['cap', 'First team to 7 tricks wins the hand. All 7 in a row is a <b>Kot</b>!']
    ] }
  ];
  window.UNODemos = D;
})();
