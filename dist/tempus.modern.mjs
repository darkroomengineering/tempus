let t=0;class i{constructor(t=Infinity){this.callbacks=[],this.fps=t,this.now=performance.now(),this.lastTickDate=performance.now()}get executionTime(){return 1e3/this.fps}dispatch(t,i){for(let e=0;e<this.callbacks.length;e++)this.callbacks[e].callback(t,i)}raf(t,i){if(this.now+=i,Infinity===this.fps)this.dispatch(t,i);else if(this.now>=this.executionTime){this.now=this.now%this.executionTime;const i=t-this.lastTickDate;this.lastTickDate=t,this.dispatch(t,i)}}add({callback:i,priority:e}){const s=t++;return this.callbacks.push({callback:i,priority:e,uid:s}),this.callbacks.sort((t,i)=>t.priority-i.priority),()=>this.remove(s)}remove(t){this.callbacks=this.callbacks.filter(({uid:i})=>t!==i)}}var e="undefined"!=typeof window&&new class{constructor(){this.raf=t=>{requestAnimationFrame(this.raf,!0);const i=t-this.now;this.now=t;for(const e of Object.values(this.framerates))e.raf(t,i)},this.framerates={},this.now=performance.now(),requestAnimationFrame(this.raf)}add(t,{priority:e=0,fps:s=Infinity}={}){if("number"==typeof s)return this.framerates[s]||(this.framerates[s]=new i(s)),this.framerates[s].add({callback:t,priority:e})}remove(t,{fps:i=Infinity}={}){"number"==typeof i&&this.framerates[i].remove(t)}patch(){console.log("Tempus is taking over the rAf");const t=window.requestAnimationFrame,i=window.cancelAnimationFrame;window.requestAnimationFrame=(i,{priority:e=0,fps:s=Infinity}={})=>{if(i===this.raf)return t(i);if(!i.patched){const t=this.add(i,{priority:e,fps:s});i.patched=!0,i.remove=t}return i.remove},window.cancelAnimationFrame=t=>("function"==typeof t&&(null==t||t()),i(t))}};export{e as default};
//# sourceMappingURL=tempus.modern.mjs.map
