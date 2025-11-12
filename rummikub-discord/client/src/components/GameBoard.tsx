import React, { useState } from 'react';
import { useDrop } from 'react-dnd';
import { Tile } from './Tile';
import { Tile as TileType, TileOnBoard } from '../types/game';

interface GameBoardProps {
  tiles: TileOnBoard[];
  onTileDrop: (tile: TileType, position: { x: number; y: number }, fromBoard?: boolean, tileId?: string) => void; // ← Fixed signature
}

export const GameBoard: React.FC<GameBoardProps> = ({ tiles, onTileDrop }) => {
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);

  const calculateSnapPosition = React.useCallback((rawX: number, rawY: number, draggedTileId?: string) => {
    const SNAP_DISTANCE = 1.5;

    // Calculate which grid cell the tile center is over
    // Use floor + 0.5 offset to get the grid cell (accounts for tile being dragged by its top-left corner)
    const gridX = Math.floor(rawX + 0.5);
    const gridY = Math.floor(rawY + 0.5);

    console.log('🧮 calculateSnapPosition - raw:', { rawX, rawY }, 'grid:', { gridX, gridY });
    console.log('🎲 Existing tiles on board:', tiles.map(t => ({ id: t.id, pos: t.position })));

    let snappedPosition = { x: gridX, y: gridY };
    let closestDistance = Infinity;

    // Check if there's a nearby tile to snap to (in the same row)
    tiles.forEach(existingTile => {
      if (draggedTileId && existingTile.id === draggedTileId) {
        console.log('⏭️ Skipping self:', existingTile.id);
        return; // Skip self
      }

      const dx = Math.abs(existingTile.position.x - gridX);
      const dy = Math.abs(existingTile.position.y - gridY);
      const distance = Math.sqrt(dx * dx + dy * dy);

      console.log('📏 Checking tile at', existingTile.position, '- dx:', dx, 'dy:', dy, 'distance:', distance);

      // ONLY snap if in EXACT same row (dy === 0) and within horizontal distance
      if (dy === 0 && dx <= SNAP_DISTANCE && dx > 0 && distance < closestDistance) {
        closestDistance = distance;

        if (gridX > existingTile.position.x) {
          // Dragging to the RIGHT of existing tile - snap to right side
          snappedPosition = {
            x: existingTile.position.x + 1,
            y: existingTile.position.y
          };
          console.log('➡️ Snapping RIGHT to:', snappedPosition);
        } else {
          // Dragging to the LEFT of existing tile - snap to left side
          snappedPosition = {
            x: existingTile.position.x - 1,
            y: existingTile.position.y
          };
          console.log('⬅️ Snapping LEFT to:', snappedPosition);
        }
      }
    });

    console.log('✅ Final snapped position:', snappedPosition);
    return snappedPosition;
  }, [tiles]);

  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: 'tile',
      hover: (item: { tile: TileType; fromBoard?: boolean }, monitor) => {
        const offset = monitor.getClientOffset();
        if (offset) {
          const boardElement = document.getElementById('game-board');
          if (boardElement) {
            const rect = boardElement.getBoundingClientRect();
            const rawX = (offset.x - rect.left) / 70;
            const rawY = (offset.y - rect.top) / 85;

            // Calculate where it will actually snap to
            const snappedPos = calculateSnapPosition(rawX, rawY, item.fromBoard ? item.tile.id : undefined);
            setDragPosition(snappedPos);
          }
        }
      },
      drop: (item: { tile: TileType; fromBoard?: boolean }, monitor) => {
        console.log('🚨 Drop handler called!');
        setDragPosition(null); // Clear highlight on drop
        console.log('🎯 Drop detected:', item);

        const offset = monitor.getClientOffset();
        if (offset) {
          console.log('📍 Offset:', offset);

          const boardElement = document.getElementById('game-board');
          if (boardElement) {
            const rect = boardElement.getBoundingClientRect();
            const rawX = (offset.x - rect.left) / 70;
            const rawY = (offset.y - rect.top) / 85;

            console.log('🔢 Raw position:', { rawX, rawY });

            // Use the same snap calculation as the hover preview
            const snappedPos = calculateSnapPosition(rawX, rawY, item.fromBoard ? item.tile.id : undefined);

            console.log('📐 Calculated snap position:', snappedPos);

            onTileDrop(item.tile, snappedPos, item.fromBoard, item.tile.id);
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
    [onTileDrop, calculateSnapPosition]
  );

  // Clear drag position when not hovering
  React.useEffect(() => {
    if (!isOver) {
      setDragPosition(null);
    }
  }, [isOver]);

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
      {/* Drop zone highlight */}
      {dragPosition && (
        <div
          className="absolute pointer-events-none z-20 rounded-lg animate-pulse"
          style={{
            left: `${dragPosition.x * 70}px`,
            top: `${dragPosition.y * 85}px`,
            width: '64px',
            height: '80px',
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            border: '2px solid rgba(255, 255, 255, 0.8)',
            boxShadow: '0 0 20px rgba(255, 255, 255, 0.6)',
          }}
        />
      )}

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