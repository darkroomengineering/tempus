!function(t,i){"object"==typeof exports&&"undefined"!=typeof module?module.exports=i():"function"==typeof define&&define.amd?define(i):(t||self).tempus=i()}(this,function(){var t=0,i=/*#__PURE__*/function(){function i(t){void 0===t&&(t=Infinity),this.callbacks=[],this.fps=t,this.time=0,this.lastTickDate=performance.now()}var e,r,n=i.prototype;return n.dispatch=function(t,i){for(var e=0;e<this.callbacks.length;e++)this.callbacks[e].callback(t,i)},n.raf=function(t,i){if(this.time+=i,Infinity===this.fps)this.dispatch(t,i);else if(this.time>=this.executionTime){this.time=this.time%this.executionTime;var e=t-this.lastTickDate;this.lastTickDate=t,this.dispatch(t,e)}},n.add=function(i){var e=this,r=t++;return this.callbacks.push({callback:i.callback,priority:i.priority,uid:r}),this.callbacks.sort(function(t,i){return t.priority-i.priority}),function(){return e.remove(r)}},n.remove=function(t){this.callbacks=this.callbacks.filter(function(i){return t!==i.uid})},e=i,(r=[{key:"executionTime",get:function(){return 1e3/this.fps}}])&&function(t,i){for(var e=0;e<i.length;e++){var r=i[e];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(t,"symbol"==typeof(n=function(t,i){if("object"!=typeof t||null===t)return t;var e=t[Symbol.toPrimitive];if(void 0!==e){var r=e.call(t,"string");if("object"!=typeof r)return r;throw new TypeError("@@toPrimitive must return a primitive value.")}return String(t)}(r.key))?n:String(n),r)}var n}(e.prototype,r),Object.defineProperty(e,"prototype",{writable:!1}),i}(),e=/*#__PURE__*/function(){function t(){var t=this;this.raf=function(i){requestAnimationFrame(t.raf,!0);var e=i-t.time;t.time=i;for(var r=0,n=Object.values(t.framerates);r<n.length;r++)n[r].raf(i,e)},this.framerates={},this.time=performance.now(),requestAnimationFrame(this.raf)}var e=t.prototype;return e.add=function(t,e){var r=void 0===e?{}:e,n=r.priority,a=void 0===n?0:n,o=r.fps,f=void 0===o?Infinity:o;if("number"==typeof f)return this.framerates[f]||(this.framerates[f]=new i(f)),this.framerates[f].add({callback:t,priority:a})},e.patch=function(){var t=this,i=window.requestAnimationFrame,e=window.cancelAnimationFrame;window.requestAnimationFrame=function(e,r){var n=void 0===r?{}:r,a=n.priority,o=void 0===a?0:a,f=n.fps,s=void 0===f?Infinity:f;if(e===t.raf)return i(e);if(!e.patched){var c=t.add(e,{priority:o,fps:s});e.patched=!0,e.remove=c}return e.remove},window.cancelAnimationFrame=function(t){return"function"==typeof t&&(null==t||t()),e(t)}},t}();return"undefined"!=typeof window&&new e});
//# sourceMappingURL=tempus.umd.js.map
