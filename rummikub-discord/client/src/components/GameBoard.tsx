import React from 'react';
import { useDrop } from 'react-dnd';
import { Tile } from './Tile';
import { Tile as TileType, TileOnBoard } from '../types/game';

interface GameBoardProps {
  tiles: TileOnBoard[];
  onTileDrop: (tile: TileType, position: { x: number; y: number }, fromBoard?: boolean, tileId?: string) => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({ tiles, onTileDrop }) => {
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: 'tile',
      drop: (item: { tile: TileType; fromBoard?: boolean }, monitor) => {
        console.log('🚨 Drop handler called!');

        const offset = monitor.getClientOffset();
        if (offset) {
          console.log(`📍 Mouse offset: (${offset.x}, ${offset.y})`);

          const boardElement = document.getElementById('game-board');
          if (boardElement) {
            const rect = boardElement.getBoundingClientRect();
            console.log(`📏 Board rect: left=${rect.left.toFixed(1)}, top=${rect.top.toFixed(1)}, width=${rect.width.toFixed(1)}, height=${rect.height.toFixed(1)}`);

            // Calculate which grid cell the mouse is over
            // Grid cells are 60px × 72px, with 24px padding
            const CELL_WIDTH = 60;
            const CELL_HEIGHT = 72;
            const PADDING = 24;

            const rawX = (offset.x - rect.left - PADDING) / CELL_WIDTH;
            const rawY = (offset.y - rect.top - PADDING) / CELL_HEIGHT;

            console.log(`🔢 Raw position: (${rawX.toFixed(2)}, ${rawY.toFixed(2)})`);

            // Snap to the grid cell the mouse is currently over
            // Use Math.floor to get the cell containing the cursor
            const snappedX = Math.max(0, Math.min(19, Math.floor(rawX)));
            const snappedY = Math.max(0, Math.min(14, Math.floor(rawY)));

            console.log(`📐 Snapped to cell: (${snappedX}, ${snappedY})`);

            onTileDrop(item.tile, { x: snappedX, y: snappedY }, item.fromBoard, item.tile.id);
          } else {
            console.log('❌ Board element not found');
          }
        } else {
          console.log('❌ No offset');
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    }),
    [onTileDrop]
  );


  return (
    <div
      className="w-full h-full flex items-center justify-center overflow-hidden"
    >
      <div
        id="game-board"
        ref={drop}
        className={`
          relative
          rounded-xl shadow-inner
          p-6
          ${isOver ? 'ring-4 ring-yellow-400 ring-opacity-50' : ''}
        `}
        style={{
          backgroundColor: '#8B6A31',
          display: 'grid',
          gridTemplateColumns: 'repeat(20, 60px)',
          gridTemplateRows: 'repeat(15, 72px)',
          gap: 0,
          width: '1248px',  // 20 * 60px + 48px padding (24px * 2)
          height: '1128px', // 15 * 72px + 48px padding (24px * 2)
        }}
      >
      {/* Board title */}
      <div className="absolute top-2 left-2 text-white/60 text-sm font-semibold z-30">
        Game Board
      </div>

      {/* DEBUG: Show grid cell borders */}
      {Array.from({ length: 20 * 15 }).map((_, index) => {
        const x = index % 20;
        const y = Math.floor(index / 20);

        return (
          <div
            key={`cell-${x}-${y}`}
            className="relative"
            style={{
              gridColumn: x + 1,
              gridRow: y + 1,
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            {/* Cell coordinate label for debugging */}
            <div className="absolute top-0 left-0 text-white/20 text-xs pointer-events-none">
              {x},{y}
            </div>
          </div>
        );
      })}

      {/* Empty board message */}
      {tiles.length === 0 && (
        <div
          className="flex items-center justify-center text-white/60 text-center z-20"
          style={{
            gridColumn: '1 / -1',
            gridRow: '1 / -1',
            pointerEvents: 'none',
          }}
        >
          <div>
            <p className="text-2xl font-semibold mb-2">Board is empty</p>
            <p className="text-lg">Drag tiles here to form melds</p>
          </div>
        </div>
      )}

      {/* Tiles on board - positioned in grid cells */}
      {tiles.map((tile) => (
        <div
          key={tile.id}
          className="flex items-center justify-center z-10"
          style={{
            gridColumn: tile.position.x + 1,
            gridRow: tile.position.y + 1,
          }}
          title={`Position: (${tile.position.x}, ${tile.position.y})`}
        >
          <Tile
            tile={tile}
            isDraggable={true}
            fromBoard={true}
          />
        </div>
      ))}
      </div>
    </div>
  );
};