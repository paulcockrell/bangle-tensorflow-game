let model, statusEl, predictionsContainerEl, predictionsEl, connection, gestureClasses, feedbackEl;

const predict = (gesture) => {
    tf.tidy(() => {
        const input = tf.tensor2d([gesture], [1, 50]);
        const predictOut = model.predict(input);
        const _logits = Array.from(predictOut.dataSync());
        const winner = gestureClasses[predictOut.argMax(-1).dataSync()[0]];
        
        if (winner) {
            const randCol = '#' + parseInt(Math.random() * 0xffffff).toString(16);
            predictionsContainerEl.style.setProperty("background", randCol);
            predictionsEl.innerHTML = winner;
        } else {
            predictionsEl.innerHTML = "Unknown gesture";
        }
    });
}

const onGesture = (buf) => {
    const rawGesture = JSON.parse(buf.match(/\[[0-9\-,]+\]/))
    if (!rawGesture) return;

    let gesture = rawGesture.slice(0, 50);
    while (gesture.length !== (50)) gesture.push(0);

    try {
        predict(gesture);
    } catch(e) {
        console.log("Error predicting", e)
    }
}

function disconnect() {
    if (connection) {
        connection.close();
        connection = undefined;
        statusEl.innerHTML = "Disconnected";
    }
}

function connect() {
    disconnect();

    // Update status text
    statusEl.innerHTML = "Conecting to BangleJS..."
    // Clear results panel
    predictionsEl.innerHTML += "";

    Puck.connect((conn) => {
        if (!conn) {
            statusEl.innerHTML = "Disconnected";
            return;
        }

        feedbackEl.classList.remove("ribbon-neutral", "ribbon-connected", "ribbon-connecting", "ribbon-complete");
        feedbackEl.classList.add("ribbon-connected");

        statusEl.innerHTML = "Connected... please wait for initialization to complete";
        connection = conn;

        let buf = "";
        connection.on("data", function(d) {
            buf += d;
            let i = buf.indexOf("\n");
            while (i >= 0) {
                onGesture(buf.substr(0,i));
                buf = buf.substr(i+1);
                i = buf.indexOf("\n");
            }
        });

        // First, reset Puck.js
        connection.write("reset();\n", function() {
            // Wait for it to reset itself
            const gestureProgram = "Bangle.on('gesture', g => Bluetooth.println(JSON.stringify(g))); NRF.on('disconnect', () => reset());\n"
            const evt = new CustomEvent("bangleConnected");
            setTimeout(() => {
                connection.write(gestureProgram, () => document.dispatchEvent(evt));
            }, 1500);
        });
    });
};

const setup = async (opts) => {
    statusEl = document.getElementById("status");
    predictionsContainerEl = document.getElementById("predictionsContainer")
    predictionsEl = document.getElementById("predictions");
    feedbackEl = document.getElementById("feedback");

    const modelKey = opts.modelKey;
    gestureClasses = opts.gestureClasses;

    statusEl.innerHTML = "Loading model";

    feedbackEl.classList.remove("ribbon-neutral", "ribbon-connected", "ribbon-connecting", "ribbon-complete");
    feedbackEl.classList.add("ribbon-connecting");

    model = await tf.loadLayersModel(`localstorage://${modelKey}`);
    if (!model) throw new Error(`Couldn't load model ${modelKey}`)
}

export default {
    setup: setup,
    connect: connect,
    predict: predict,
}
