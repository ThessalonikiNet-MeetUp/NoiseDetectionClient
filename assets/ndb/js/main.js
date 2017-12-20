var fs = require('fs');

(function (window) {

    const remote = require('electron').remote; 

    var configuration = {
        deviceID: null,
        decibelLevel: 100,
        detectionCount: 100,
        resetInterval: 5,
        recording: false,
        azureEndpoint: ''
    }

    var lastFired = null;

    // AUDIO FUNCTIONS
    window.AudioContext = window.AudioContext || window.webkitAudioContext;

    var audioContext = new window.AudioContext();

    var audioInput = null,
        realAudioInput = null,
        inputPoint = null,
        audioRecorder = null,
        analyserContext = null;

    var callbackReceivedAudioStream = function(stream) {
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

        javascriptNode.onaudioprocess = function() {
            
            // get the average, bincount is fftsize / 2
            var array =  new Uint8Array(analyserNode.frequencyBinCount);
            
            analyserNode.getByteFrequencyData(array);
            var average = getAverageVolume(array);
            
            //console.log('average: ' + average);

             // clear the current state
            ctx.clearRect(0, 0, 60, 200);
            // set the fill style
            ctx.fillStyle=gradient;
            // create the meters
            drawSpectrum(array);

            // avoid sending too many requests to the bot
            var now = new Date();
            if(lastFired !== null && (now - lastFired) / 1000 > 15) {
                lastFired = null;
                console.log('unblocking');
            }

            jQuery('#levels').text(average);

            // fire when threshold has been exceeded
            if (average > configuration.decibelLevel && lastFired == null) {
                detectedCount++;
                // console.log('detectedCount', detectedCount, average);
                if (detectedCount == 1) {
                    startTime = new Date();
                    //console.log('init');
                }
                if (detectedCount > 10) {
                    fd = JSON.stringify({"deviceID": configuration.deviceID, "noiseLevel":average});
                    console.log('fire');
                    lastFired = new Date();
                    $.ajax({
                        type: 'POST',
                        url: configuration.azureEndpoint,
                        data: fd,
                        dataType: "json",
                        contentType: "application/json",
                        success: function(result){
                            console.log('post result: ' + result);
                        },
                        error: function(e){
                            console.log(e);
                            lastFired = null;
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
                ctx.fillRect(0,200-value,25,200);
            }
        };
    };

    var initAudio = function() {
        console.log('initAudio');
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

    var initUI = function() {
        console.log('initUI');

        initApp();
        initConfigurationPage();
    };

    var initApp = function() {
        console.log('initApp');
        
        jQuery('#exit').click(function(e) {
            e.preventDefault();
            const window = remote.getCurrentWindow();
            window.close();
        });

        jQuery('#clientTabs a:first').tab('show');
    };

    var initConfigurationPage = function() {
        console.log('initConfigurationPage');
        
        jQuery('#deviceid').val(configuration.deviceID);
        jQuery('#decibellevel').val(configuration.decibelLevel);

        jQuery('#configuration').submit(function (e) {
            e.preventDefault();

            jQuery('#deviceid').closest('.form-group').removeClass('has-error');
            jQuery('#decibellevel').closest('.form-group').removeClass('has-error');

            var deviceId = jQuery('#deviceid').val();
            var decibelLevel = jQuery('#decibellevel').val();

            if (decibelLevel === null || decibelLevel === '' || isNaN(parseInt(decibelLevel, 10))) {
                console.log('using default decibelLevel');
                configuration.decibelLevel = 80;

            }
            else {
                configuration.decibelLevel = parseInt(decibelLevel, 10);
            }

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
                });
            }
        });
    }

    var loadConfiguration = function(callback) {
        console.log('loadConfiguration');
        var path = __dirname + "/config.json";
        
        if (!fs.existsSync(path)) { callback && callback(); return; }

        fs.readFile(path, 'utf8', function (err,data) {
            if (err) {
                return console.log(err);
            }
            configuration = JSON.parse(data);
            callback && callback();
        });
    }

    var saveConfiguration = function(callback) {
        console.log('saveConfiguration');
        var path = __dirname + "/config.json";
        
        fs.writeFile(path, JSON.stringify(configuration), function(err) {
            if(err) {
                return console.log(err);
            }

            callback && callback();
        }); 
    }

    var main = function () {
        console.log('main')

        var loadConfigurationCallback = function() {
            console.log('loadConfigurationCallback');

            initUI();
            initAudio();
        };
        
        loadConfiguration(loadConfigurationCallback);

    };

    window.addEventListener('load', main);

})(this);
