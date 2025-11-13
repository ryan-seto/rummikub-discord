import React from 'react';
import { useDrop } from 'react-dnd';
import { Tile } from './Tile';
import { Tile as TileType, TileOnBoard } from '../types/game';

interface GameBoardProps {
  tiles: TileOnBoard[];
  onTileDrop: (tile: TileType, position: { x: number; y: number }, fromBoard?: boolean, tileId?: string) => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({ tiles, onTileDrop }) => {
  const [dragPosition, setDragPosition] = React.useState<{ x: number; y: number } | null>(null);

  // Grid calculation constants - shared between hover and drop handlers
  // Note: These may differ from actual grid dimensions to adjust for alignment
  const CELL_WIDTH = 48;
  const CELL_HEIGHT = 57;
  const PADDING = 24;

  // Hover offset tweaking - adjust these to perfect the alignment
  const HOVER_OFFSET_X = -50;  // Positive = shift right, Negative = shift left
  const HOVER_OFFSET_Y = -20;  // Positive = shift down, Negative = shift up

  const calculateGridPosition = React.useCallback((offset: { x: number; y: number }, rect: DOMRect) => {
    const rawX = (offset.x - rect.left - PADDING + HOVER_OFFSET_X) / CELL_WIDTH;
    const rawY = (offset.y - rect.top - PADDING + HOVER_OFFSET_Y) / CELL_HEIGHT;

    const snappedX = Math.max(0, Math.min(19, Math.floor(rawX)));
    const snappedY = Math.max(0, Math.min(14, Math.floor(rawY)));

    return { x: snappedX, y: snappedY };
  }, [HOVER_OFFSET_X, HOVER_OFFSET_Y]);

  const [{ isOver }, drop] = useDrop<
    { tile: TileType; fromBoard?: boolean },
    unknown,
    { isOver: boolean }
  >(
    () => ({
      accept: 'tile',
      hover: (item, monitor) => {
        const offset = monitor.getClientOffset();
        if (offset) {
          const boardElement = document.getElementById('game-board');
          if (boardElement) {
            const rect = boardElement.getBoundingClientRect();
            const position = calculateGridPosition(offset, rect);
            setDragPosition(position);
          }
        }
      },
      drop: (item, monitor) => {
        setDragPosition(null);
        console.log('🚨 Drop handler called!');

        const offset = monitor.getClientOffset();
        if (offset) {
          console.log(`📍 Mouse offset: (${offset.x}, ${offset.y})`);

          const boardElement = document.getElementById('game-board');
          if (boardElement) {
            const rect = boardElement.getBoundingClientRect();
            console.log(`📏 Board rect: left=${rect.left.toFixed(1)}, top=${rect.top.toFixed(1)}, width=${rect.width.toFixed(1)}, height=${rect.height.toFixed(1)}`);

            const position = calculateGridPosition(offset, rect);
            console.log(`📐 Snapped to cell: (${position.x}, ${position.y})`);

            onTileDrop(item.tile, position, item.fromBoard, item.tile.id);
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
    [onTileDrop, calculateGridPosition]
  );

  // Clear drag position when not hovering
  React.useEffect(() => {
    if (!isOver) {
      setDragPosition(null);
    }
  }, [isOver]);

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
          gridTemplateColumns: 'repeat(20, 45px)',
          gridTemplateRows: 'repeat(15, 54px)',
          gap: 0,
          width: '948px',  // 20 * 45px + 48px padding (24px * 2)
          height: '858px', // 15 * 54px + 48px padding (24px * 2)
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
        const isDropTarget = dragPosition?.x === x && dragPosition?.y === y;

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
            {/* Drop zone highlight */}
            {isDropTarget && (
              <div
                className="absolute inset-0 pointer-events-none z-20 rounded-lg animate-pulse"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  border: '2px solid rgba(255, 255, 255, 0.8)',
                  boxShadow: '0 0 20px rgba(255, 255, 255, 0.6)',
                }}
              >
                <div className="text-white text-xs font-bold p-1">
                  ({x}, {y})
                </div>
              </div>
            )}
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