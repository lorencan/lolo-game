import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';

// Styled components
const GameContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
`;

const MazeGrid = styled.div<{ dimension: 'normal' | 'water' }>`
  display: grid;
  grid-template-columns: repeat(10, 30px);
  grid-template-rows: repeat(10, 30px);
  gap: 2px;
  background-color: ${props => props.dimension === 'normal' ? '#2c3e50' : '#1a5f7a'};
  padding: 10px;
  border-radius: 8px;
  transition: background-color 0.5s ease;
`;

const Cell = styled.div<{ isWall: boolean; isExit?: boolean; dimension: 'normal' | 'water' }>`
  width: 30px;
  height: 30px;
  background-color: ${props => {
    if (props.isWall) {
      return props.dimension === 'normal' ? '#34495e' : '#1e4d5f';
    }
    if (props.isExit) {
      return props.dimension === 'normal' ? '#27ae60' : '#20c997';
    }
    return props.dimension === 'normal' ? '#ecf0f1' : '#e3f2fd';
  }};
  border-radius: 4px;
  position: relative;
  transition: background-color 0.5s ease;
  ${props => props.isExit && `
    &::after {
      content: '🚪';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 20px;
    }
  `}
`;

const Character = styled.div`
  width: 24px;
  height: 24px;
  position: absolute;
  transition: all 0.2s ease;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  left: 0;
  top: 0;
`;

const Portal = styled.div`
  width: 24px;
  height: 24px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
  font-size: 20px;
  animation: rotate 2s infinite linear;
  
  @keyframes rotate {
    from { transform: translate(-50%, -50%) rotate(0deg); }
    to { transform: translate(-50%, -50%) rotate(360deg); }
  }
`;

const WaterPit = styled.div`
  width: 24px;
  height: 24px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
  font-size: 20px;
`;

const PowerBall = styled.div`
  width: 16px;
  height: 16px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: #f1c40f;
  border-radius: 50%;
  z-index: 1;
  animation: pulse 1s infinite;
  
  @keyframes pulse {
    0% { transform: translate(-50%, -50%) scale(1); }
    50% { transform: translate(-50%, -50%) scale(1.2); }
    100% { transform: translate(-50%, -50%) scale(1); }
  }
`;

const GameTitle = styled.h1`
  color: #2c3e50;
  font-size: 2rem;
  margin-bottom: 20px;
`;

const Timer = styled.div`
  color: #e67e22;
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 10px;
`;

const GameMessage = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  margin-top: 20px;
`;

const WinMessage = styled(GameMessage)`
  color: #27ae60;
`;

const GameOverMessage = styled(GameMessage)`
  color: #e74c3c;
`;

// Types
interface Position {
  x: number;
  y: number;
}

interface Enemy {
  position: Position;
  type: 'snake' | 'crocodile' | 'zombie';
}

interface GameState {
  timeLeft: number;
  hasPower: boolean;
  powerTimeLeft: number;
  powerBalls: Position[];
  dimension: 'normal' | 'water';
  portals: Position[];
  waterPits: Position[];
  enemies: Enemy[];
}

const getValidMoves = (pos: Position, maze: boolean[][]): Position[] => {
  const moves: Position[] = [];
  const directions = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 }
  ];

  directions.forEach(dir => {
    const newX = pos.x + dir.x;
    const newY = pos.y + dir.y;
    if (
      newX >= 0 && newX < maze[0].length &&
      newY >= 0 && newY < maze.length &&
      !maze[newY][newX]
    ) {
      moves.push({ x: newX, y: newY });
    }
  });

  return moves;
};

const generateMaze = () => {
  const size = 10;
  const maze = Array(size).fill(null).map(() => Array(size).fill(true));
  
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (Math.random() > 0.35) {
        maze[i][j] = false;
      }
    }
  }
  
  maze[0][0] = false;
  maze[size - 1][size - 1] = false;
  
  return maze;
};

const hasValidPath = (maze: boolean[][]): boolean => {
  const size = maze.length;
  const visited = Array(size).fill(null).map(() => Array(size).fill(false));
  
  const dfs = (x: number, y: number): boolean => {
    if (x === size - 1 && y === size - 1) return true;
    if (x < 0 || x >= size || y < 0 || y >= size) return false;
    if (maze[y][x] || visited[y][x]) return false;
    
    visited[y][x] = true;
    
    // Verificar todas las direcciones posibles
    const directions = [
      [0, 1],  // derecha
      [1, 0],  // abajo
      [0, -1], // izquierda
      [-1, 0]  // arriba
    ];
    
    for (const [dx, dy] of directions) {
      if (dfs(x + dx, y + dy)) return true;
    }
    
    return false;
  };
  
  return dfs(0, 0);
};

const generateValidMaze = (): boolean[][] => {
  let maze: boolean[][];
  do {
    maze = generateMaze();
  } while (!hasValidPath(maze));
  return maze;
};

const generateRandomPositions = (
  maze: boolean[][],
  count: number,
  exclude: Position[],
  isPortal: boolean = false
): Position[] => {
  const positions: Position[] = [];
  const size = maze.length;

  for (let i = 0; i < count; i++) {
    let x: number, y: number;
    let attempts = 0;
    const maxAttempts = 50;

    do {
      x = Math.floor(Math.random() * size);
      y = Math.floor(Math.random() * size);
      attempts++;

      if (attempts >= maxAttempts) break;
    } while (
      maze[y][x] ||
      (x === 0 && y === 0) ||
      (x === size - 1 && y === size - 1) ||
      exclude.some(pos => pos.x === x && pos.y === y) ||
      positions.some(pos => pos.x === x && pos.y === y) ||
      (isPortal && (x < 2 || x > size - 3))
    );

    if (attempts < maxAttempts) {
      positions.push({ x, y });
    }
  }
  return positions;
};

const MazeGame: React.FC = () => {
  const [maze, setMaze] = useState<boolean[][]>(generateValidMaze());
  const [playerPos, setPlayerPos] = useState<Position>({ x: 0, y: 0 });
  const [gameState, setGameState] = useState<GameState>({
    timeLeft: 30,
    hasPower: false,
    powerTimeLeft: 0,
    powerBalls: [],
    dimension: 'normal',
    portals: [],
    waterPits: [],
    enemies: []
  });
  const [hasWon, setHasWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  // Initialize game elements
  useEffect(() => {
    const portals = generateRandomPositions(maze, 2, [], true);
    const waterPits = generateRandomPositions(maze, 4, portals);
    const powerBalls = generateRandomPositions(maze, 3, [...portals, ...waterPits]);
    
    const initialEnemies: Enemy[] = [];
    const numEnemies = gameState.dimension === 'normal' ? 5 : 4;
    const existingPositions = [...portals, ...waterPits, ...powerBalls];
    
    for (let i = 0; i < numEnemies; i++) {
      const positions = generateRandomPositions(maze, 1, existingPositions);
      if (positions.length > 0) {
        initialEnemies.push({
          position: positions[0],
          type: gameState.dimension === 'normal' ? 'zombie' : 
                Math.random() < 0.5 ? 'snake' : 'crocodile'
        });
        existingPositions.push(positions[0]);
      }
    }

    setGameState(prev => ({
      ...prev,
      portals,
      waterPits,
      powerBalls,
      enemies: initialEnemies
    }));
  }, [maze, gameState.dimension]);

  // Handle all collisions in a single effect
  useEffect(() => {
    // Power ball collection
    const powerBall = gameState.powerBalls.find(
      (ball: Position) => ball.x === playerPos.x && ball.y === playerPos.y
    );

    if (powerBall) {
      // Collect power ball and activate power
      setGameState(prev => ({
        ...prev,
        hasPower: true,
        powerTimeLeft: 10,
        powerBalls: prev.powerBalls.filter(
          (b: Position) => b.x !== powerBall.x || b.y !== powerBall.y
        )
      }));
    }

    // Enemy collision
    const collidingEnemy = gameState.enemies.find(
      (enemy: Enemy) => enemy.position.x === playerPos.x && enemy.position.y === playerPos.y
    );

    if (collidingEnemy) {
      if (gameState.hasPower) {
        // Si tenemos poder, eliminamos el enemigo
        setGameState(prev => ({
          ...prev,
          enemies: prev.enemies.filter(
            (enemy: Enemy) => 
              enemy.position.x !== playerPos.x || enemy.position.y !== playerPos.y
          )
        }));
      } else {
        // Si no tenemos poder, game over
        setGameOver(true);
      }
    }

    // Portal collision handling
    const portal = gameState.portals.find(
      (p: Position) => p.x === playerPos.x && p.y === playerPos.y
    );    if (portal) {
      const currentTime = gameState.timeLeft;
      setGameState(prev => ({
        ...prev,
        dimension: prev.dimension === 'normal' ? 'water' : 'normal',
        hasPower: false,
        powerTimeLeft: 0,
        timeLeft: currentTime
      }));
      setMaze(generateValidMaze());
      setPlayerPos({ x: 0, y: 0 });
    }

    // Water pit collision
    const waterPit = gameState.waterPits.find(
      (w: Position) => w.x === playerPos.x && w.y === playerPos.y
    );

    if (waterPit) {
      setGameOver(true);
    }
  }, [playerPos, gameState.powerBalls, gameState.enemies, gameState.portals, gameState.waterPits, gameState.hasPower]);

  // Power timer countdown
  useEffect(() => {
    if (!gameState.hasPower) return;

    const powerTimer = setInterval(() => {
      setGameState(prev => {
        if (prev.powerTimeLeft <= 1) {
          return {
            ...prev,
            hasPower: false,
            powerTimeLeft: 0
          };
        }
        return {
          ...prev,
          powerTimeLeft: prev.powerTimeLeft - 1
        };
      });
    }, 1000);

    return () => clearInterval(powerTimer);
  }, [gameState.hasPower]);

  // Enemy movement and reproduction
  useEffect(() => {
    if (hasWon || gameOver) return;

    const moveInterval = setInterval(() => {
      setGameState(prev => {
        const newEnemies = prev.enemies.map(enemy => {
          const validMoves = getValidMoves(enemy.position, maze);
          if (validMoves.length === 0) return enemy;

          if (Math.random() < 0.3) {
            const bestMove = validMoves.reduce((best, move) => {
              const currentDist = Math.abs(move.x - playerPos.x) + Math.abs(move.y - playerPos.y);
              const bestDist = Math.abs(best.x - playerPos.x) + Math.abs(best.y - playerPos.y);
              return currentDist < bestDist ? move : best;
            }, validMoves[0]);
            return { ...enemy, position: bestMove };
          }

          const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
          return { ...enemy, position: randomMove };
        });

        if (newEnemies.length < 12 && Math.random() < 0.3) {
          const parentEnemy = newEnemies[Math.floor(Math.random() * newEnemies.length)];
          const validMoves = getValidMoves(parentEnemy.position, maze);
          const availableMoves = validMoves.filter(move => 
            !newEnemies.some(e => e.position.x === move.x && e.position.y === move.y) &&
            !prev.waterPits.some(pit => pit.x === move.x && pit.y === move.y) &&
            !prev.portals.some(portal => portal.x === move.x && portal.y === move.y)
          );

          if (availableMoves.length > 0) {
            const newPosition = availableMoves[Math.floor(Math.random() * availableMoves.length)];
            newEnemies.push({
              position: newPosition,
              type: parentEnemy.type
            });
          }
        }

        return { ...prev, enemies: newEnemies };
      });
    }, 700);

    return () => clearInterval(moveInterval);
  }, [maze, hasWon, gameOver, playerPos]);

  // Handle keyboard movement
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (hasWon || gameOver) return;

    const newPos = { ...playerPos };

    switch (event.key) {
      case 'ArrowUp':
        if (newPos.y > 0 && !maze[newPos.y - 1][newPos.x]) {
          newPos.y -= 1;
        }
        break;
      case 'ArrowDown':
        if (newPos.y < maze.length - 1 && !maze[newPos.y + 1][newPos.x]) {
          newPos.y += 1;
        }
        break;
      case 'ArrowLeft':
        if (newPos.x > 0 && !maze[newPos.y][newPos.x - 1]) {
          newPos.x -= 1;
        }
        break;
      case 'ArrowRight':
        if (newPos.x < maze[0].length - 1 && !maze[newPos.y][newPos.x + 1]) {
          newPos.x += 1;
        }
        break;
      default:
        return;
    }

    setPlayerPos(newPos);

    // Check if player has reached the goal
    if (newPos.x === maze[0].length - 1 && newPos.y === maze.length - 1) {
      setHasWon(true);
      setTimeout(() => {      setMaze(generateValidMaze());
      setPlayerPos({ x: 0, y: 0 });
      setHasWon(false);
      }, 2000);
    }
  }, [maze, playerPos, hasWon, gameOver]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  // Handle portal effects
  const handlePortalTransition = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      dimension: prev.dimension === 'normal' ? 'water' : 'normal',
      hasPower: false,
      powerTimeLeft: 0
    }));
    setMaze(generateMaze());
    setPlayerPos({ x: 0, y: 0 });
  }, []);

  // Main game timer
  useEffect(() => {
    if (gameOver || hasWon) return;
    
    const timer = setInterval(() => {
      setGameState(prev => {
        const newTimeLeft = prev.timeLeft - 1;
        if (newTimeLeft <= 0) {
          setGameOver(true);
          return prev;
        }
        return {
          ...prev,
          timeLeft: newTimeLeft
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameOver, hasWon]);

  return (
    <GameContainer>
      <GameTitle>
        Lolo&apos;s {gameState.dimension === 'normal' ? 'Zombie' : 'Water'} Maze
      </GameTitle>
      <Timer>
        Tiempo: {gameState.timeLeft}s
        {gameState.hasPower && ` | ⚡ Power: ${gameState.powerTimeLeft}s`}
        {` | ${gameState.dimension === 'normal' ? '🧟' : '🐊'} Enemies: ${gameState.enemies.length}`}
      </Timer>      <MazeGrid dimension={gameState.dimension}>
        {maze.map((row, y) => 
          row.map((isWall, x) => (
            <Cell 
              key={`${x}-${y}`} 
              isWall={isWall}
              isExit={x === maze[0].length - 1 && y === maze.length - 1}
              dimension={gameState.dimension}
            >
              {gameState.portals.some(p => p.x === x && p.y === y) && (
                <Portal>🌀</Portal>
              )}
              {gameState.waterPits.some(w => w.x === x && w.y === y) && (
                <WaterPit>💧</WaterPit>
              )}
              {gameState.enemies.map((enemy, index) => (
                enemy.position.x === x && enemy.position.y === y && (
                  <Character key={`enemy-${index}`}>
                    {enemy.type === 'zombie' ? '🧟' : 
                     enemy.type === 'snake' ? '🐍' : '🐊'}
                  </Character>
                )
              ))}
              {playerPos.x === x && playerPos.y === y && (
                <Character>
                  {gameState.hasPower ? '😈' : '😎'}
                </Character>
              )}
              {gameState.powerBalls.map((ball, index) => (
                ball.x === x && ball.y === y && (
                  <PowerBall key={`power-${index}`} />
                )
              ))}
            </Cell>
          ))
        )}
      </MazeGrid>
      {hasWon && (
        <WinMessage>
          ¡Felicitaciones! ¡Has encontrado la salida!
        </WinMessage>
      )}
      {gameOver && (
        <GameOverMessage>
          {gameState.waterPits.some(w => w.x === playerPos.x && w.y === playerPos.y)
            ? '¡Oh no! ¡Caíste en el agua!'
            : `¡Oh no! ¡Los ${gameState.dimension === 'normal' ? 'zombies' : 'animales'} te atraparon!`}
        </GameOverMessage>
      )}
    </GameContainer>
  );
};

export default MazeGame;
