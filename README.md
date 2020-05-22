# BangleJS + TensorflowJS = Inbrowser gesture training

This is an experimental repository to see how to go about training models to recognise gestures from data collected over BLE from the BangleJS watch.

## Instructions

### Setup

Visit https://paulcockrell.github.io/banglejs-tensorflow-example/ to begin, or to run locally clone and run a local webserver to serve the project e.g https://www.npmjs.com/package/http-server. There are no server-side processes to be concerned with, this is purely all done in the browser (Google Chrome).

### Process
#### Recording gestures

_You must record a minimum of two gestures for this to work_

_Data is stored in the browsers Local-storage, and this is cleared when ever you visit the `Record gestures` page!_

1. Visit the `Index` page, and click `Begin`
1. You will be taken to the `Recording` page
1. In the form enter a `Gesture name` (e.g `Punch`) and select a `Sample size` (5 is fine if the gesture movements are very different - but the more you record, the better the predictions).
1. Click `Record gesture` .. the page will automatically scroll down to the feed back section, wait for the feed back bar to turn red (recording mode) and its message to say its `Ready`.
1. Perform your gestures (first always fails as it needs the raw data to be cleaned..). Make them clear actions lasting between 1-2 seconds.
1. Once the feedback bar goes `Green`, scroll back up to the top of the page, and enter a **NEW** gesture name (e.g `Slap`), keep the sample value the same as before.
1. Perform steps `2-3` again.
1. Now you will have recorded **TWO** gestures (you can confirm this in the bangle gesture readings section at the bottom of page)
1. Click `Start Training` in the form at the top of the page, you will now be the `Training page`.

#### Training gestures

1. Click the `Train` button
1. A side-bar will appear showing you details on the prediction quality as the model trains etc (its multi-tabbed so look around)
1. Once the training is completed, the `Next` button will become active
1. Click `Next` to be taken to the `Predictor page`.

#### Predicting gestures

This is where the fun begins, simply click the `Start button`, wait for the feedback bar to say its ready, then perform your gestures.
It will render the predicted gesture label in the center of the screen, changing colour each prediction (to identify a new prediction should you perform the same gesture repeatedly!).

## Notes

* This is done in vanilla JS. I didn't want to bog the Bangle community down with frameworks.
* This is a spike, the code quality reflects this
* The UI could do with a rethink, but is presentable for this spike

## Todo

* We want to take the model generated and convert it to a TFLite model so that it can be loaded into the Bangle watch.
