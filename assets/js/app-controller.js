var AppController = function(model) {
    var self = this;
    this.model = model;
    this.viewController = new ViewController(this.model.PlayerName);

    this.consideringMatchWith = "";
    this.leftFirst = false;

    this.model.RegisterCallback("otherPlayers", function(diffs) {
        self.viewController.RemovePlayers(diffs.removed);
        self.viewController.UpdatePlayers(diffs.updated);
        self.viewController.AddPlayers(diffs.added);
        self.viewController.UpdateOtherPlayersText();
    });

    this.model.RegisterCallback("requests", function(diffs) {
        if (self.model.PlayerStatus === "in-game") {
            var union = UnionObjects(diffs.added, diffs.updated);
            union = UnionObjects(union, diffs.unchanged);
            for (var uid in union) {
                self.model.RespondToChallenge(uid, false);
            }
            return;
        }
        var considerSnapshot = self.consideringMatchWith;
        for (var uid in diffs.removed) {
            if (uid === self.consideringMatchWith) {
                self.consideringMatchWith = "";
            }
        }
        for (var uid in UnionObjects(diffs.added, diffs.unchanged)) {
            if (self.consideringMatchWith === "") {
                self.consideringMatchWith = uid;
            } else {
                // Add to queue
            }
        }
        if (considerSnapshot.length === 0 && self.consideringMatchWith.length > 0) {
            // New Challenge
            if (self.model.PlayerStatus === "lobby") {
                var otherPlayerName = self.model.GetPlayerName(self.consideringMatchWith);
                self.viewController.ModalForChallengeFromPlayer(otherPlayerName, self.consideringMatchWith);
                self.model.SetOwnStatus("waiting");
            }
        } else if (considerSnapshot.length > 0 && self.consideringMatchWith.length > 0) {
            if (considerSnapshot !== self.consideringMatchWith) {
                // Different Challenge (not sure this will ever happen, but...)
                if (self.model.PlayerStatus === "waiting") {
                    console.log("one in a million?");
                    var oldPlayerName = self.model.GetPlayerName(considerSnapshot);
                    var otherUID = self.consideringMatchWith;
                    var otherPlayerName = self.model.GetPlayerName(otherUID);
                    self.viewController.CancelChallengeFromPlayer(oldPlayerName);
                    self.model.SetOwnStatus("waiting");
                    setTimeout(function() {
                        self.viewController.ModalForChallengeFromPlayer(otherPlayerName, otherUID)
                    }, 1500);
                }
            } else {
                // Bug here
            }
        } else if (considerSnapshot.length > 0 && self.consideringMatchWith.length === 0) {
            // Cancelled Challenge
            if (self.model.PlayerStatus === "waiting") {
                var otherPlayerName = self.model.GetPlayerName(considerSnapshot);
                self.viewController.CancelChallengeFromPlayer(otherPlayerName);
                setTimeout(function() {
                    if (self.model.PlayerStatus === "waiting") {
                        console.log("cancelled challenge");
                        self.model.SetOwnStatus("lobby");
                    }
                }, 1500);
            }
            // Pull from queue
        }
    });

    this.model.RegisterCallback("responses", function(diffs) {
        var union = UnionObjects(diffs.added, diffs.updated);
        union = UnionObjects(union, diffs.unchanged);
        // ^ Fixes issue where repeatedly declining a request would not update the challenger,
        //   though perhaps that would be a feature, not a bug, to prevent abuse.
        //   For the purposes of a homework assignment, erring on the side of not-locking-up the UI.
        if (self.model.PlayerStatus !== "waiting") { return; }
        var considerSnapshot = self.consideringMatchWith;
        for (var uid in union) {
            if (uid === considerSnapshot) {
                var otherPlayerName = self.model.GetPlayerName(uid);
                var response = union[uid];
                self.viewController.DisplayResponseToChallenge(otherPlayerName, response);
                self.model.RemoveResponses(response);
                if (response) {
                    self.startGame(uid);
                }
                return;
            }
        }
    });

    this.viewController.RegisterClickCallback(".challengePlayer", function(e) {
        if (self.model.PlayerStatus !== "lobby") { return; }
        var t = $(this);
        // Cannot challenge players who are 'waiting' or 'in-game'
        if (t.hasClass("tooltipped")) { return; }
        var otherUID = t.data("uid");
        var otherPlayerName = self.model.GetPlayerName(otherUID);

        self.consideringMatchWith = otherUID;
        self.viewController.ModalForChallengingPlayer(otherPlayerName, otherUID);
        self.model.ChallengePlayer(otherUID);
    });

    this.viewController.RegisterClickCallback(".btn-challenge", function(e) {
        var t = $(this);
        var otherUID = t.data("uid");
        var action = t.attr("id");
        switch (action) {
            case "acceptChallenge":
                // Start game
                self.model.RespondToChallenge(otherUID, true);
                self.startGame(otherUID);
                break;
            case "declineChallenge":
                self.model.RespondToChallenge(otherUID, false);
                break;
            case "cancelChallenge":
                self.model.CancelChallenge(otherUID);
                break;
            default:
                throw new Error("AppController.clickCallback error: unknown button action " + action);
        }
    });

    // In-Game

    this.startGame = function(otherUID) {
        var otherPlayer = self.model.GetPlayerName(otherUID, false);
        var color = otherPlayer.split(".")[0];
        self.viewController.SetGameHeading("Match Against " + ParsePlayerName(otherPlayer));
        self.viewController.SetGameHeaderColor(color);
        self.viewController.TransitionTo("game");
        self.model.StartGame(otherUID);
    };

    this.handleMoves = function() {
        var handled = self.model.HandleMoves();
        if (handled !== undefined) {
            self.viewController.ResetMoves();
            var moves = ["Rock", "Paper", "Scissors"];
            var ownMove = moves[handled.ownMove];
            var oppMove = moves[handled.opponentMove];
            var oppName = self.model.GetPlayerName(self.model.OpponentUID);
            var message = "You chose " + ownMove + ".<br>" + oppName + " chose " + oppMove + ".<br>";
            switch (handled.outcome) {
                case -1:
                    message += "You lost.";
                    break;
                case 0:
                    message += "It was a tie.";
                    break;
                case 1:
                    message += "You won!";
                    break;
            }
            self.viewController.SetCaption(message);
            self.viewController.SetGamePrompt("Select a Symbol");
            self.viewController.UpdateStatistics(self.model.game["wins"], self.model.game["losses"], self.model.game["ties"]);
        }
    };

    this.model.RegisterCallback("notifications", function(diffs) {
        switch (self.model.PlayerStatus) {
            case "in-game":
                for (var p in diffs.added) {
                    self.model.ReceiveOpponentMove(diffs.added[p], p);
                }
                self.handleMoves();
                break;
            default: break;
        }
    });

    this.model.RegisterCallback("opponentDisconnected", function(diffs) {
        var opponentName = diffs.removed.name;
        self.viewController.SetGameHeading("Game Over");
        self.viewController.ShowNotification(opponentName + " has disconnected.");
    });

    this.viewController.RegisterClickCallback("#backToLobby", function(e) {
        self.leftFirst = true;
        self.model.ExitGame();
        self.viewController.TransitionTo("lobby");
    });

    this.viewController.RegisterClickCallback(".btn-move", function(e) {
        if (!self.model.CanMakeMove()) { return; }
        var t = $(this);
        var move = t.data("move");
        var opponentName = self.model.GetPlayerName(self.model.OpponentUID);
        self.viewController.SelectMove(t);
        self.viewController.SetGamePrompt("Waiting for " + opponentName);
        switch (move) {
            case "rock":
                self.model.MakeMove(0);
                break;
            case "paper":
                self.model.MakeMove(1);
                break;
            case "scissors":
                self.model.MakeMove(2);
                break;
            default:
                throw new Error("AppController.click.btn-move error: unknown move " + move);
        }
        self.viewController.SetCaption("");
        self.handleMoves();
    });
}
