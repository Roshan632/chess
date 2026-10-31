const board = document.getElementById('board');
const statusText = document.getElementById('status');
const resetBtn = document.getElementById('reset-btn');
const whiteCapturedEl = document.getElementById('captured-by-white');
const blackCapturedEl = document.getElementById('captured-by-black');

const initialBoard = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
];

const pieceSymbols = {
    'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
    'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙',
    '': ''
};

let gameState = JSON.parse(JSON.stringify(initialBoard));
let turn = 'white'; 
let selectedSquare = null;
let currentLegalMoves = [];
let capturedByWhite = [];
let capturedByBlack = [];

function createBoard() {
    board.innerHTML = '';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const square = document.createElement('div');
            square.classList.add('square');
            square.classList.add((r + c) % 2 === 0 ? 'light' : 'dark');
            square.dataset.row = r;
            square.dataset.col = c;
            
            const piece = gameState[r][c];
            square.textContent = pieceSymbols[piece];
            
            if (piece) {
                square.style.color = piece === piece.toUpperCase() ? '#ffffff' : '#000000';
            }

            // Highlight legal moves for the selected piece
            if (selectedSquare) {
                const isLegal = currentLegalMoves.some(m => m.toR === r && m.toC === c);
                if (isLegal) {
                    square.classList.add('highlight');
                }
            }

            square.addEventListener('click', handleSquareClick);
            board.appendChild(square);
        }
    }
    updateCapturedUI();
}

function handleSquareClick(e) {
    if (turn === 'black') return; // Freeze user clicks during AI turn

    const row = parseInt(e.currentTarget.dataset.row);
    const col = parseInt(e.currentTarget.dataset.col);
    const piece = gameState[row][col];

    if (selectedSquare) {
        const prevRow = selectedSquare.row;
        const prevCol = selectedSquare.col;

        // If clicking another of own pieces, switch selection
        if (piece && isOwnPiece(piece)) {
            selectSquare(row, col);
            return;
        }

        // Check if the clicked square is a valid legal move
        const move = currentLegalMoves.find(m => m.toR === row && m.toC === col);
        if (move) {
            executeMove(move.fromR, move.fromC, move.toR, move.toC);
            
            // Switch turn to AI
            turn = 'black';
            statusText.textContent = "AI is thinking...";
            selectedSquare = null;
            currentLegalMoves = [];
            createBoard();

            // Trigger AI movement after a short delay
            setTimeout(makeAIMove, 600);
        } else {
            // Clicked an invalid square, deselect
            selectedSquare = null;
            currentLegalMoves = [];
            document.querySelectorAll('.square').forEach(s => s.classList.remove('selected'));
            createBoard();
        }
    } else {
        if (piece && isOwnPiece(piece)) {
            selectSquare(row, col);
        }
    }
}

function selectSquare(row, col) {
    document.querySelectorAll('.square').forEach(s => s.classList.remove('selected'));
    selectedSquare = { row, col };
    
    const squareEl = board.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    squareEl.classList.add('selected');

    // Calculate legal moves for the selected piece
    currentLegalMoves = getLegalMovesForPiece(row, col);
    createBoard();
}

function executeMove(fromR, fromC, toR, toC) {
    const targetPiece = gameState[toR][toC];
    if (targetPiece) {
        if (targetPiece === targetPiece.toUpperCase()) {
            capturedByBlack.push(pieceSymbols[targetPiece]);
        } else {
            capturedByWhite.push(pieceSymbols[targetPiece]);
        }
    }
    gameState[toR][toC] = gameState[fromR][fromC];
    gameState[fromR][fromC] = '';
}

function updateCapturedUI() {
    whiteCapturedEl.textContent = capturedByWhite.join(' ');
    blackCapturedEl.textContent = capturedByBlack.join(' ');
}

function isOwnPiece(piece) {
    if (turn === 'white' && piece === piece.toUpperCase()) return true;
    if (turn === 'black' && piece === piece.toLowerCase()) return true;
    return false;
}

// Basic Random AI Opponent
function makeAIMove() {
    const allMoves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (gameState[r][c] && gameState[r][c] === gameState[r][c].toLowerCase()) {
                allMoves.push(...getLegalMovesForPiece(r, c));
            }
        }
    }

    if (allMoves.length > 0) {
        // Simple prioritization: try to capture a white piece if possible
        const captures = allMoves.filter(m => gameState[m.toR][m.toC] !== '');
        const chosenMove = captures.length > 0 
            ? captures[Math.floor(Math.random() * captures.length)]
            : allMoves[Math.floor(Math.random() * allMoves.length)];

        executeMove(chosenMove.fromR, chosenMove.fromC, chosenMove.toR, chosenMove.toC);
    }

    turn = 'white';
    statusText.textContent = "White's Turn";
    createBoard();
}

// --- CHESS RULE ENGINE ---
function getLegalMovesForPiece(r, c) {
    const piece = gameState[r][c];
    if (!piece) return [];
    
    const moves = [];
    const type = piece.toLowerCase();
    const isWhite = piece === piece.toUpperCase();

    // Directions vectors
    const rookDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const bishopDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    const knightMoves = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];

    const addSlideMoves = (dirs) => {
        for (let d of dirs) {
            let step = 1;
            while (true) {
                let nR = r + d[0] * step;
                let nC = c + d[1] * step;
                if (nR < 0 || nR > 7 || nC < 0 || nC > 7) break;
                const target = gameState[nR][nC];
                if (!target) {
                    moves.push({fromR: r, fromC: c, toR: nR, toC: nC});
                } else {
                    if ((isWhite && target === target.toLowerCase()) || (!isWhite && target === target.toUpperCase())) {
                        moves.push({fromR: r, fromC: c, toR: nR, toC: nC});
                    }
                    break;
                }
                step++;
            }
        }
    };

    switch(type) {
        case 'p': // Pawn Rules
            const dir = isWhite ? -1 : 1;
            const startRow = isWhite ? 6 : 1;
            
            // Forward 1
            if (r + dir >= 0 && r + dir <= 7 && !gameState[r + dir][c]) {
                moves.push({fromR: r, fromC: c, toR: r + dir, toC: c});
                // Forward 2 from initial line
                if (r === startRow && !gameState[r + dir * 2][c]) {
                    moves.push({fromR: r, fromC: c, toR: r + dir * 2, toC: c});
                }
            }
            // Captures
            for (let side of [-1, 1]) {
                let nR = r + dir;
                let nC = c + side;
                if (nR >= 0 && nR <= 7 && nC >= 0 && nC <= 7) {
                    const target = gameState[nR][nC];
                    if (target && ((isWhite && target === target.toLowerCase()) || (!isWhite && target === target.toUpperCase()))) {
                        moves.push({fromR: r, fromC: c, toR: nR, toC: nC});
                    }
                }
            }
            break;

        case 'r': // Rook
            addSlideMoves(rookDirs);
            break;

        case 'b': // Bishop
            addSlideMoves(bishopDirs);
            break;

        case 'q': // Queen
            addSlideMoves(rookDirs);
            addSlideMoves(bishopDirs);
            break;

            case 'n': // Knight
            for (let m of knightMoves) {
                let nR = r + m[0];
                let nC = c + m[1];
                if (nR >= 0 && nR <= 7 && nC >= 0 && nC <= 7) {
                    const target = gameState[nR][nC];
                    if (!target || (isWhite && target === target.toLowerCase()) || (!isWhite && target === target.toUpperCase())) {
                        moves.push({fromR: r, fromC: c, toR: nR, toC: nC});
                    }
                }
            }
            break;

        case 'k': // King (Basic moves only, no castling)
            const kingDirs = [...rookDirs, ...bishopDirs];
            for (let d of kingDirs) {
                let nR = r + d[0];
                let nC = c + d[1];
                if (nR >= 0 && nR <= 7 && nC >= 0 && nC <= 7) {
                    const target = gameState[nR][nC];
                    if (!target || (isWhite && target === target.toLowerCase()) || (!isWhite && target === target.toUpperCase())) {
                        moves.push({fromR: r, fromC: c, toR: nR, toC: nC});
                    }
                }
            }
            break;
    }
    return moves;
}

resetBtn.addEventListener('click', () => {
    gameState = JSON.parse(JSON.stringify(initialBoard));
    turn = 'white';
    statusText.textContent = "White's Turn";
    selectedSquare = null;
    currentLegalMoves = [];
    capturedByWhite = [];
    capturedByBlack = [];
    createBoard();
});

createBoard();
