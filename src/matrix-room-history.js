module.exports = function(RED) {
    function MatrixHistory(n) {
        RED.nodes.createNode(this, n);

        var node = this;

        this.name = n.name;
        this.server = RED.nodes.getNode(n.server);
        this.roomId = n.roomId;
        this.limit = n.limit;

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

            msg.description = room.currentState.getStateEvents("m.room.topic", "").getContent();

            node.server.matrixClient.scrollback(room, 100000)
                .then(function(e) {
                    node.log("Successfully fetched history from " + msg.topic);
                    msg.eventId = e.event_id;

                    const timeline = JSON.parse(JSON.stringify(e.timeline));
                    msg.timeline = timeline;
                    if (msg.thread_id) {
                        const firstMessageInThread =
                        msg.thread =
                        timeline.filter((t) => {
                            const content = t?.content ?? t?.decrypted.content;
                            if((t?.event_id ?? t?.decrypted.event_id) === msg.thread_id){
                                return true;
                            }
                            return content["m.relates_to"]?.event_id === msg.thread_id
                        })
                        msg.thread = msg.thread.map((t)=>{
                            return {
                                content: t.content ?? t.decrypted.content,
                                sender: t.sender ?? t.decrypted.sender,
                            }
                        })
                    }
                    node.send([msg, null]);
                })
                .catch(function(e){
                    node.error("Error trying to fetch history from " + msg.topic);
                    msg.error = e;
                    node.send([null, msg]);
                });

        });
    }
    RED.nodes.registerType("matrix-room-history", MatrixHistory);
}
