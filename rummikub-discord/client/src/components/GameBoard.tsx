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

  const calculateSnapPosition = React.useCallback((rawX: number, rawY: number, draggedTileId?: string, verbose = false) => {
    const SNAP_DISTANCE = 2.0; // Increased from 1.5 for better snapping

    // Calculate which grid cell the tile center is over
    // Use floor + 0.5 offset to get the grid cell (accounts for tile being dragged by its top-left corner)
    const gridX = Math.floor(rawX + 0.5);
    const gridY = Math.floor(rawY + 0.5);

    if (verbose) {
      console.log(`🧮 calculateSnapPosition - raw: (${rawX.toFixed(2)}, ${rawY.toFixed(2)}) -> grid: (${gridX}, ${gridY})`);
      console.log(`🎲 Existing tiles: ${JSON.stringify(tiles.map(t => ({ id: t.id, x: t.position.x, y: t.position.y })))}`);
    }

    let snappedPosition = { x: gridX, y: gridY };
    let closestDistance = Infinity;

    // Check if there's a nearby tile to snap to (in the same row)
    tiles.forEach(existingTile => {
      if (draggedTileId && existingTile.id === draggedTileId) {
        if (verbose) console.log(`⏭️ Skipping self: ${existingTile.id}`);
        return; // Skip self
      }

      const dx = Math.abs(existingTile.position.x - gridX);
      const dy = Math.abs(existingTile.position.y - gridY);
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (verbose) {
        console.log(`📏 Tile at (${existingTile.position.x}, ${existingTile.position.y}) - dx:${dx} dy:${dy} dist:${distance.toFixed(2)}`);
      }

      // ONLY snap if in EXACT same row (dy === 0) and within horizontal distance
      if (dy === 0 && dx <= SNAP_DISTANCE && dx > 0 && distance < closestDistance) {
        closestDistance = distance;

        if (gridX > existingTile.position.x) {
          // Dragging to the RIGHT of existing tile - snap to right side
          snappedPosition = {
            x: existingTile.position.x + 1,
            y: existingTile.position.y
          };
          if (verbose) console.log(`➡️ Snapping RIGHT to (${snappedPosition.x}, ${snappedPosition.y})`);
        } else {
          // Dragging to the LEFT of existing tile - snap to left side
          snappedPosition = {
            x: existingTile.position.x - 1,
            y: existingTile.position.y
          };
          if (verbose) console.log(`⬅️ Snapping LEFT to (${snappedPosition.x}, ${snappedPosition.y})`);
        }
      }
    });

    if (verbose) console.log(`✅ Final position: (${snappedPosition.x}, ${snappedPosition.y})`);
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
            // Account for padding (p-6 = 24px) - grid content starts inside padding
            const BOARD_PADDING = 24;
            const rawX = (offset.x - rect.left - BOARD_PADDING) / 70;
            const rawY = (offset.y - rect.top - BOARD_PADDING) / 85;

            // Calculate which grid cell we're over
            const snappedPos = calculateSnapPosition(rawX, rawY, item.fromBoard ? item.tile.id : undefined, false);
            setDragPosition(snappedPos);
          }
        }
      },
      drop: (item: { tile: TileType; fromBoard?: boolean }, monitor) => {
        console.log('🚨 Drop handler called!');
        setDragPosition(null); // Clear highlight on drop

        const offset = monitor.getClientOffset();
        if (offset) {
          console.log(`📍 Offset: (${offset.x}, ${offset.y})`);

          const boardElement = document.getElementById('game-board');
          if (boardElement) {
            const rect = boardElement.getBoundingClientRect();
            // Account for padding (p-6 = 24px) - grid content starts inside padding
            const BOARD_PADDING = 24;
            const rawX = (offset.x - rect.left - BOARD_PADDING) / 70;
            const rawY = (offset.y - rect.top - BOARD_PADDING) / 85;

            console.log(`🔢 Raw position: (${rawX.toFixed(2)}, ${rawY.toFixed(2)})`);

            // Use the same snap calculation as the hover preview (with verbose logging)
            const snappedPos = calculateSnapPosition(rawX, rawY, item.fromBoard ? item.tile.id : undefined, true);

            console.log(`📐 Final snap position: (${snappedPos.x}, ${snappedPos.y})`);

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
      className="w-full h-full flex items-center justify-center overflow-hidden"
    >
      <div
        id="game-board"
        ref={drop}
        className={`
          relative
          rounded-xl shadow-inner
          ${isOver ? 'ring-4 ring-yellow-400 ring-opacity-50' : ''}
        `}
        style={{
          backgroundColor: '#8B6A31',
          display: 'grid',
          gridTemplateColumns: 'repeat(20, 70px)',
          gridTemplateRows: 'repeat(15, 85px)',
          gap: 0,
          width: '1400px',  // 20 * 70px
          height: '1275px', // 15 * 85px
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