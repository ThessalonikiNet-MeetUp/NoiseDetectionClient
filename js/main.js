var fs = require('fs');

(function (window) {

    var isRecording = false;
    var btnRecord;

    // AUDIO FUNCTIONS
    window.AudioContext = window.AudioContext || window.webkitAudioContext;

    var audioContext = new window.AudioContext();

    var audioInput = null,
        realAudioInput = null,
        inputPoint = null,
        audioRecorder = null;
    var analyserContext = null;

    function submit(blob){
        console.log('blob:');
        console.log(blob);
    }

    function gotBuffers(buffers) {
        audioRecorder.exportWAV(doneEncoding);
    }

    function doneEncoding(blob) {
        //submit(blob);
    }

    window.btnRecordDown = function (e) {
        $('#btnRecord').removeClass('btnup').addClass('btndown');
        $('#spinIntent').css('visibility', 'hidden');
        $('#spinPhrase').css('visibility', 'hidden');
        $("#txtPhrase").val("");
        $("#txtIntent").val("");

        // START CLIENT SIDE AUDIO RECORDING PROCESS
        if (!audioRecorder) return;
        audioRecorder.clear();
        audioRecorder.record();

        isRecording = true;
    };

    window.btnRecordOut = function (e) {
        if (isRecording)
            btnRecordUp(e);
    }

    window.btnRecordUp = function (e) {
        alert("btnRecordUp");
        
        isRecording = false;
        $('#btnRecord').removeClass('btndown').addClass('btnup');

        $('#spinPhrase').css('visibility', 'visible');
        audioRecorder.stop();
        audioRecorder.getBuffers(gotBuffers);

        // EVENTUALY, WE WILL DO THIS AT THE END:
        // updateGrid();
    };

    function callbackReceivedAudioStream(stream) {
        console.log('callbackReceivedAudioStream');
        inputPoint = audioContext.createGain();

        realAudioInput = audioContext.createMediaStreamSource(stream);
        audioInput = realAudioInput;
        audioInput.connect(inputPoint);

        analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = 1024;
        inputPoint.connect( analyserNode );

        audioRecorder = new Recorder( inputPoint );

        zeroGain = audioContext.createGain();
        zeroGain.gain.value = 0.0;
        inputPoint.connect( zeroGain );
        zeroGain.connect( audioContext.destination );

        //Noise detection
        javascriptNode = audioContext.createScriptProcessor(1024, 1, 1);
        javascriptNode.connect(audioContext.destination);
        var detectedCount = 0;
        var startTime = null;

        javascriptNode.onaudioprocess = function() {
            // get the average, bincount is fftsize / 2
            var array =  new Uint8Array(analyserNode.frequencyBinCount);
            analyserNode.getByteFrequencyData(array);
            var average = getAverageVolume(array)
            //console.log('average: ' + average);
            fd = JSON.stringify({"deviceID": "37", "noiseLevel":135.3});

            if (average > 70){
                detectedCount++;
                //console.log(detectedCount);
                if (detectedCount == 1){
                    startTime = new Date();
                    //console.log('init');
                }
                if (detectedCount > 100){
                    console.log('fire');
                      $.ajax({
                            type: 'POST',
                            url: ' https://noisedetectionfunctions.azurewebsites.net/api/AddEventHttpTrigger?code=eCFnaCPKSLtLwFhuLNdEpchsuJXZGosUzdw0AqTCedBXBa3Nh5Iw3Q==',
                            data: fd,
                            dataType: "json",
                            contentType: "application/json",
                            success: function(result){
                                console.log('post result: ' + result);
                            },
                            error: function(e){
                                console.log(e);
                            }
                        });
                    detectedCount = 0;
                }else{
                    //console.log('lets wait and see');
                }
               
            }else{
                if (startTime){
                    currentTime = new Date();
                    if ((currentTime - startTime)/1000 > 3){
                        detectedCount = 0;
                        startTime = null;
                        console.log('reset');
                    }
                }
            }
        }
 
        function getAverageVolume(array) {
            var values = 0;
            var average;
            var length = array.length;
            // get all the frequency amplitudes
            for (var i = 0; i < length; i++) {
                values += array[i];
            }
            average = values / length;
            return average;
        }
    };

    function initAudio() {

        if (!navigator.getUserMedia)
            navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        if (!navigator.cancelAnimationFrame)
            navigator.cancelAnimationFrame = navigator.webkitCancelAnimationFrame || navigator.mozCancelAnimationFrame;
        if (!navigator.requestAnimationFrame)
            navigator.requestAnimationFrame = navigator.webkitRequestAnimationFrame || navigator.mozRequestAnimationFrame;

        navigator.getUserMedia(
            {
                "audio": {
                    "mandatory": {
                        "googEchoCancellation": "false",
                        "googAutoGainControl": "false",
                        "googNoiseSuppression": "false",
                        "googHighpassFilter": "false"
                    },
                    "optional": []
                },
            }, callbackReceivedAudioStream, function (e) {
                alert('Error getting audio');
                console.log(e);
            });
    };


    function main() {
        initAudio();
    };

    window.addEventListener('load', main);

})(this);
