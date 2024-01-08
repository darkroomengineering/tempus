(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.$npm_package_name = factory());
})(this, (function () {
  var Tempus = /*#__PURE__*/function () {
    function Tempus() {
      var _this = this;
      this.raf = function (now) {
        requestAnimationFrame(_this.raf);
        var deltaTime = now - _this.now;
        _this.now = now;
        for (var i = 0; i < _this.callbacks.length; i++) {
          _this.callbacks[i].callback(now, deltaTime);
        }
      };
      this.callbacks = [];
      this.now = performance.now();
      requestAnimationFrame(this.raf);
    }
    var _proto = Tempus.prototype;
    _proto.add = function add(callback, priority) {
      var _this2 = this;
      if (priority === void 0) {
        priority = 0;
      }
      this.callbacks.push({
        callback: callback,
        priority: priority
      });
      this.callbacks.sort(function (a, b) {
        return a.priority - b.priority;
      });
      return function () {
        return _this2.remove(callback);
      };
    };
    _proto.remove = function remove(callback) {
      this.callbacks = this.callbacks.filter(function (_ref) {
        var cb = _ref.callback;
        return callback !== cb;
      });
    };
    return Tempus;
  }();
  var isClient = typeof window !== 'undefined';
  var index = isClient && new Tempus();

  return index;

}));
