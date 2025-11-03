import React from 'react';
import { useDrop } from 'react-dnd';
import { Tile } from './Tile';
import { Tile as TileType, TileOnBoard } from '../types/game';

interface GameBoardProps {
  tiles: TileOnBoard[];
  onTileDrop?: (tile: TileType, position: { x: number; y: number }) => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({ tiles, onTileDrop }) => {
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: 'TILE',
      drop: (item: TileType, monitor) => {
        const offset = monitor.getClientOffset();
        if (offset && onTileDrop) {
          // Calculate position relative to board
          const boardElement = document.getElementById('game-board');
          if (boardElement) {
            const rect = boardElement.getBoundingClientRect();
            const x = Math.floor((offset.x - rect.left) / 60); // 60px tile width + gap
            const y = Math.floor((offset.y - rect.top) / 90); // 90px tile height + gap
            onTileDrop(item, { x, y });
          }
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
      id="game-board"
      ref={drop}
      className={`
        relative w-full h-full min-h-[400px]
        bg-gradient-to-br from-rummikub-board to-rummikub-boardLight
        rounded-xl shadow-inner
        p-6
        overflow-auto
        ${isOver ? 'ring-4 ring-yellow-400 ring-opacity-50' : ''}
      `}
    >
      {/* Grid lines for visual guidance */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="w-full h-full grid grid-cols-12 gap-0">
          {Array.from({ length: 144 }).map((_, i) => (
            <div key={i} className="border border-white/20" />
          ))}
        </div>
      </div>

      {/* Board title */}
      <div className="absolute top-2 left-2 text-white/60 text-sm font-semibold">
        Game Board
      </div>

      {/* Tiles on board */}
      <div className="relative z-10">
        {tiles.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-white/40 text-center">
            <div>
              <p className="text-xl mb-2">Board is empty</p>
              <p className="text-sm">Drag tiles here to form melds</p>
            </div>
          </div>
        ) : (
          tiles.map((tile) => (
            <div
              key={tile.id}
              style={{
                position: 'absolute',
                left: `${tile.position.x * 60}px`,
                top: `${tile.position.y * 90}px`,
                zIndex: 10,
              }}
            >
              <Tile tile={tile} draggable={false} />
            </div>
          ))
        )}
      </div>

      {/* Drop zone indicator */}
      {isOver && (
        <div className="absolute inset-0 bg-yellow-400/10 border-4 border-dashed border-yellow-400 rounded-xl pointer-events-none z-20 flex items-center justify-center">
          <div className="text-yellow-400 text-2xl font-bold bg-black/50 px-6 py-3 rounded-lg">
            Drop tile here
          </div>
        </div>
      )}
    </div>
  );
};
