var keySystem, certificate, licencia_wide, licencia_play, playbackurl, serverCertificatePath;
var BROWSER = { OPERA: "OPERA", FIREFOX: "FIREFOX", SAFARI: "SAFARI", CHROME: "CHROME", IE: "IE", EDGE: "EDGE", UNKNOWN: "UNKNOWN" },
    getBrowser = function () {
        var t = !!window.opr && !!opr.addons || !!window.opera || navigator.userAgent.indexOf(" OPR/") >= 0,
            e = "undefined" != typeof InstallTrigger,
            i = /constructor/i.test(window.HTMLElement) || function (t) {
                return "[object SafariRemoteNotification]" === t.toString()
            }(!window.safari || safari.pushNotification),
            n = /Safari/i.test(navigator.userAgent) && /iP(hone|od|ad)/i.test(navigator.userAgent),
            r = !!document.documentMode,
            o = !r && !!window.StyleMedia,
            a = /Google Inc/.test(navigator.vendor),
            s = /Chrome/i.test(navigator.userAgent) && /android/i.test(navigator.userAgent);
        return t ? BROWSER.OPERA : e ? BROWSER.FIREFOX : i ? BROWSER.SAFARI : a || s ? BROWSER.CHROME : r ? BROWSER.IE : o ? BROWSER.EDGE : n ? BROWSER.SAFARI : BROWSER.UNKNOWN
    };
function stringToArray(string) {
    var buffer = new ArrayBuffer(string.length * 2); // 2 bytes for each char
    var array = new Uint16Array(buffer);
    for (var i = 0, strLen = string.length; i < strLen; i++) {
        array[i] = string.charCodeAt(i);
    }
    return array;
}

function arrayToString(array) {
    var uint16array = new Uint16Array(array.buffer);
    return String.fromCharCode.apply(null, uint16array);
}

function base64DecodeUint8Array(input) {
    var raw = window.atob(input);
    var rawLength = raw.length;
    var array = new Uint8Array(new ArrayBuffer(rawLength));

    for (i = 0; i < rawLength; i++)
        array[i] = raw.charCodeAt(i);

    return array;
}

function getSPCUrl(initData) {
    skdurl = arrayToString(initData);
    spcurl = skdurl.replace('skd://', 'https://');
    spcurl = spcurl.substring(1, spcurl.length);
    return spcurl;
}

function base64EncodeUint8Array(input) {
    var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var output = "";
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var i = 0;

    while (i < input.length) {
        chr1 = input[i++];
        chr2 = i < input.length ? input[i++] : Number.NaN; // Not sure if the index
        chr3 = i < input.length ? input[i++] : Number.NaN; // checks are needed here

        enc1 = chr1 >> 2;
        enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
        enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
        enc4 = chr3 & 63;

        if (isNaN(chr2)) {
            enc3 = enc4 = 64;
        } else if (isNaN(chr3)) {
            enc4 = 64;
        }
        output += keyStr.charAt(enc1) + keyStr.charAt(enc2) +
            keyStr.charAt(enc3) + keyStr.charAt(enc4);
    }
    return output;
}

function waitForEvent(name, action, target) {
    target.addEventListener(name, function () {
        action(arguments[0]);
    }, false);
}

function loadCertificate() {

    var request = new XMLHttpRequest();
    request.responseType = 'arraybuffer';
    request.addEventListener('load', onCertificateLoaded, false);
    request.addEventListener('error', onCertificateError, false);
    request.open('GET', serverCertificatePath, true);
    request.setRequestHeader('Pragma', 'Cache-Control: no-cache');
    request.setRequestHeader("Cache-Control", "max-age=0");
    request.send();
}

function onCertificateLoaded(event) {

    var request = event.target;
    certificate = new Uint8Array(request.response);
    startVideo();
}

function onCertificateError(event) {
    window.console.error('Failed to retrieve the server certificate.')
}

function extractContentId(initData) {
    contentId = getSPCUrl(initData);
    var link = document.createElement('a');
    link.href = contentId;
    var query = link.search.substr(1);
    var id = query.split("&");
    var item = id[0].split("=");
    var cid = item[1];
    return cid;
}

function concatInitDataIdAndCertificate(initData, id, cert) {
    if (typeof id == "string")
        id = stringToArray(id);
    var offset = 0;
    var buffer = new ArrayBuffer(initData.byteLength + 4 + id.byteLength + 4 + cert.byteLength);
    var dataView = new DataView(buffer);

    var initDataArray = new Uint8Array(buffer, offset, initData.byteLength);
    initDataArray.set(initData);
    offset += initData.byteLength;

    dataView.setUint32(offset, id.byteLength, true);
    offset += 4;

    var idArray = new Uint8Array(buffer, offset, id.byteLength);
    idArray.set(id);
    offset += idArray.byteLength;

    dataView.setUint32(offset, cert.byteLength, true);
    offset += 4;

    var certArray = new Uint8Array(buffer, offset, cert.byteLength);
    certArray.set(cert);

    return new Uint8Array(buffer, 0, buffer.byteLength);
}

function selectKeySystem() {
    if (WebKitMediaKeys.isTypeSupported("com.apple.fps.1_0", "video/mp4")) {
        keySystem = "com.apple.fps.1_0";
    }
    else {
        throw "Key System not supported";
    }
}

function startVideo() {
    // Video
    var video = document.getElementById("videoplayer");
    video.src = playbackurl;
    video.play();
}
function onerror(event) {
    window.console.error('A video playback error occurred')
}

function onneedkey(event) {


    var video = event.target;

    var initData = event.initData;
    var contentData = extractContentId(initData);

    var destUrl = getSPCUrl(initData);

    initData = concatInitDataIdAndCertificate(initData, contentData, certificate);

    if (!video.webkitKeys) {
        selectKeySystem();
        video.webkitSetMediaKeys(new WebKitMediaKeys(keySystem));
    }

    if (!video.webkitKeys)
        throw "Could not create MediaKeys";

    var keySession = video.webkitKeys.createSession("video/mp4", initData);
    if (!keySession)
        throw "Could not create key session";
    keySession.contentId = contentData;
    keySession.destinationURL = destUrl;
    waitForEvent('webkitkeymessage', licenseRequestReady, keySession);
    waitForEvent('webkitkeyadded', onkeyadded, keySession);
    waitForEvent('webkitkeyerror', onkeyerror, keySession);
}

function licenseRequestReady(event) {
    var session = event.target;
    var message = event.message;
    var request = new XMLHttpRequest();
    request.responseType = 'json';
    request.session = session;
    request.addEventListener('load', licenseRequestLoaded, false);
    request.addEventListener('error', licenseRequestFailed, false);
    var payload = {};
    payload["spc"] = base64EncodeUint8Array(message);
    payload["assetId"] = session.contentId;
    payload["cai"] = "test123";
    request.open('POST', session.destinationURL, true);
    request.send(JSON.stringify(payload));
}

function licenseRequestLoaded(event) {
    var request = event.target;
    var session = request.session;
    var resp = request.response;
    if (request.status == 200) {
        var key = base64DecodeUint8Array(resp['ckc']);
        session.update(key);
    }
    else {
        licenseRequestFailed(event)
    }
}

function licenseRequestFailed(event) {
    ex = JSON.stringify(event.target.response);
    window.console.error(ex);
}

function onkeyerror(event) {
    window.console.error('A decryption key error was encountered');
}

function onkeyadded(event) {
    window.console.log('Decryption key was added to session.');
}

function onloadeddata(event) {
    //log("media started");
}

window.onload = function () {
    function getBrowserImage(selectedBrowser) {
        switch (selectedBrowser) {
            case BROWSER.CHROME:
                return 'CHROME';
            case BROWSER.EDGE:
                return 'Edge';
            case BROWSER.FIREFOX:
                return 'Firefox';
            case BROWSER.IE:
                return 'IE';
            case BROWSER.OPERA:
                return 'Opera';
            case BROWSER.SAFARI:
                return 'Safari';
            case BROWSER.UNKNOWN:
            default:
                return 'Desconocido'
        }
    }
    function quitarClase() {
        var element = document.getElementById("videoplayer");
        element.classList.remove("video-js");
        /*
        _0x21cfx54['classList']['remove']('video-jss')
        _0x21cfx54['classList']['remove']('video-jss')
        _0x21cfx54['classList']['add']('autoplay')
        
        */
    }
    function obtener_data(sistema) {
        if (sistema == "Safari") {
            quitarClase();
            var xmlhttp_safari = new XMLHttpRequest();
            xmlhttp_safari.onreadystatechange = function () {
                if (this.readyState == 4 && this.status == 200) {
                    var myObj = JSON.parse(this.responseText);
                    certificate = myObj.drm.fairplayCertificateURL;
                    playbackurl = myObj.playURL;
                    //$("video").removeClass("video-js");
                    serverCertificatePath = certificate;
                    loadCertificate();
                }
            };
            
            xmlhttp_safari.open("GET", "https://content.uplynk.com/api/v3/preplay/channel/09c1181b216d4131ba54ead8cc9601a1.json?rmt=fps&repl=aboi&pp2ip=0", true);
            xmlhttp_safari.send();
        }
        if (sistema == "CHROME" || sistema == "Edge" || sistema == "IE" || sistema == "Firefox" || sistema == "Opera") {
            var xmlhttp_chrome = new XMLHttpRequest();
            xmlhttp_chrome.onreadystatechange = function () {
                if (this.readyState == 4 && this.status == 200) {
                    var myObj = JSON.parse(this.responseText);
                    licencia_wide = myObj.drm.widevineLicenseURL;
                    licencia_play = myObj.drm.playreadyLicenseURL;
                    playbackurl = myObj.playURL;
                    (function (videojs) {
                        var player = window.player = videojs('videoplayer');
                        var src = {
                            src: playbackurl,
                            type: 'application/dash+xml'
                        };
                        if (licencia_wide) {
                            src.keySystemOptions = [];
                            if (licencia_wide) {
                                src.keySystemOptions.push({
                                    name: 'com.widevine.alpha',
                                    options: {
                                        serverURL: licencia_wide,
                                        audioRobustness: "SW_SECURE_CRYPTO",
                                        videoRobustness: "SW_SECURE_DECODE"
                                    }
                                });
                            }
                        }
                        if (licencia_play) {
                            src.keySystemOptions.push({
                                name: 'com.microsoft.playready',
                                options: {
                                    serverURL: licencia_play,
                                    audioRobustness: "SW_SECURE_CRYPTO",
                                    videoRobustness: "SW_SECURE_DECODE"
                                }
                            });
                        }
                        player.src(src);
                        player.play();
                        return false;
                    })(window.videojs);
                }
            };
            //xmlhttp_chrome.open("GET", "https://content.uplynk.com/api/v3/preplay/channel/2db51574d3d64d749804f40c13e0dc12.json?manifest=mpd&delay=40", true);

            xmlhttp_chrome.open("GET", "https://content.uplynk.com/api/v3/preplay/channel/09c1181b216d4131ba54ead8cc9601a1.json?manifest=mpd&repl=aboi&pp2ip=0", true);
            xmlhttp_chrome.send();
        }
    } 
    obtener_data(getBrowserImage(getBrowser()));
    
    //obtener_data(getBrowserImage(getBrowser()));
    //obtener_data(getBrowserImage(getBrowser()));
    var video = document.getElementById("videoplayer");
    video.addEventListener('webkitneedkey', onneedkey, false);
    video.addEventListener('error', onerror, false);
}