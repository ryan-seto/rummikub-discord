Bugs:
- end turn undo's everything even if the board is in a valid state need to update that
- if you havent satisfied the 30 point rule you shouldn't be able to manipulate the board, also 30 point just doesn't work
- mid-game, if you haven't played a tile and you manipulate the board, the undo actions don't enable only draw tile is allowed which isn't right


Features:
- Timer works, but it only shows your timer, should update this to show a global timer when the turn switches
- No way to restart game or start new game at the end, should be able to go back to lobby screen
- Maybe be able to move tiles from board to hand? (So you don't have to undo)
- Different tile sorting features
- Add a "new" indicator for drawn tiles (maybe goes away after a turn?)
-  "are you sure" popup for drawing a tile?
- Ready up feature in lobby screen, game can't start unless everyone is ready
- Variable timer in ready up screen: 30s, 1min, 2min
- How to handle points scoring when a meld has 1 regular tile and 2 jokers? How to differentiate between a run or group

UI:
- Update aesthetics of different things
- No indication of invalid board state - Players don't know why they can't end turn until they try (maybe add popup)
- Change users to display name instead of Discord username, maybe?
- smoother tile moving animations
