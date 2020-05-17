const storage = window.localStorage;

let recordBtn, gestureEl, gestureCountEl, statusEl, resultsEl, storageKey,
    sampleSize, connection, gestureCount, recording, feedbackEl;

// Called when we get a line of data - updates the dom element
function onGesture(v) {
    if (!recording) return;

    const gestureName = gestureEl.value;
    const re = new RegExp(`^${gestureName}`, 'g');

    if (v.match(re)) {
        const gestures = storage.getItem(storageKey) || "";
        storage.setItem(storageKey, `${gestures}${v}\n`);

        resultsEl.value += `${v}\n`;

        gestureCount++;
        gestureCountEl.innerHTML = `${gestureName}: ${gestureCount} of ${sampleSize}`;
        if (gestureCount === sampleSize) {
            disconnect();

            recording = false;

            feedbackEl.classList.remove("ribbon-neutral", "ribbon-connected", "ribbon-connecting", "ribbon-complete");
            feedbackEl.classList.add("ribbon-complete");

            statusEl.innerHTML = "You can either record another gesture, or click 'Start training' to progress to train the model.";

            const evt = new CustomEvent("recordCompleted", { detail: { storageKey: storageKey, sampleSize: sampleSize } });
            document.dispatchEvent(evt);
        }
    }
}

function disconnect() {
    if (connection) {
        connection.close();
        connection = undefined;
        statusEl.innerHTML = "Disconnected";
    }
}

function record() {
    disconnect();

    recordBtn.setAttribute("disabled", true);

    // Set storage key based on gesture name
    const gestureName = gestureEl.value;
    if (!gestureName || gestureName.length <= 0) {
        alert("Please enter a gesture name");
        recordBtn.removeAttribute("disabled");
        return;
    }

    // Scroll to feedback section
    feedbackEl.scrollIntoView({behavior: "smooth", block: "start", inline: "nearest"});

    // Update status text
    feedbackEl.classList.remove("ribbon-neutral", "ribbon-connected", "ribbon-connecting", "ribbon-complete");
    feedbackEl.classList.add("ribbon-connecting");
    statusEl.innerHTML = "Conecting to BangleJS..."

    // Reset gesture counter
    gestureCount = 0;

    // Clear recording counter
    gestureCountEl.innerHTML = `Recorded ${gestureCount} of ${sampleSize}`

    // Clear results panel
    resultsEl.value += "-----------------\n";

    recording = true;

    Puck.connect((conn) => {
        if (!conn) {
            statusEl.innerHTML = "Disconnected";
            return;
        }

        feedbackEl.classList.remove("ribbon-neutral", "ribbon-connected", "ribbon-connecting", "ribbon-complete");
        feedbackEl.classList.add("ribbon-connected");

        statusEl.innerHTML = "Connected... please wait for initialization to complete";
        connection = conn;
        // Handle the data we get back, and call 'onGesture'
        // whenever we get a line
        let buf = "";
        connection.on("data", function(d) {
            buf += d;
            let i = buf.indexOf("\n");
            while (i>=0) {
                onGesture(buf.substr(0,i));
                buf = buf.substr(i+1);
                i = buf.indexOf("\n");
            }
        });

        // First, reset Puck.js
        connection.write("reset();\n", function() {
            // Wait for it to reset itself
            const gestureProgram = "Bangle.on('gesture', (g) => Bluetooth.println('" + gestureName + "('+g.length/3+'),'+g.slice().join(','))); NRF.on('disconnect', function() { reset() });\n";
            setTimeout(function() {
                connection.write(gestureProgram, () => statusEl.innerHTML = "Ready... Begin moving the watch and the gesture will appear below");
            }, 1500);
        });
    });
};

function setup(opts) {
    storageKey = opts.storageKey;
    sampleSize = opts.sampleSize;
    gestureCount = 0;

    gestureEl = document.getElementById("gesture");
    gestureCountEl = document.getElementById("gestureCount");
    statusEl = document.getElementById("status");
    resultsEl = document.getElementById("results");
    recordBtn = document.getElementById("recordBtn");
    feedbackEl = document.getElementById("feedback");
}

export default {
    setup: setup,
    record: record
}