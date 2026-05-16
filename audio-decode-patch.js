(function () {
  function patchWebAudioDecode() {
    var Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor || !Ctor.prototype || Ctor.prototype.__unityWebglAudioPatched) return;
    var nativeDecode = Ctor.prototype.decodeAudioData;
    Ctor.prototype.decodeAudioData = function (audioData, successCallback, errorCallback) {
      var ctx = this;
      var onSuccess = function (buffer) {
        if (typeof successCallback === "function") successCallback(buffer);
        return buffer;
      };
      var onFailure = function (err) {
        console.warn("[WebGL] decodeAudioData failed; using silent buffer.", err);
        try {
          var rate = ctx.sampleRate || 44100;
          var frames = Math.max(1, (rate / 20) | 0);
          var silent = ctx.createBuffer(1, frames, rate);
          return onSuccess(silent);
        } catch (inner) {
          if (typeof errorCallback === "function") errorCallback(err);
          throw err;
        }
      };
      try {
        var ret = nativeDecode.call(ctx, audioData, onSuccess, onFailure);
        if (ret && typeof ret.then === "function") {
          return ret.then(onSuccess, onFailure);
        }
        return ret;
      } catch (err) {
        return onFailure(err);
      }
    };
    Ctor.prototype.__unityWebglAudioPatched = true;
  }
  patchWebAudioDecode();
})();
