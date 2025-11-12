import React from 'react';
import { useDrop } from 'react-dnd';
import { Tile } from './Tile';
import { Tile as TileType, TileOnBoard } from '../types/game';

interface GameBoardProps {
  tiles: TileOnBoard[];
  onTileDrop: (tile: TileType, position: { x: number; y: number }, fromBoard?: boolean, tileId?: string) => void; // ← Fixed signature
}

export const GameBoard: React.FC<GameBoardProps> = ({ tiles, onTileDrop }) => {
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: 'tile',
      drop: (item: { tile: TileType; fromBoard?: boolean }, monitor) => {
        console.log('🎯 Drop detected:', item);

        const offset = monitor.getClientOffset();
        if (offset) {
          console.log('📍 Offset:', offset);

          const boardElement = document.getElementById('game-board');
          if (boardElement) {
            const rect = boardElement.getBoundingClientRect();
            const x = Math.floor((offset.x - rect.left) / 70);
            const y = Math.floor((offset.y - rect.top) / 85);

            console.log('📐 Calculated position:', { x, y });

            onTileDrop(item.tile, { x, y }, item.fromBoard, item.tile.id);
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
      id="game-board"
      ref={drop}
      className={`
        relative w-full h-full
        rounded-xl shadow-inner
        p-6
        overflow-auto
        ${isOver ? 'ring-4 ring-yellow-400 ring-opacity-50' : ''}
      `}
      style={{
        backgroundColor: '#8B6A31'
      }}
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
      <div className="relative z-10 w-full h-full">
        {tiles.length === 0 ? (
          <div className="flex items-center justify-center h-full text-white/60 text-center">
            <div>
              <p className="text-2xl font-semibold mb-2">Board is empty</p>
              <p className="text-lg">Drag tiles here to form melds</p>
            </div>
          </div>
        ) : (
          tiles.map((tile) => (
            <div
              key={tile.id}
              style={{
                position: 'absolute',
                left: `${tile.position.x * 70}px`,
                top: `${tile.position.y * 85}px`,
                zIndex: 10,
              }}
            >
              <Tile
                tile={tile}
                isDraggable={true}
                fromBoard={true}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};