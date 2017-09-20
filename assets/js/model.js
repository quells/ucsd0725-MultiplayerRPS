var Model = function() {
    // Initialize Firebase
    var firebaseConfig = {
      apiKey: "AIzaSyDche8iZhBNbdpWq8bpLi9YKyjwuCh1M9w",
      authDomain: "ungnawed-leech.firebaseapp.com",
      databaseURL: "https://ungnawed-leech.firebaseio.com",
      projectId: "ungnawed-leech",
      storageBucket: "",
      messagingSenderId: "798037079320"
    };
    firebase.initializeApp(firebaseConfig);
    this.database = firebase.database();

    // Raw Data
    this.connections = {};  // All Connections
    this.requests = {};     // User's Requests
    this.responses = {};    // User's Responses
    this.game = {};         // User's Game (belongs to challenger)

    // Local Data
    this.UID = "";
    this.PlayerName = RandomName();
    this.PlayerStatus = "lobby";
    this.OtherPlayers = {};
    var self = this;

    // Callbacks
    this.connectionsCallbacks = {index: 0};
    this.otherPlayersCallbacks = {index: 0};
    this.requestsCallbacks = {index: 0};
    this.responsesCallbacks = {index: 0};
    this.gameCallbacks = {index: 0};
    // Dynamic self-modification! WooooOOOOoooo
    this.RegisterCallback = function (target, callback) {
        if (target === undefined) { return; }
        if (callback === undefined) { return; }

        target = target + "Callbacks";
        if (self[target] === undefined) {
            throw new Error("Model.RegisterCallback error: unknown target " + target);
        }

        var i = self[target].index;
        self[target][i] = callback;
        self[target].index = i + 1;
    };
    this.fireCallbacks = function(target, diffs) {
        if (target === undefined) { return; }
        if (diffs === undefined) { return; }

        target = target + "Callbacks";
        if (self[target] === undefined) {
            throw new Error("Model.fireCallback error: unknown target " + target);
        }

        for (var p in self[target]) {
            if (p === "index") { continue; }
            self[target][p](diffs);
        }
    }

    this.isLit = false;
    this.Ignite = function() {
        // Allows callbacks to be registered before all the Firebase stuff starts
        if (self.isLit) { return; }
        self.isLit = true;
        self.RegisterCallback("connections", function(diffs) {
            var snapshot_old = JSON.parse(JSON.stringify(self.OtherPlayers));
            for (var p in diffs.added) {
                if (p === self.UID) { continue; }
                self.OtherPlayers[p] = diffs.added[p];
            }
            for (var p in diffs.updated) {
                if (p === self.UID) { continue; }
                self.OtherPlayers[p] = diffs.updated[p];
            }
            for (var p in diffs.removed) {
                if (p === self.UID) {
                    console.log("Model.connectionsCallback warning: I no longer exist on the server");
                } else {
                    delete self.OtherPlayers[p];
                }
            }
            diffs = DiffObjects(snapshot_old, self.OtherPlayers);
            self.fireCallbacks("otherPlayers", diffs);
        })

        // Firebase
        self.database.ref("/connections").on("value", function(snapshot) {
            // Update local cache of users
            snapshot = snapshot.val();
            var diffs = DiffObjects(self.connections, snapshot);
            self.fireCallbacks("connections", diffs);
            self.connections = snapshot;
        });
        self.database.ref(".info/connected").on("value", function(connected) {
            if (connected.val()) {
                // New user
                var con = self.database.ref("/connections").push({
                    "name": self.PlayerName,
                    "status": "lobby"
                });
                con.onDisconnect().remove();
                self.UID = con.key;

                con.child("status").on("value", function(snapshot) {
                    snapshot = snapshot.val();
                    console.log("status", snapshot)
                    self.fireCallbacks("requests", snapshot);
                    self.PlayerStatus = snapshot;
                });

                con.child("requests").on("value", function(snapshot) {
                    snapshot = snapshot.val();
                    var diffs = DiffObjects(self.requests, snapshot);
                    self.fireCallbacks("requests", diffs);
                    self.requests = snapshot;
                });

                con.child("responses").on("value", function(snapshot) {
                    snapshot = snapshot.val();
                    var diffs = DiffObjects(self.responses, snapshot);
                    self.fireCallbacks("responses", diffs);
                    self.responses = snapshot;
                });

                con.child("game").on("value", function(snapshot) {
                    snapshot = snapshot.val();
                    var diffs = DiffObjects(self.game, snapshot);
                    self.fireCallbacks("game", diffs);
                    self.game = snapshot;
                });
            }
        });
    }
};