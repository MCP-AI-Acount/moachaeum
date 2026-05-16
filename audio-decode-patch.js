(function () {
  var contexts = [];

  function makeSilentBuffer(ctx) {
    var rate = ctx.sampleRate || 44100;
    var frames = Math.max(1, (rate / 20) | 0);
    return ctx.createBuffer(1, frames, rate);
  }

  function wrapCtor(Orig) {
    if (!Orig || Orig.__unityWebglPatchedCtor) return Orig;
    function PatchedAudioContext() {
      var ctx = new Orig();
      contexts.push(ctx);
      return ctx;
    }
    PatchedAudioContext.prototype = Orig.prototype;
    PatchedAudioContext.__unityWebglPatchedCtor = true;
    return PatchedAudioContext;
  }

  function patchWebAudioDecode() {
    var Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor || !Ctor.prototype || Ctor.prototype.__unityWebglAudioPatched) return;

    if (window.AudioContext) window.AudioContext = wrapCtor(window.AudioContext);
    if (window.webkitAudioContext) window.webkitAudioContext = wrapCtor(window.webkitAudioContext);
    Ctor = window.AudioContext || window.webkitAudioContext;

    var nativeDecode = Ctor.prototype.decodeAudioData;
    Ctor.prototype.decodeAudioData = function (audioData, successCallback, errorCallback) {
      var ctx = this;

      function deliverSuccess(buffer) {
        if (typeof successCallback === "function") successCallback(buffer);
        return buffer;
      }

      function deliverFailure(err) {
        console.warn("[WebGL] decodeAudioData failed; using silent buffer.", err);
        try {
          return deliverSuccess(makeSilentBuffer(ctx));
        } catch (inner) {
          if (typeof errorCallback === "function") errorCallback(err);
          throw err;
        }
      }

      try {
        if (arguments.length <= 1) {
          var promiseOnly = nativeDecode.call(ctx, audioData);
          if (promiseOnly && typeof promiseOnly.then === "function") {
            return promiseOnly.then(deliverSuccess, deliverFailure);
          }
          return promiseOnly;
        }

        var ret = nativeDecode.call(ctx, audioData, deliverSuccess, deliverFailure);
        if (ret && typeof ret.then === "function") {
          return ret.then(deliverSuccess, deliverFailure);
        }
        return ret;
      } catch (err) {
        if (arguments.length <= 1) {
          return Promise.resolve(makeSilentBuffer(ctx));
        }
        return deliverFailure(err);
      }
    };
    Ctor.prototype.__unityWebglAudioPatched = true;
  }

  window.resumeUnityWebAudioFromGesture = function () {
    for (var i = 0; i < contexts.length; i++) {
      var ctx = contexts[i];
      if (ctx && ctx.state === "suspended") {
        try {
          ctx.resume();
        } catch (e) {}
      }
    }
  };

  patchWebAudioDecode();
})();
