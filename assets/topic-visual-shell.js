/* Scroll frames for topic figures.
   A .visual-frame whose diagram is wider than the frame becomes a named, keyboard-focusable
   scroll region. A frame that fits gets no extra Tab stop.
   Frames whose markup already carries tabindex keep their own role and name. */
(() => {
  "use strict";
  if (window.topicScrollFrames) return;
  window.topicScrollFrames = true;

  const states = new Map();
  let counter = 0;

  const freshId = (prefix) => {
    let id;
    do {
      counter += 1;
      id = `${prefix}-${counter}`;
    } while (document.getElementById(id));
    return id;
  };

  function nameId(frame) {
    const heading = frame.closest(".topic-example")?.querySelector(".section-title");
    const source = heading || frame.closest("figure")?.querySelector("figcaption");
    if (!source) return null;
    if (!source.id) source.id = freshId("visual-frame-name");
    return source.id;
  }

  function stateFor(frame) {
    let state = states.get(frame);
    if (state) return state;
    state = { authored: frame.hasAttribute("tabindex"), added: [], scrollable: null };
    states.set(frame, state);
    return state;
  }

  // Overflow counts only when content reaches past the frame's end padding, so a frame whose
  // padding alone is clipped by a few pixels stays a plain figure.
  function overflows(frame) {
    const endPadding = parseFloat(getComputedStyle(frame).paddingInlineEnd) || 0;
    return frame.scrollWidth - frame.clientWidth > endPadding + 1;
  }

  function setOnce(frame, state, name, value) {
    if (frame.hasAttribute(name)) return;
    frame.setAttribute(name, value);
    state.added.push(name);
  }

  function update(frame) {
    const state = stateFor(frame);
    const scrollable = overflows(frame);
    if (scrollable === state.scrollable) return;
    state.scrollable = scrollable;
    if (scrollable) {
      if (!state.authored) {
        setOnce(frame, state, "tabindex", "0");
        setOnce(frame, state, "role", "region");
        if (!frame.hasAttribute("aria-label")) {
          const id = nameId(frame);
          if (id) setOnce(frame, state, "aria-labelledby", id);
        }
      }
    } else {
      for (const name of state.added) frame.removeAttribute(name);
      state.added = [];
    }
  }

  let queued = false;
  function refresh() {
    queued = false;
    for (const frame of document.querySelectorAll(".visual-frame")) update(frame);
  }
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(refresh);
  }

  function init() {
    const frames = document.querySelectorAll(".visual-frame");
    if (!frames.length) return;
    const resize = "ResizeObserver" in window ? new ResizeObserver(schedule) : null;
    const watchChildren = (frame) => {
      if (!resize) return;
      resize.observe(frame);
      for (const child of frame.children) resize.observe(child);
    };
    const mutation = "MutationObserver" in window
      ? new MutationObserver(() => {
          for (const frame of frames) watchChildren(frame);
          schedule();
        })
      : null;
    for (const frame of frames) {
      watchChildren(frame);
      mutation?.observe(frame, { childList: true, subtree: true, characterData: true });
    }
    refresh();
    window.addEventListener("resize", schedule);
    window.addEventListener("load", schedule);
    document.fonts?.ready.then(schedule);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
