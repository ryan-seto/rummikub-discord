Bugs:
- end turn undo's everything even if the board is in a valid state need to update that
- if you havent satisfied the 30 point rule you shouldn't be able to manipulate the board, also 30 point just doesn't work
- mid-game, if you haven't played a tile and you manipulate the board, the undo actions don't enable only draw tile is allowed which isn't right
- Now, the issue is that when I try to play a meld of three 9's, I can't move any tiles and I'm not allowed to undo. This shouldn't be the case. Because I made a mistake and wanted to use the 9 for something else and play 2 different melds to meet the 30 point requirement. Also, not sure if it was clear but you should be able to get the 30 points by playing more than 1 meld. One solution is to enfore the 30 point minimum by ending turn

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
