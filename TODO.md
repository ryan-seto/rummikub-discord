Bugs: 
- Implement and test end game phase / win condition
- Test if tiles can overlap visually 
- end turn undo's everything even if the board is in a valid state need to update that
- if you havent satisfied the 30 point rule you shouldn't be able to manipulate the board
- mid-game, if you haven't played a tile and you manipulate the board, the undo actions don't enable only draw tile is allowed which isn't right

Features:
- Test and implement timer, if timer reaches zero, auto undo turn and draw tile
- No way to restart game or start new game
- Maybe be able to move tiles from board to hand? (So you don't have to undo)
- Add sort by color or number for player's hand
-  "are you sure" popup for drawing a tile?
- How to handle points scoring when a meld has 1 regular tile and 2 jokers? How to differentiate between a run or group

UI:
- Update aesthetics of different things
- White timer, change to red or some other indication at 30s mark
- No indication of invalid board state - Players don't know why they can't end turn until they try (maybe add popup)
- Change users to display name instead of Discord username, maybe?
- smoother tile moving animations
