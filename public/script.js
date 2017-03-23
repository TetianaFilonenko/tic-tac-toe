$(function() {
  var table = $('table');
  // socket subscription
  var socket = io("http://localhost:3001");
  var person_turn;
  socket.on("game-connect", function(data){
    // TODO: this checking should be fixed
    if (person_turn !== 'x') {
      switch (data.status) {
        case "success":
          gameClientModule.init(data.turn);
          person_turn = data.turn;
        break;
        case "fail":
          $(".js-game-status").text("There is no free place for you :(");
        break;
      }
      socket.on("game-update-" + data.turn, function(game_data){
        gameClientModule.gameUpdate(game_data);
      });
    }
  });

  $('td').click(function() {
    var cell_id = $(this).data("cellId");
    socket.emit("game-update", person_turn, {
      pos: cell_id,
      event: "new-step"
    });
  });

  $('.reset').click(function() {
    $(".js-game-status").text("Welcome to the 'TIC TAC TOE'! Your letter turn is: " + person_turn);
    socket.emit("game-update", person_turn, {
      event: "reset"
    });
  });
});

var gameClientModule = (function() {
  function initGame(turn) {
    $(".js-game-status").text("Welcome to the 'TIC TAC TOE'! Your letter turn is: " + turn);
  }

  function gameUpdate(data) {
    switch (data.event) {
      case "step-update":
        if (data.result.status === 'success') {
          displayNextTurn(data.current_turn);
          displayUpdatedBoard(data.board);
          displayNewMessage(data.result.message);
        } else {
          displayNextTurn(data.current_turn);
          displayUpdatedBoard(data.board);
          displayNewMessage(data.result.message);
        }
      break;
      case "game-connect":
        if (data.status === 'success') {
          $(".js-game-status").text("Welcome to the 'TIC TAC TOE'! Your letter turn is: " + data.turn);
          gameClientModule.init(data.turn);
        } else {
          $(".js-game-status").text("There is no free place for you :(");
        }
      break;
      case "game-start":
        $(".js-game-status").text("Welcome to the 'TIC TAC TOE'! Your letter turn is: " + data.turn);
        displayUpdatedBoard(data.board);
        displayNextTurn(data.current_turn);
      break;
    }
  }

  return {
    init: initGame,
    gameUpdate: gameUpdate
  }
}());


function displayNextTurn(turn) {
  if (turn) {
    $(".turn").html('Current turn: ' + turn);
  }
}

function displayUpdatedBoard(board) {
  if (board) {
    board.forEach(function(element, index) {
      if (element === 'x'){
        $('.item[data-cell-id='+index+']').addClass('cross');
      } else if (element === 'o') {
        $('.item[data-cell-id='+index+']').addClass('circle');
      } else {
        $('.item[data-cell-id='+index+']').removeClass('circle');
        $('.item[data-cell-id='+index+']').removeClass('cross');
      }
    });
  }
}

function displayNewMessage(data) {
  var messageBlock = $(".js-game-status");
  switch (data.status) {
    case "not_in_progress":
      messageBlock.text("Game is not in progress");
    break;
    case "already_filled":
      messageBlock.text("This cell has already been filled");
    break;
    case "not_your_turn":
      messageBlock.text("Wait please when you opponent come up with step");
    break;
    case "winner":
      messageBlock.text(data.winner + " is winner!");
    break;
    case "tie":
      messageBlock.text("Game is finished");
    break;
    case 'in_progress':
      $(".js-game-status").text("Game is in progress");
    break;
  }
}
