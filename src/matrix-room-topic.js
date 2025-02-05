module.exports = function(RED) {
    function MatrixTopic(n) {
        RED.nodes.createNode(this, n);

        var node = this;

        this.name = n.name;
        this.server = RED.nodes.getNode(n.server);
        this.roomId = n.roomId;

        if (!node.server) {
            node.warn("No configuration node");
            return;
        }

        node.status({ fill: "red", shape: "ring", text: "disconnected" });

        node.server.on("disconnected", function(){
            node.status({ fill: "red", shape: "ring", text: "disconnected" });
        });

        node.server.on("connected", function() {
            node.status({ fill: "green", shape: "ring", text: "connected" });
        });

        node.on("input", function (msg) {
            if (! node.server || ! node.server.matrixClient) {
                node.error("No matrix server selected");
                return;
            }

            if(!node.server.isConnected()) {
                node.error("Matrix server connection is currently closed");
                node.send([null, msg]);
            }

            msg.topic = node.roomId || msg.topic;
            if(!msg.topic) {
                node.error("Room must be specified in msg.topic or in configuration");
                return;
            }

            let room = null;
            if( null === (room = node.server.matrixClient.getRoom(msg.topic))){
                node.error("Room doesn't exists on there is no data");
                return;
            }

            msg.description = room.currentState.getStateEvents("m.room.topic", "");

        });
    }
    RED.nodes.registerType("matrix-room-topic", MatrixTopic);
}
