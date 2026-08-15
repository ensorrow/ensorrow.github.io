(function () {
  "use strict";

  document.documentElement.classList.remove("no-js");
  document.documentElement.classList.add("js");

  var layers = Array.prototype.slice.call(document.querySelectorAll(".scene-layer"));
  var videos = layers.map(function (layer) { return layer.querySelector("video"); });
  var steps = Array.prototype.slice.call(document.querySelectorAll(".step"));
  var scrolly = document.getElementById("scrolly");
  var currentLabel = document.getElementById("scene-current");
  var progressBar = document.getElementById("progress-bar");
  var videoRetry = document.getElementById("video-retry");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var activeIndex = 0;
  var storyIsVisible = false;

  function setVideoRetryVisible(visible) {
    videoRetry.hidden = !visible;
  }

  function isActiveVideo(video) {
    return video === videos[activeIndex];
  }

  function setVideoState(video, shouldPlay, restart) {
    if (!video) return Promise.resolve(false);

    if (!shouldPlay || reduceMotion || document.hidden) {
      video.pause();
      video.classList.remove("is-playing");
      if (isActiveVideo(video)) setVideoRetryVisible(false);
      return Promise.resolve(false);
    }

    // Set both the DOM attributes and media properties before every play attempt.
    // Older WebKit versions inspect these flags at play() time.
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");

    if (restart) {
      try { video.currentTime = 0; } catch (error) { /* Metadata may not be ready yet. */ }
    }

    var promise;
    try {
      promise = video.play();
    } catch (error) {
      video.classList.remove("is-playing");
      if (isActiveVideo(video) && storyIsVisible) setVideoRetryVisible(true);
      return Promise.resolve(false);
    }

    if (promise && typeof promise.then === "function") {
      window.setTimeout(function () {
        if (isActiveVideo(video) && storyIsVisible && !video.classList.contains("is-playing")) {
          setVideoRetryVisible(true);
        }
      }, 2500);

      return promise.then(function () {
        if (!video.paused) video.classList.add("is-playing");
        if (isActiveVideo(video)) setVideoRetryVisible(false);
        return !video.paused;
      }).catch(function () {
        video.classList.remove("is-playing");
        if (isActiveVideo(video) && storyIsVisible) setVideoRetryVisible(true);
        return false;
      });
    }

    var isPlaying = !video.paused;
    video.classList.toggle("is-playing", isPlaying);
    if (isActiveVideo(video)) setVideoRetryVisible(!isPlaying && storyIsVisible);
    return Promise.resolve(isPlaying);
  }

  function activateScene(index, restart) {
    if (index < 0 || index >= layers.length) return;
    var changed = index !== activeIndex;
    activeIndex = index;
    setVideoRetryVisible(false);

    layers.forEach(function (layer, layerIndex) {
      layer.classList.toggle("is-active", layerIndex === index);
      setVideoState(videos[layerIndex], storyIsVisible && layerIndex === index, Boolean(restart && changed));
    });

    steps.forEach(function (step, stepIndex) {
      step.classList.toggle("is-active", stepIndex === index);
    });

    currentLabel.textContent = String(index + 1).padStart(2, "0");
  }

  activateScene(0, false);

  videos.forEach(function (video) {
    if (!video) return;
    video.defaultMuted = true;
    video.addEventListener("playing", function () {
      video.classList.add("is-playing");
      if (isActiveVideo(video)) setVideoRetryVisible(false);
    });
    video.addEventListener("pause", function () {
      video.classList.remove("is-playing");
    });
    video.addEventListener("error", function () {
      if (isActiveVideo(video) && storyIsVisible && !reduceMotion) setVideoRetryVisible(true);
    });
  });

  videoRetry.addEventListener("click", function () {
    var video = videos[activeIndex];
    if (!video) return;
    video.preload = "auto";
    setVideoState(video, true, false);
  });

  if ("IntersectionObserver" in window) {
    var storyObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        storyIsVisible = entry.isIntersecting;
        setVideoState(videos[activeIndex], storyIsVisible, false);
      });
    }, { threshold: 0.02 });
    storyObserver.observe(scrolly);

    var preloadObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var index = Number(entry.target.getAttribute("data-step"));
        var video = videos[index];
        if (video && video.preload !== "auto") {
          video.preload = "auto";
          video.load();
        }
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "120% 0px" });
    steps.forEach(function (step) { preloadObserver.observe(step); });
  }

  if (typeof window.scrollama === "function") {
    var scroller = window.scrollama();
    scroller.setup({ step: ".step", offset: 0.62, debug: false })
      .onStepEnter(function (response) { activateScene(response.index, true); });
    window.addEventListener("resize", function () { scroller.resize(); });
  } else if ("IntersectionObserver" in window) {
    var stepObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          activateScene(Number(entry.target.getAttribute("data-step")), true);
        }
      });
    }, { rootMargin: "-38% 0px -38%", threshold: 0 });
    steps.forEach(function (step) { stepObserver.observe(step); });
  } else {
    steps.forEach(function (step) { step.classList.add("is-active"); });
  }

  function updateProgress() {
    var scrollTop = window.scrollY || document.documentElement.scrollTop;
    var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    var progress = maxScroll > 0 ? Math.min(100, (scrollTop / maxScroll) * 100) : 0;
    progressBar.style.width = progress + "%";
  }

  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();

  document.addEventListener("visibilitychange", function () {
    setVideoState(videos[activeIndex], storyIsVisible, false);
  });

  var backgroundAudio = document.getElementById("bg-music");
  var audioControl = document.getElementById("audio-control");
  var audioToggle = document.getElementById("audio-toggle");
  var audioLabel = document.getElementById("audio-label");
  var enterButton = document.getElementById("enter-button");

  backgroundAudio.volume = 0.34;

  function updateAudioUI(isPlaying, label) {
    audioControl.classList.toggle("is-playing", isPlaying);
    audioToggle.setAttribute("aria-pressed", isPlaying ? "true" : "false");
    audioToggle.setAttribute("aria-label", isPlaying ? "暂停背景音乐" : "播放背景音乐");
    audioLabel.textContent = label || (isPlaying ? "音乐播放中" : "音乐已暂停");
  }

  function playAudio() {
    var promise = backgroundAudio.play();
    if (promise && typeof promise.then === "function") {
      return promise.then(function () {
        updateAudioUI(true);
        return true;
      }).catch(function () {
        updateAudioUI(false, "点击开启音乐");
        return false;
      });
    }
    updateAudioUI(!backgroundAudio.paused);
    return Promise.resolve(!backgroundAudio.paused);
  }

  audioToggle.addEventListener("click", function () {
    if (backgroundAudio.paused) {
      if (!letterSong.paused) {
        letterSong.pause();
        updateSongUI(false, "歌曲已暂停");
      }
      playAudio();
    } else {
      backgroundAudio.pause();
      updateAudioUI(false);
    }
  });

  enterButton.addEventListener("click", function () {
    // Start the visible scene in the user gesture, but never block navigation on
    // downloading every remote video. Other scenes stay lazy-loaded and muted.
    var video = videos[activeIndex];
    if (video && !reduceMotion) {
      video.preload = "auto";
      setVideoState(video, true, false);
    }
    playAudio();
    scrolly.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  });

  backgroundAudio.addEventListener("pause", function () {
    if (backgroundAudio.ended) return;
    updateAudioUI(false);
  });

  var songPage = document.getElementById("song");
  var letterSong = document.getElementById("letter-song");
  var songPlay = document.getElementById("song-play");
  var songProgress = document.getElementById("song-progress");
  var songCurrent = document.getElementById("song-current");
  var songDuration = document.getElementById("song-duration");
  var songStatus = document.getElementById("song-status");

  function formatTime(value) {
    if (!Number.isFinite(value) || value < 0) return "00:00";
    var minutes = Math.floor(value / 60);
    var seconds = Math.floor(value % 60);
    return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
  }

  function updateSongUI(isPlaying, status) {
    songPlay.classList.toggle("is-playing", isPlaying);
    songPlay.setAttribute("aria-pressed", isPlaying ? "true" : "false");
    songPlay.setAttribute("aria-label", isPlaying ? "暂停《往后的日子》" : "播放《往后的日子》");
    songStatus.textContent = status || (isPlaying ? "《往后的日子》正在播放" : "歌曲已暂停");
  }

  function updateSongProgress() {
    var duration = Number.isFinite(letterSong.duration) ? letterSong.duration : 0;
    var percent = duration > 0 ? (letterSong.currentTime / duration) * 100 : 0;
    songProgress.value = percent;
    songProgress.style.setProperty("--song-progress", percent + "%");
    songCurrent.textContent = formatTime(letterSong.currentTime);
    if (duration > 0) songDuration.textContent = formatTime(duration);
  }

  songPlay.addEventListener("click", function () {
    if (letterSong.paused) {
      if (!backgroundAudio.paused) {
        backgroundAudio.pause();
        updateAudioUI(false, "背景音乐已暂停");
      }
      var promise = letterSong.play();
      if (promise && typeof promise.then === "function") {
        promise.then(function () {
          updateSongUI(true);
        }).catch(function () {
          updateSongUI(false, "请再次点击播放");
        });
      }
    } else {
      letterSong.pause();
      updateSongUI(false);
    }
  });

  songProgress.addEventListener("input", function () {
    if (!Number.isFinite(letterSong.duration)) return;
    letterSong.currentTime = (Number(songProgress.value) / 100) * letterSong.duration;
    updateSongProgress();
  });

  letterSong.addEventListener("loadedmetadata", updateSongProgress);
  letterSong.addEventListener("timeupdate", updateSongProgress);
  letterSong.addEventListener("ended", function () {
    updateSongUI(false, "这首歌播放完了");
    updateSongProgress();
  });

  if ("IntersectionObserver" in window) {
    var songObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.35 && !backgroundAudio.paused) {
          backgroundAudio.pause();
          updateAudioUI(false, "背景音乐已暂停");
        }
      });
    }, { threshold: [0.35] });
    songObserver.observe(songPage);
  }
})();
