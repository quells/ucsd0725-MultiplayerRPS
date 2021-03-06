var ViewController = function(playerName) {
    // Initialize views
    var welcomeText = "Welcome " + ParsePlayerName(playerName) + "!";
    var textColor = playerName.split(".")[0] + "-text";
    $("#welcomeHeader").text(welcomeText).addClass(textColor);
    // See firstRunFlag in this.RemovePlayers, which runs first on app launch

    // Local Data
    this.otherPlayersCount = 0;
    this.colorCode = {
        "lobby": "green-text",
        "waiting": "orange-text",
        "in-game": "red-text"
    }
    this.shapeCode = {
        "lobby": "play_circle_filled",
        "waiting": "play_circle_filled",
        "in-game": "do_not_disturb_on"
    }
    var self = this;

    // Callbacks
    this.RegisterClickCallback = function(target, callback) {
        if (target === undefined) { return; }
        if (callback === undefined) { return; }
        $(document).on("click", target, callback);
    };

    // OtherPlayers List
    this.AddPlayers = function(players) {
        for (var uid in players) {
            self.otherPlayersCount++;
            var color = self.colorCode[players[uid].status];
            var shape = self.shapeCode[players[uid].status];
            var otherPlayer = $("<a href='#' class='challengePlayer'>");
            otherPlayer.html(ParsePlayerName(players[uid].name));
            otherPlayer.addClass(color);
            if (players[uid].status !== "lobby") {
                otherPlayer.addClass("tooltipped");
                var tooltipText = (players[uid].status === "waiting") ? "Waiting for Match" : "Currently in Match";
                otherPlayer.tooltip({
                    "position": "right",
                    "delay": "50",
                    "tooltip": tooltipText
                });
            }
            var icon = $("<i class='material-icons'>").addClass(color).text(shape);
            var rightIcon = $("<span class='secondary-content'>").append(icon);
            otherPlayer.append(rightIcon);
            otherPlayer.data("uid", uid);
            var listItem = $("<li class='collection-item'>").append(otherPlayer);
            listItem.attr("id", uid);
            $("#otherPlayers > ul").append(listItem);
        }
    };
    this.removeColorTextClasses = function (i, n) {
        var cs = [];
        n.split(" ").forEach(function(c) { if (c.slice(c.length-4) === "text") { cs.push(c); } });
        return cs.join(" ");
    };
    this.removeColorClasses = function(i, n) {
        var cs = [];
        n.split(" ").forEach(function(c) { if ($.inArray(c, RN_Colors) > 0) { cs.push(c); } });
        return cs.join(" ");
    }
    this.UpdatePlayers = function(players) {
        for (var uid in players) {
            var link = $("#" + uid + " > a");
            link.removeClass(self.removeColorTextClasses);
            link.addClass(self.colorCode[players[uid].status]);
            link.removeClass("tooltipped");
            link.tooltip("remove");
            var icon = $("#" + uid + " > a > span > i");
            icon.removeClass(self.removeColorTextClasses);
            icon.addClass(self.colorCode[players[uid].status]);
            icon.text(self.shapeCode[players[uid].status]);
            if (players[uid].status !== "lobby") {
                link.addClass("tooltipped");
                var tooltipText = (players[uid].status === "waiting") ? "Waiting for Match" : "Currently in Match";
                link.tooltip({
                    "position": "right",
                    "delay": "50",
                    "tooltip": tooltipText
                });
            }
        }
    };
    this.firstRunFlag = true;
    this.RemovePlayers = function(players) {
        if (self.firstRunFlag) {
            $("#otherPlayers > div").addClass("hide");
            $("#otherPlayers").append($("<p class='caption'>"));
            $("#otherPlayers").append($("<ul class='collection'>"));
            self.firstRunFlag = false;
        }
        for (var uid in players) {
            self.otherPlayersCount--;
            $("#" + uid).remove();
        }
    };
    this.UpdateOtherPlayersText = function() {
        if (self.otherPlayersCount < 1) {
            $("#otherPlayers > p.caption").html("It looks like no one else is online.<br>Share this page with a friend to play with them!");
            $("#otherPlayers > ul").addClass("hide");
        } else {
            $("#otherPlayers > p.caption").html("Choose another player to play against.");
            $("#otherPlayers > ul").removeClass("hide");
        }
    };

    // ChallengeModal
    this.ModalForChallengingPlayer = function(otherPlayerName, otherUID) {
        var challengeText = "You have challenged <span>" + otherPlayerName + "</span> to a match!";
        $("#challenge > .modal-content > h4").html(challengeText);
        $(".btn-challenge").addClass("hide").data("uid", otherUID);
        $("#cancelChallenge").removeClass("hide");
        $("#challenge").modal("open");
    };
    this.ModalForChallengeFromPlayer = function(otherPlayerName, otherUID) {
        var challengeText = "<span>" + otherPlayerName + "</span> has challenged you to a match!";
        $("#challenge > .modal-content > h4").html(challengeText);
        $(".btn-challenge").removeClass("hide").data("uid", otherUID);
        $("#cancelChallenge").addClass("hide");
        $("#challenge").modal("open");
    };
    this.CancelChallengeFromPlayer = function(otherPlayerName) {
        var challengeText = "<span>" + otherPlayerName + "</span> has cancelled their challenge.";
        $("#challenge > .modal-content > h4").html(challengeText);
        $(".btn-challenge").addClass("hide");
        setTimeout(function() {
            $("#challenge").modal("close");
        }, 1000);
    };
    this.DisplayResponseToChallenge = function(otherPlayerName, response) {
        var responseText = response ? "accepted" : "declined";
        var challengeText = "<span>" + otherPlayerName + "</span> has " + responseText + " your challenge.";
        $("#challenge > .modal-content > h4").html(challengeText);
        $(".btn-challenge").addClass("hide");
        setTimeout(function() {
            $("#challenge").modal("close");
        }, 1000);
    };

    // General
    this.TransitionTo = function(screen) {
        switch (screen) {
            case "game":
                $("#lobby").addClass("hide");
                $("#game").removeClass("hide");
                break;
            case "lobby":
                $("#game").addClass("hide");
                $("#lobby").removeClass("hide");
                break;
            default:
                throw new Error("ViewController.TransitionTo error: unknown screen " + screen);
        }
    };
    this.ShowNotification = function(message) {
        $("#notification > .modal-content > h4").html(message);
        $("#notification").modal("open");
        setTimeout(function() {
            $("#notification").modal("close");
        }, 1500);
    };

    // Game Screen
    this.SetGameHeading = function(message) {
        $("#gameHeading").html(message);
    };
    this.SetGameHeaderColor = function(color) {
        var header = $("#gameHeader");
        header.removeClass(self.removeColorClasses);
        header.addClass(color);
        var backButton = $("#gameHeader > div > a");
        backButton.removeClass(self.removeColorClasses);
        backButton.addClass(color);
    };
    this.SetGamePrompt = function(message) {
        $("#gamePrompt").html(message);
    };
    this.SelectMove = function(target) {
        target.removeClass("blue").addClass("amber");
    };
    this.ResetMoves = function() {
        $(".btn-move").removeClass("amber").addClass("blue");
    };
    this.SetCaption = function(message) {
        $("#gameCommentary > p").html(message);
    };
    this.UpdateStatistics = function(wins, losses, ties) {
        var row = $("#winsLosses");
        row.empty();
        $("<td>").text(wins).appendTo(row);
        $("<td>").text(losses).appendTo(row);
        $("<td>").text(ties).appendTo(row);
    }
}
