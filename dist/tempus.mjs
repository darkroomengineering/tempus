var r="undefined"!=typeof window&&new(/*#__PURE__*/function(){function r(){var r=this;this.raf=function(t){requestAnimationFrame(r.raf);var a=t-r.now;r.now=t;for(var n=0;n<r.callbacks.length;n++)r.callbacks[n].callback(t,a)},this.callbacks=[],this.now=performance.now(),requestAnimationFrame(this.raf)}var t=r.prototype;return t.add=function(r,t){var a=this;return void 0===t&&(t=0),this.callbacks.push({callback:r,priority:t}),this.callbacks.sort(function(r,t){return r.priority-t.priority}),function(){return a.remove(r)}},t.remove=function(r){this.callbacks=this.callbacks.filter(function(t){return r!==t.callback})},r}());export{r as default};
//# sourceMappingURL=tempus.mjs.map
