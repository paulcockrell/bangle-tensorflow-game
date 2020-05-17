let justFeatures = [];
let justLabels = [];
const gestureClasses = new Set();

// We should look at this, these should be passed in from outside.
const maxDataPerLine = 50; // this will limit the number of data samples per line, so that they are the same for tensorflow to work. they are (x, y, z) hense why we are explicitly doing 3 * n. n is arbitary

let storageKey, numSamplesPerGesture, totalNumDataPerFile;

function readStorage() {
    const records = window.localStorage.getItem(storageKey);
    const processedLines = [];

    return new Promise((resolve, reject) => {
        if (!records) return reject("Storage key not found");

        const lines = records.split("\n").filter(line => { if (line && line.trim().length > 0) return line});
        lines.forEach(line => {
            const data = line.split(",")
            const rowHeading = data.shift(); // first element is gesture label
            const label = rowHeading.match(/^\w+/)[0]; // extract the label portion e.g swim(12) -> swim
            const _dataCount = rowHeading.match(/\(([0-9]+)\)/)[1]; // extract the count portion e.g swim(12) -> 12

            // Record label in a Set (keps keys unique for us)
            gestureClasses.add(label);
            const labelIdx = [...gestureClasses].indexOf(label);

            // Create Array of 50 els value of 0
            const featuresMask = new Array(maxDataPerLine).fill(0);
            const features = data.map(data => parseFloat(data)).slice(0, numSamplesPerGesture * maxDataPerLine);
            // Truncate features array to 50 els
            processedLines.push({
              label: labelIdx,
              features: featuresMask.map((val, i) => features[i] || val),
            });
        });

        resolve({
          gestureClasses: [...gestureClasses],
          data: processedLines,
        });
    });
}

const format = async (allData) => {
  // sort all data by label to get [{label: 0, features: ...}, {label: 1, features: ...}];
  let sortedData = allData.sort((a, b) => (a.label > b.label) ? 1 : -1);

  const justLabels = [];
  const justFeatures = [];

  sortedData.map(item => {
    createMultidimentionalArrays(justLabels, item.label, item.label);
    createMultidimentionalArrays(justFeatures, item.label, item.features);
  })

  const [trainingFeatures, trainingLabels, testingFeatures, testingLabels] = transformToTensor(justLabels, justFeatures);
  const modelKey = await createModel(trainingFeatures, trainingLabels, testingFeatures, testingLabels);

  return {
    modelKey,
    gestureClasses: [...gestureClasses]
  }
}

function createMultidimentionalArrays(dataArray, index, item){
  !dataArray[index] && dataArray.push([]);

  dataArray[index].push(item);
}

const transformToTensor = (labels, features) => { 
  return tf.tidy(() => {
    const xTrains = [];
    const yTrains = [];
    const xTests = [];
    const yTests = [];
    for (let i = 0; i < [...gestureClasses].length; ++i) {
      const [xTrain, yTrain, xTest, yTest] = convertToTensors(features[i], labels[i], 0.20);
      xTrains.push(xTrain);
      yTrains.push(yTrain);
      xTests.push(xTest);
      yTests.push(yTest);
    }

    const concatAxis = 0;

    return [
      tf.concat(xTrains, concatAxis), tf.concat(yTrains, concatAxis),
      tf.concat(xTests, concatAxis), tf.concat(yTests, concatAxis)
    ];
  })
}

function convertToTensors(featuresData, labelData, testSplit) {
  if (featuresData.length !== labelData.length) {
    throw new Error('features set and labels set have different numbers of examples');
  }

  const [shuffledFeatures, shuffledLabels] = shuffleData(featuresData, labelData);
  const featuresTensor = tf.tensor2d(shuffledFeatures, [numSamplesPerGesture, maxDataPerLine]);

  // Create a 1D `tf.Tensor` to hold the labels, and convert the number label
  // from the set {0, 1, 2} into one-hot encoding (.e.g., 0 --> [1, 0, 0]).
  console.log(tf.tensor1d(shuffledLabels).toInt(), shuffledLabels, [...gestureClasses])
  const labelsTensor = tf.oneHot(tf.tensor1d(shuffledLabels).toInt(), [...gestureClasses].length);

  return split(featuresTensor, labelsTensor, testSplit);
}

// We should determine numSamplesPerGesture properly
const shuffleData = (features, labels) => {
  const indices = [...new Array(numSamplesPerGesture).keys()];
  tf.util.shuffle(indices);

  let shuffledFeatures = [];
  let shuffledLabels = [];

  features.forEach((_featuresArray, index) => {
    shuffledFeatures = shuffledFeatures.concat(features[indices[index]]);
    shuffledLabels = shuffledLabels.concat(labels[indices[index]]);
  })

  return [shuffledFeatures, shuffledLabels];
}

const split = (featuresTensor, labelsTensor, testSplit) => {
  // Split the data into a training set and a test set, based on `testSplit`.
  const numTestExamples = Math.round(numSamplesPerGesture * testSplit);
  const numTrainExamples = numSamplesPerGesture - numTestExamples;

  const trainingFeatures = featuresTensor.slice([0, 0], [numTrainExamples, maxDataPerLine]);//totalNumDataPerFile]);
  const testingFeatures = featuresTensor.slice([numTrainExamples, 0], [numTestExamples, maxDataPerLine]);//totalNumDataPerFile]);
  const trainingLabels = labelsTensor.slice([0, 0], [numTrainExamples, gestureClasses.size]);

  // was [0,0] and still worked....
  // const testingLabels = labelsTensor.slice([0, 0], [numTestExamples, gestureClasses.size]);
  const testingLabels = labelsTensor.slice([numTrainExamples, 0], [numTestExamples, gestureClasses.size]);

  return [trainingFeatures, trainingLabels, testingFeatures, testingLabels];
}

const createModel = async(xTrain, yTrain, xTest, yTest) => {
  // Define the topology of the model: two dense layers.
  const model = tf.sequential();
  model.add(tf.layers.dense({units: 60, activation: 'sigmoid', inputShape: [xTrain.shape[1]]}));
  model.add(tf.layers.dense({units: gestureClasses.size, activation: 'softmax'}));
  model.summary();

  tfvis.show.modelSummary({ name: 'Gestures model summary', tab: "Visor" }, model);

  const optimizer = tf.train.adam(0.1 /* learning rate */);
  model.compile({
    optimizer: optimizer,
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });

  await model.fit(xTrain, yTrain, {
    epochs: 100,
    batchSize: 32,
    shuffle: true,
    callbacks: tfvis.show.fitCallbacks(
      { name: "Training performance" },
      ["loss", "mae"],
      { height: 200, callbacks: ["onEpochEnd"] },
    ),
    validationData: [xTest, yTest],
  });
  
  // This value should come from outside
  const modelKey = `${storageKey}-model`;
  await model.save(`localstorage://${modelKey}`);

  return modelKey;
}

const setup = (opts) => {
  storageKey = opts.storageKey;
  numSamplesPerGesture = opts.sampleSize;
  totalNumDataPerFile = maxDataPerLine * numSamplesPerGesture;
}

export default {
  setup,
  readStorage,
  format,
}