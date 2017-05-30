# NoiseDetectionClient
This is a cross-platform Electron menu app that processes audio stream from the computer. When the volume exceeds the decibel level set by the user, the app sends a web request to an HTTP endpoint.

### For development

```
$ npm install electron-prebuilt -g
$ electron index.js
```

### Acknowledgement
Many thanks to [@josdirksen](https://github.com/josdirksen) for the [sample code](https://github.com/josdirksen/smartjava/tree/master/webaudio) of using the [Web Audio API](https://dvcs.w3.org/hg/audio/raw-file/tip/webaudio/specification.html) and an audio visualizer.
