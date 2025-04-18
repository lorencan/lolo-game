import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';

// Styled components
const GameContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
`;

const MazeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(10, 30px);
  grid-template-rows: repeat(10, 30px);
  gap: 2px;
  background-color: #2c3e50;
  padding: 10px;
  border-radius: 8px;
`;

const Cell = styled.div<{ isWall: boolean; isExit?: boolean }>`
  width: 30px;
  height: 30px;
  background-color: ${props => 
    props.isWall ? '#34495e' : 
    props.isExit ? '#27ae60' : '#ecf0f1'};
  border-radius: 4px;
  position: relative;
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

const Player = styled.div`
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

const Zombie = styled.div`
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

const GameTitle = styled.h1`
  color: #2c3e50;
  font-size: 2rem;
  margin-bottom: 20px;
`;

const WinMessage = styled.div`
  color: #27ae60;
  font-size: 1.5rem;
  font-weight: bold;
  margin-top: 20px;
`;

const GameOverMessage = styled.div`
  color: #e74c3c;
  font-size: 1.5rem;
  font-weight: bold;
  margin-top: 20px;
`;

const Timer = styled.div`
  color: #e67e22;
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 10px;
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

// Interfaces
interface Position {
  x: number;
  y: number;
}

interface GameState {
  timeLeft: number;
  hasPower: boolean;
  powerTimeLeft: number;
  powerBalls: Position[];
}

// Helper function to check if a path exists from start to end
const hasValidPath = (maze: boolean[][], start: Position, end: Position): boolean => {
  const visited = Array(maze.length).fill(null)
    .map(() => Array(maze[0].length).fill(false));
  
  const queue: Position[] = [start];
  visited[start.y][start.x] = true;

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.x === end.x && current.y === end.y) {
      return true;
    }

    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dx, dy] of directions) {
      const newX = current.x + dx;
      const newY = current.y + dy;

      if (
        newX >= 0 && newX < maze[0].length &&
        newY >= 0 && newY < maze.length &&
        !maze[newY][newX] &&
        !visited[newY][newX]
      ) {
        queue.push({ x: newX, y: newY });
        visited[newY][newX] = true;
      }
    }
  }

  return false;
};

// Generate random maze using a simple algorithm
const generateMaze = () => {
  const size = 10;
  let maze: boolean[][];
  let isValid = false;

  do {
    maze = Array(size).fill(null).map(() => Array(size).fill(true));
    
    // Create paths through the maze
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (Math.random() > 0.35) { // Reducido ligeramente para más caminos
          maze[i][j] = false;
        }
      }
    }
    
    // Ensure start and end positions are clear
    maze[0][0] = false;
    maze[size - 1][size - 1] = false;

    // Verify if there's a valid path
    isValid = hasValidPath(
      maze,
      { x: 0, y: 0 },
      { x: size - 1, y: size - 1 }
    );
  } while (!isValid);
  
  return maze;
};

// Helper function to get valid moves
const getValidMoves = (pos: Position, maze: boolean[][]) => {
  const moves: Position[] = [];
  const directions = [
    { x: 0, y: -1 }, // up
    { x: 0, y: 1 },  // down
    { x: -1, y: 0 }, // left
    { x: 1, y: 0 }   // right
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

const MazeGame = () => {
  const [maze, setMaze] = useState(generateMaze());
  const [playerPos, setPlayerPos] = useState<Position>({ x: 0, y: 0 });
  const [zombies, setZombies] = useState<Position[]>([]);
  const [hasWon, setHasWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    timeLeft: 30,
    hasPower: false,
    powerTimeLeft: 0,
    powerBalls: []
  });

  // Initialize zombies
  useEffect(() => {    const initialZombies: Position[] = [];
    const numInitialZombies = 5;

    for (let i = 0; i < numInitialZombies; i++) {
      let x: number, y: number;
      let attempts = 0;
      const maxAttempts = 50;

      do {
        x = Math.floor(Math.random() * maze[0].length);
        y = Math.floor(Math.random() * maze.length);
        attempts++;

        if (attempts >= maxAttempts) break;
      } while (
        maze[y][x] || // No en paredes
        (x === 0 && y === 0) || // No en inicio
        (x === maze[0].length - 1 && y === maze.length - 1) || // No en salida
        initialZombies.some(z => z.x === x && z.y === y) // No donde hay otro zombie
      );

      if (attempts < maxAttempts) {
        initialZombies.push({ x, y });
      }
    }
    setZombies(initialZombies);
  }, [maze]);

  // Zombie reproduction
  useEffect(() => {
    if (hasWon || gameOver) return;

    const reproductionInterval = setInterval(() => {
      setZombies(prevZombies => {
        if (prevZombies.length >= 12) return prevZombies; // Límite máximo de zombies

        const newZombies = [...prevZombies];
        
        // Intentar reproducir cada zombie existente
        prevZombies.forEach(zombie => {
          if (Math.random() < 0.3) { // 30% de probabilidad de reproducción
            const validMoves = getValidMoves(zombie, maze);
            const availableMoves = validMoves.filter(move => 
              !newZombies.some(z => z.x === move.x && z.y === move.y) &&
              !(move.x === 0 && move.y === 0) &&
              !(move.x === maze[0].length - 1 && move.y === maze.length - 1)
            );

            if (availableMoves.length > 0) {
              const newPosition = availableMoves[Math.floor(Math.random() * availableMoves.length)];
              newZombies.push(newPosition);
            }
          }
        });

        return newZombies;
      });
    }, 1000); // Intentar reproducir cada 1 segundo

    return () => clearInterval(reproductionInterval);
  }, [maze, hasWon, gameOver]);

  // Move zombies with smarter pathfinding
  useEffect(() => {
    if (hasWon || gameOver) return;

    const moveInterval = setInterval(() => {
      setZombies(prevZombies => {
        return prevZombies.map(zombie => {
          const validMoves = getValidMoves(zombie, maze);
          if (validMoves.length === 0) return zombie;
          
          // 30% de probabilidad de moverse hacia el jugador
          if (Math.random() < 0.3) {
            // Encontrar el movimiento que más nos acerca al jugador
            const bestMove = validMoves.reduce((best, move) => {
              const currentDist = Math.abs(move.x - playerPos.x) + Math.abs(move.y - playerPos.y);
              const bestDist = Math.abs(best.x - playerPos.x) + Math.abs(best.y - playerPos.y);
              return currentDist < bestDist ? move : best;
            }, validMoves[0]);
            return bestMove;
          }
          
          // 70% de probabilidad de moverse aleatoriamente
          const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
          return randomMove;
        });
      });
    }, 700); // Movimiento más rápido

    return () => clearInterval(moveInterval);
  }, [maze, hasWon, gameOver, playerPos]);

  // Initialize power balls
  useEffect(() => {
    const newPowerBalls: Position[] = [];
    const numPowerBalls = 3;

    for (let i = 0; i < numPowerBalls; i++) {
      let x: number, y: number;
      do {
        x = Math.floor(Math.random() * maze[0].length);
        y = Math.floor(Math.random() * maze.length);
      } while (
        maze[y][x] || // No colocar en paredes
        (x === 0 && y === 0) || // No colocar en la posición inicial
        (x === maze[0].length - 1 && y === maze.length - 1) || // No colocar en la salida
        newPowerBalls.some(ball => ball.x === x && ball.y === y) // No colocar donde ya hay una bola
      );
      newPowerBalls.push({ x, y });
    }
    setGameState(prev => ({ ...prev, powerBalls: newPowerBalls }));
  }, [maze]);

  // Timer countdown
  useEffect(() => {
    if (hasWon || gameOver) return;

    const timer = setInterval(() => {
      setGameState(prev => {
        // Actualizar tiempo de poder si está activo
        if (prev.hasPower) {
          if (prev.powerTimeLeft <= 1) {
            return {
              ...prev,
              hasPower: false,
              powerTimeLeft: 0,
              timeLeft: prev.timeLeft - 1
            };
          }
          return {
            ...prev,
            powerTimeLeft: prev.powerTimeLeft - 1,
            timeLeft: prev.timeLeft - 1
          };
        }
        
        // Verificar si se acabó el tiempo
        if (prev.timeLeft <= 1) {
          setGameOver(true);
          return prev;
        }
        
        return {
          ...prev,
          timeLeft: prev.timeLeft - 1
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasWon, gameOver]);

  // Collision detection with power balls and zombies
  useEffect(() => {
    // Recoger power ball
    const powerBallIndex = gameState.powerBalls.findIndex(
      ball => ball.x === playerPos.x && ball.y === playerPos.y
    );

    if (powerBallIndex !== -1) {
      setGameState(prev => ({
        ...prev,
        hasPower: true,
        powerTimeLeft: 10,
        powerBalls: prev.powerBalls.filter((_, i) => i !== powerBallIndex)
      }));
    }

    // Colisión con zombies
    const zombieCollision = zombies.some(
      zombie => zombie.x === playerPos.x && zombie.y === playerPos.y
    );

    if (zombieCollision) {
      if (gameState.hasPower) {
        // Eliminar zombie
        setZombies(prev => 
          prev.filter(zombie => 
            !(zombie.x === playerPos.x && zombie.y === playerPos.y)
          )
        );
      } else {
        setGameOver(true);
      }
    }
  }, [playerPos, zombies, gameState.hasPower, gameState.powerBalls]);

  // Game reset function
  const resetGame = useCallback(() => {
    setMaze(generateMaze());
    setPlayerPos({ x: 0, y: 0 });
    setHasWon(false);
    setGameOver(false);
    setGameState({
      timeLeft: 30,
      hasPower: false,
      powerTimeLeft: 0,
      powerBalls: []
    });
  }, []);

  // Handle game over conditions
  useEffect(() => {
    if (gameOver) {
      setTimeout(resetGame, 2000);
    }
  }, [gameOver, resetGame]);

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
      setTimeout(() => {
        setMaze(generateMaze());
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

  return (
    <GameContainer>
      <GameTitle>Lolo's Maze Adventure</GameTitle>
      <Timer>
        Tiempo: {gameState.timeLeft}s
        {gameState.hasPower && ` | ⚡ Power: ${gameState.powerTimeLeft}s`}
        {` | 🧟 Zombies: ${zombies.length}`}
      </Timer>
      <MazeGrid>
        {maze.map((row, y) => 
          row.map((isWall, x) => (
            <Cell 
              key={`${x}-${y}`} 
              isWall={isWall}
              isExit={x === maze[0].length - 1 && y === maze.length - 1}
            >
              {zombies.map((zombie, index) => 
                zombie.x === x && zombie.y === y ? (
                  <Zombie key={`zombie-${index}`}>🧟</Zombie>
                ) : null
              )}
              {playerPos.x === x && playerPos.y === y && (
                <Player>{gameState.hasPower ? '😈' : '😎'}</Player>
              )}
              {gameState.powerBalls.map((ball, index) => 
                ball.x === x && ball.y === y ? (
                  <PowerBall key={`power-${index}`} />
                ) : null
              )}
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
          {gameState.timeLeft <= 0 
            ? '¡Se acabó el tiempo! Intenta ser más rápido...'
            : '¡Oh no! ¡Los zombies te atraparon! Intentalo de nuevo...'}
        </GameOverMessage>
      )}
    </GameContainer>
  );
};

export default MazeGame;
