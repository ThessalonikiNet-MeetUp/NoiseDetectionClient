var fs = require('fs');

(function (window) {

    var configuration = {
        deviceID: null,
        decibelLevel: 100,
        detectionCount: 100,
        resetInterval: 5,
        recording: false
    }

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

        // get the context from the canvas to draw on
        var ctx = $("#canvas").get()[0].getContext("2d");
        var gradient = ctx.createLinearGradient(0,0,0,300);
        gradient.addColorStop(1,'#000000');
        gradient.addColorStop(0.75,'#ff0000');
        gradient.addColorStop(0.25,'#ffff00');
        gradient.addColorStop(0,'#ffffff');
        // create a temp canvas we use for copying
        // var tempCanvas = document.createElement("canvas"),
        //     tempCtx = tempCanvas.getContext("2d");
        // tempCanvas.width=800;
        // tempCanvas.height=512;
        // // used for color distribution
        // var hot = new chroma.ColorScale({
        //     colors:['#000000', '#ff0000', '#ffff00', '#ffffff'],
        //     positions:[0, .25, .75, 1],
        //     mode:'rgb',
        //     limits:[0, 300]
        // });
        javascriptNode.onaudioprocess = function() {
            
            // get the average, bincount is fftsize / 2
            var array =  new Uint8Array(analyserNode.frequencyBinCount);
            
            analyserNode.getByteFrequencyData(array);
            var average = getAverageVolume(array)
            //console.log('average: ' + average);

             // clear the current state
            ctx.clearRect(0, 0, 60, 130);
     
            // set the fill style
            ctx.fillStyle=gradient;
     
            // create the meters
            //ctx.fillRect(0,130-average,25,130);
            drawSpectrum(array);
            fd = JSON.stringify({"deviceID": configuration.deviceID, "noiseLevel":average});

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
        function drawSpectrum(array) {
        for ( var i = 0; i < (array.length); i++ ){
                var value = array[i];
                //ctx.fillRect(i*5,325-value,3,325);
                ctx.fillRect(0,130-value,25,130);
            }
        };
        // function drawSpectrogram(array) {
            
        //     // copy the current canvas onto the temp canvas
        //     var canvas = document.getElementById("canvas");
        //     tempCtx.drawImage(canvas, 0, 0, 800, 512);
     
        //     // iterate over the elements from the array
        //     for (var i = 0; i < array.length; i++) {
        //         // draw each pixel with the specific color
        //         var value = array[i];
        //         ctx.fillStyle = hot.getColor(value).hex();
     
        //         // draw the line at the right side of the canvas
        //         ctx.fillRect(800 - 1, 512 - i, 1, 1);
        //     }
     
        //     // set translate on the canvas
        //     ctx.translate(-1, 0);
        //     // draw the copied image
        //     ctx.drawImage(tempCanvas, 0, 0, 800, 512, 0, 0, 800, 512);
     
        //     // reset the transformation matrix
        //     ctx.setTransform(1, 0, 0, 1, 0, 0);
        // }
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

    function updateUI() {
        if(configuration.deviceID !== null) {
            jQuery('#statuspanel').removeClass('hidden');
            jQuery('#configurationpanel').addClass('hidden');
        }
        else {
            jQuery('#configurationpanel').removeClass('hidden');
            jQuery('#statuspanel').addClass('hidden');
        }
    }

    function initConfigurationPage() {
        jQuery('#configuration').submit(function (e) {
            e.preventDefault();

            jQuery('#deviceid').closest('.form-group').removeClass('has-error');

            var deviceId = jQuery('#deviceid').val();

            if (deviceId === null || deviceId === '' || isNaN(parseInt(deviceId, 10))) {
                jQuery('#deviceid').closest('.form-group').addClass('has-error');
                jQuery('#deviceid').focus();
            }
            else {
                jQuery('#saveconfiguration').button('loading');
                configuration.deviceID = parseInt(deviceId, 10);

                saveConfiguration(function () {
                    jQuery('#saveconfiguration').button('reset');
                    jQuery('#configurationpanel').removeClass('panel-default').addClass('panel-success');

                    updateUI();
                    initAudio();
                });
            }
        });
    }

    function loadConfiguration(callback) {
        var path = __dirname + "/config.json";
        
        if (!fs.existsSync(path)) { callback(); return; }

        fs.readFile(path, 'utf8', function (err,data) {
            if (err) {
                return console.log(err);
            }
            configuration = JSON.parse(data);
            callback();
        });
    }

    function saveConfiguration(callback) {
        var path = __dirname + "/config.json";
        
        fs.writeFile(path, JSON.stringify(configuration), function(err) {
            if(err) {
                return console.log(err);
            }

            callback();
        }); 
    }

    function main() {
        initConfigurationPage();
        
        loadConfiguration(function() {
            updateUI();

            if(configuration.deviceID) {
                initAudio();
            }
            
        });
    };

    window.addEventListener('load', main);

})(this);
