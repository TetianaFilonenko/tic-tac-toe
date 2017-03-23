'use strict';

const express = require('express');
const socketIO = require('socket.io');
const path = require('path');
const PORT = process.env.PORT || 3001;
const INDEX = path.join(__dirname, 'index.html');
const server = express()
  .use(express.static(__dirname + '/public'))
  .use((req, res) => res.sendFile(INDEX) )
  .listen(PORT, () => console.log(`Listening on ${ PORT }`));
const io = socketIO(server);
var players = {};
var turn_letters = ['x', 'o'];
var board, current_turn, game_status = 'not_ready';

io.on("connection", (socket) => {
  playerManageModule.enter(socket.id);
  socket.on("disconnect", function() {
    playerManageModule.exit(socket.id);
  }); 

  socket.on("game-update", (person_turn, data) => {
    switch (data.event) {
      case "new-step":
        var result = gameManageModule.updateBoard(person_turn, data.pos);
        turn_letters.map(function(turn){
          io.emit("game-update-" + turn, {
            result: result, 
            event: "step-update",
            current_turn: current_turn,
            board: board
          });
        })
      break;
      case "reset":
        playerManageModule.startGame();
      break;
    }
  });
});  

var playerManageModule = (function() {
  function userEnter(socket_id) {
    if ((Object.keys(players).length + 1) === turn_letters.length) {
      gameConnectEvent(socket_id);
      // we can start game
      gameStartEvent();
    } else if ((Object.keys(players).length + 1) < turn_letters.length) {
      // we can only connect to game and wait for next user
      gameConnectEvent(socket_id);
    } else {
      // too many users cann't participate
      io.emit("game-connect", {
        event: 'game-init',
        status: 'fail' 
      });
    }
  }

  function gameConnectEvent(socket_id){
    var turn_letter = turn_letters[Object.keys(players).length];
    players[socket_id] = turn_letter;
    io.emit("game-connect", {
      event: 'game-connect',
      turn: turn_letter,
      status: 'success' 
    });
  }

  function gameStartEvent(){
    game_status = 'in_progress';
    turn_letters.map(function(turn){
      io.emit("game-update-" + turn, {
        event: "game-start",
        current_turn: gameManageModule.initFirstTurn(),
        turn: turn,
        board: gameManageModule.initBoard()
      }) 
    });
  }

  function userExit(socket_id) {
    delete players[socket_id];
  }
  return {
    enter: userEnter,
    exit: userExit,
    startGame: gameStartEvent
  }
}());

var gameManageModule = (function() {
  function initBoard() {
    board = ['','','','','','','','',''];
    return board;
  }

  function initFirstTurn() {
    current_turn = turn_letters[0];
    return current_turn;
  }

  function updateBoard(turn, pos) {
    if (isPosibleToUpdate(turn, pos)) {
      var result = makeTurn(turn, pos);
      return {status: 'success', message: result} 
    } else {
      return { status:'fail', message: reasonNotToUpdateBoard(turn, pos)}
    }
  }

  function isPosibleToUpdate(turn, pos) {
    if (!reasonNotToUpdateBoard(turn, pos).status) {
      return true;
    } else {
      return false;
    }
  }

  function reasonNotToUpdateBoard(turn, pos) {
    var error;
    if (game_status !== 'in_progress') {
      error = "not_in_progress";
    } else if (board[pos] !== ''){
      error = "already_filled";
    } else if (turn !== current_turn) {
      error = "not_your_turn";
    }
    return {status: error};
  }
  
  function makeTurn(turn, pos) {
    board[pos] = turn;
    changeCurrentTurn();
    return checkResult();
  }
  
  function changeCurrentTurn(){
    var index = turn_letters.findIndex(function(element){
      return element === current_turn;
    });
    if (index === (turn_letters.length - 1)) {
      current_turn = turn_letters[0];
    } else {
      current_turn = turn_letters[index + 1];
    }
  }

  function checkResult() {
    var turn_result = {};
    var winner = checkWinner();
    if (winner) {
      turn_result = {
        winner: winner,
        status: 'winner'
      }
    } else if (isBoardFullyFilled()) {
      turn_result = {
        status: 'tie'
      }
    } else {
      turn_result = {
        status: 'in_progress'
      }
    }
    return turn_result; 
  }

  function checkWinner(){
    var winner;
    turn_letters.map(function(turn){
      if (isWinner(turn)) {
        game_status = 'finished';
        winner = turn;
      }
    });
    return winner; 
  }


  function isBoardFullyFilled(){
    var fully_filled = true;
    board.map(function(el){
      if (el === '') {
        fully_filled = false;
      }
    });
    if (fully_filled) {
      game_status = 'finished';
    }
    return fully_filled;
  }

  function isWinner(turn) {
    return winByRow(turn) || winByColumn(turn) || winByDiagonal(turn);   
  }

  function winByRow(turn) {
    return allCellsAreEqual(turn, 0, 1, 2) ||
           allCellsAreEqual(turn, 3, 4, 5) ||
           allCellsAreEqual(turn, 6, 7, 8);
  }

  function winByColumn(turn) {
    return allCellsAreEqual(turn, 0, 3, 6) ||
           allCellsAreEqual(turn, 1, 4, 7) ||
           allCellsAreEqual(turn, 2, 5, 8);
  }
  function winByDiagonal(turn) {
    return allCellsAreEqual(turn, 0, 4, 8) ||
           allCellsAreEqual(turn, 2, 4, 6);
  }

  function allCellsAreEqual(turn, first, second, third) {
    return (board[first] === turn) && 
           (board[second] === turn) && 
           (board[third] === turn);
  }

  return {
    initBoard: initBoard,
    initFirstTurn: initFirstTurn,
    updateBoard: updateBoard

  }
}());
