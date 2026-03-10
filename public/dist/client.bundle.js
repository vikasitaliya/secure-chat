var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/@juspay-tech/hyper-js/dist/index.mjs
function f(r) {
  if (!(r !== null && r.BS_PRIVATE_NESTED_SOME_NONE !== void 0)) return r;
  var e = r.BS_PRIVATE_NESTED_SOME_NONE;
  if (e !== 0) return { BS_PRIVATE_NESTED_SOME_NONE: e - 1 | 0 };
}
function h(r, e) {
  if (r <= 0) return [];
  for (var n = new Array(r), t = 0; t < r; ++t) n[t] = e;
  return n;
}
function H(r) {
  var e = Object.prototype.toString.call(r);
  switch (e) {
    case "[object Array]":
      return { TAG: "Array", _0: r };
    case "[object Boolean]":
      return { TAG: "Bool", _0: r };
    case "[object Null]":
      return "Null";
    case "[object Number]":
      return { TAG: "Number", _0: r };
    case "[object String]":
      return { TAG: "String", _0: r };
    default:
      return { TAG: "Object", _0: r };
  }
}
function F(r) {
  if (typeof r == "boolean") return r;
}
function L(r) {
  if (r === null) return null;
}
function W(r) {
  if (typeof r == "string") return r;
}
function x(r) {
  if (typeof r == "number") return r;
}
function V(r) {
  if (typeof r == "object" && !Array.isArray(r) && r !== null) return r;
}
function q(r) {
  if (Array.isArray(r)) return r;
}
function G(r) {
  return Math.floor(r) | 0;
}
function z(r, e) {
  var n = Math.random() * (e - r | 0);
  return (Math.floor(n) | 0) + r | 0;
}
function E(r, e, n) {
  return r.reduce(n, e);
}
function C(r, e) {
  if (r !== void 0) return e(f(r));
}
function o(r, e) {
  return r !== void 0 ? f(r) : e;
}
function I() {
  var r = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return E(h(32, 0), "", function(e, n) {
    var t = w.random(0, r.length), c = r.charAt(t);
    return e + c;
  });
}
function O(r) {
  var e = r !== void 0 ? o(i.object(r), {}) : {}, n = e.env;
  if (n === void 0) return "";
  var t = i.string(n);
  return t !== void 0 ? t.toLowerCase() : "";
}
function N(r) {
  var e = r !== void 0 ? o(i.object(r), {}) : {}, n = e.version;
  if (n === void 0) return "";
  var t = i.string(n);
  return t !== void 0 ? t.toLowerCase() : "";
}
function Y(r, e) {
  var n = y.classify(r), t;
  if (typeof n != "object") t = "";
  else switch (n.TAG) {
    case "String":
      t = n._0;
      break;
    case "Object":
      t = o(C(n._0.publishableKey, i.string), "");
      break;
    default:
      t = "";
  }
  return new Promise(function(c, S) {
    var b = I(), T = Date.now(), v = N(e), U = O(e), u, l = 0;
    switch (U) {
      case "prod":
        switch (v) {
          case "v1":
            u = "https://checkout.hyperswitch.io/v0/HyperLoader.js";
            break;
          case "v2":
            u = "https://checkout.hyperswitch.io/v2/HyperLoader.js";
            break;
          default:
            l = 1;
        }
        break;
      case "sandbox":
        switch (v) {
          case "v1":
            u = "https://beta.hyperswitch.io/v1/HyperLoader.js";
            break;
          case "v2":
            u = "https://beta.hyperswitch.io/v2/HyperLoader.js";
            break;
          default:
            l = 1;
        }
        break;
      default:
        l = 1;
    }
    l === 1 && (u = v === "v2" ? t.startsWith("pk_prd_") ? "https://checkout.hyperswitch.io/v2/HyperLoader.js" : "https://beta.hyperswitch.io/v2/HyperLoader.js" : t.startsWith("pk_prd_") ? "https://checkout.hyperswitch.io/v0/HyperLoader.js" : "https://beta.hyperswitch.io/v1/HyperLoader.js");
    var m = Object.fromEntries([["sessionID", b], ["timeStamp", T.toString()]]);
    if (document.querySelectorAll('script[src="' + u + '"]').length === 0) {
      var a = document.createElement("script");
      a.src = u, a.onload = function() {
        var s = window.Hyper;
        if (s != null) return c(s(r, e, m));
      }, a.onerror = function(s) {
        S(s);
      }, document.body.appendChild(a);
      return;
    }
    console.warn("INTEGRATION WARNING: There is already an existing script tag for " + u + ". Multiple additions of HyperLoader.js is not permitted, please add it on the top level only once.");
    var d = window.Hyper;
    if (d != null) return c(d(r, e, m));
  });
}
var y, i, w;
var init_dist = __esm({
  "node_modules/@juspay-tech/hyper-js/dist/index.mjs"() {
    y = { classify: H };
    i = { bool: F, $$null: L, string: W, $$float: x, object: V, array: q };
    w = { floor: G, random: z };
  }
});

// node_modules/@capacitor/core/dist/index.js
var ExceptionCode, CapacitorException, getPlatformId, createCapacitor, initCapacitorGlobal, Capacitor2, registerPlugin, WebPlugin, encode, decode, CapacitorCookiesPluginWeb, CapacitorCookies, readBlobAsBase64, normalizeHttpHeaders, buildUrlParams, buildRequestInit, CapacitorHttpPluginWeb, CapacitorHttp, SystemBarsStyle, SystemBarType, SystemBarsPluginWeb, SystemBars;
var init_dist2 = __esm({
  "node_modules/@capacitor/core/dist/index.js"() {
    (function(ExceptionCode2) {
      ExceptionCode2["Unimplemented"] = "UNIMPLEMENTED";
      ExceptionCode2["Unavailable"] = "UNAVAILABLE";
    })(ExceptionCode || (ExceptionCode = {}));
    CapacitorException = class extends Error {
      constructor(message, code, data) {
        super(message);
        this.message = message;
        this.code = code;
        this.data = data;
      }
    };
    getPlatformId = (win) => {
      var _a, _b;
      if (win === null || win === void 0 ? void 0 : win.androidBridge) {
        return "android";
      } else if ((_b = (_a = win === null || win === void 0 ? void 0 : win.webkit) === null || _a === void 0 ? void 0 : _a.messageHandlers) === null || _b === void 0 ? void 0 : _b.bridge) {
        return "ios";
      } else {
        return "web";
      }
    };
    createCapacitor = (win) => {
      const capCustomPlatform = win.CapacitorCustomPlatform || null;
      const cap = win.Capacitor || {};
      const Plugins = cap.Plugins = cap.Plugins || {};
      const getPlatform = () => {
        return capCustomPlatform !== null ? capCustomPlatform.name : getPlatformId(win);
      };
      const isNativePlatform = () => getPlatform() !== "web";
      const isPluginAvailable = (pluginName) => {
        const plugin = registeredPlugins.get(pluginName);
        if (plugin === null || plugin === void 0 ? void 0 : plugin.platforms.has(getPlatform())) {
          return true;
        }
        if (getPluginHeader(pluginName)) {
          return true;
        }
        return false;
      };
      const getPluginHeader = (pluginName) => {
        var _a;
        return (_a = cap.PluginHeaders) === null || _a === void 0 ? void 0 : _a.find((h2) => h2.name === pluginName);
      };
      const handleError = (err) => win.console.error(err);
      const registeredPlugins = /* @__PURE__ */ new Map();
      const registerPlugin2 = (pluginName, jsImplementations = {}) => {
        const registeredPlugin = registeredPlugins.get(pluginName);
        if (registeredPlugin) {
          console.warn(`Capacitor plugin "${pluginName}" already registered. Cannot register plugins twice.`);
          return registeredPlugin.proxy;
        }
        const platform = getPlatform();
        const pluginHeader = getPluginHeader(pluginName);
        let jsImplementation;
        const loadPluginImplementation = async () => {
          if (!jsImplementation && platform in jsImplementations) {
            jsImplementation = typeof jsImplementations[platform] === "function" ? jsImplementation = await jsImplementations[platform]() : jsImplementation = jsImplementations[platform];
          } else if (capCustomPlatform !== null && !jsImplementation && "web" in jsImplementations) {
            jsImplementation = typeof jsImplementations["web"] === "function" ? jsImplementation = await jsImplementations["web"]() : jsImplementation = jsImplementations["web"];
          }
          return jsImplementation;
        };
        const createPluginMethod = (impl, prop) => {
          var _a, _b;
          if (pluginHeader) {
            const methodHeader = pluginHeader === null || pluginHeader === void 0 ? void 0 : pluginHeader.methods.find((m) => prop === m.name);
            if (methodHeader) {
              if (methodHeader.rtype === "promise") {
                return (options) => cap.nativePromise(pluginName, prop.toString(), options);
              } else {
                return (options, callback) => cap.nativeCallback(pluginName, prop.toString(), options, callback);
              }
            } else if (impl) {
              return (_a = impl[prop]) === null || _a === void 0 ? void 0 : _a.bind(impl);
            }
          } else if (impl) {
            return (_b = impl[prop]) === null || _b === void 0 ? void 0 : _b.bind(impl);
          } else {
            throw new CapacitorException(`"${pluginName}" plugin is not implemented on ${platform}`, ExceptionCode.Unimplemented);
          }
        };
        const createPluginMethodWrapper = (prop) => {
          let remove;
          const wrapper = (...args) => {
            const p = loadPluginImplementation().then((impl) => {
              const fn = createPluginMethod(impl, prop);
              if (fn) {
                const p2 = fn(...args);
                remove = p2 === null || p2 === void 0 ? void 0 : p2.remove;
                return p2;
              } else {
                throw new CapacitorException(`"${pluginName}.${prop}()" is not implemented on ${platform}`, ExceptionCode.Unimplemented);
              }
            });
            if (prop === "addListener") {
              p.remove = async () => remove();
            }
            return p;
          };
          wrapper.toString = () => `${prop.toString()}() { [capacitor code] }`;
          Object.defineProperty(wrapper, "name", {
            value: prop,
            writable: false,
            configurable: false
          });
          return wrapper;
        };
        const addListener = createPluginMethodWrapper("addListener");
        const removeListener = createPluginMethodWrapper("removeListener");
        const addListenerNative = (eventName, callback) => {
          const call = addListener({ eventName }, callback);
          const remove = async () => {
            const callbackId = await call;
            removeListener({
              eventName,
              callbackId
            }, callback);
          };
          const p = new Promise((resolve) => call.then(() => resolve({ remove })));
          p.remove = async () => {
            console.warn(`Using addListener() without 'await' is deprecated.`);
            await remove();
          };
          return p;
        };
        const proxy = new Proxy({}, {
          get(_, prop) {
            switch (prop) {
              // https://github.com/facebook/react/issues/20030
              case "$$typeof":
                return void 0;
              case "toJSON":
                return () => ({});
              case "addListener":
                return pluginHeader ? addListenerNative : addListener;
              case "removeListener":
                return removeListener;
              default:
                return createPluginMethodWrapper(prop);
            }
          }
        });
        Plugins[pluginName] = proxy;
        registeredPlugins.set(pluginName, {
          name: pluginName,
          proxy,
          platforms: /* @__PURE__ */ new Set([...Object.keys(jsImplementations), ...pluginHeader ? [platform] : []])
        });
        return proxy;
      };
      if (!cap.convertFileSrc) {
        cap.convertFileSrc = (filePath) => filePath;
      }
      cap.getPlatform = getPlatform;
      cap.handleError = handleError;
      cap.isNativePlatform = isNativePlatform;
      cap.isPluginAvailable = isPluginAvailable;
      cap.registerPlugin = registerPlugin2;
      cap.Exception = CapacitorException;
      cap.DEBUG = !!cap.DEBUG;
      cap.isLoggingEnabled = !!cap.isLoggingEnabled;
      return cap;
    };
    initCapacitorGlobal = (win) => win.Capacitor = createCapacitor(win);
    Capacitor2 = /* @__PURE__ */ initCapacitorGlobal(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : {});
    registerPlugin = Capacitor2.registerPlugin;
    WebPlugin = class {
      constructor() {
        this.listeners = {};
        this.retainedEventArguments = {};
        this.windowListeners = {};
      }
      addListener(eventName, listenerFunc) {
        let firstListener = false;
        const listeners = this.listeners[eventName];
        if (!listeners) {
          this.listeners[eventName] = [];
          firstListener = true;
        }
        this.listeners[eventName].push(listenerFunc);
        const windowListener = this.windowListeners[eventName];
        if (windowListener && !windowListener.registered) {
          this.addWindowListener(windowListener);
        }
        if (firstListener) {
          this.sendRetainedArgumentsForEvent(eventName);
        }
        const remove = async () => this.removeListener(eventName, listenerFunc);
        const p = Promise.resolve({ remove });
        return p;
      }
      async removeAllListeners() {
        this.listeners = {};
        for (const listener in this.windowListeners) {
          this.removeWindowListener(this.windowListeners[listener]);
        }
        this.windowListeners = {};
      }
      notifyListeners(eventName, data, retainUntilConsumed) {
        const listeners = this.listeners[eventName];
        if (!listeners) {
          if (retainUntilConsumed) {
            let args = this.retainedEventArguments[eventName];
            if (!args) {
              args = [];
            }
            args.push(data);
            this.retainedEventArguments[eventName] = args;
          }
          return;
        }
        listeners.forEach((listener) => listener(data));
      }
      hasListeners(eventName) {
        var _a;
        return !!((_a = this.listeners[eventName]) === null || _a === void 0 ? void 0 : _a.length);
      }
      registerWindowListener(windowEventName, pluginEventName) {
        this.windowListeners[pluginEventName] = {
          registered: false,
          windowEventName,
          pluginEventName,
          handler: (event) => {
            this.notifyListeners(pluginEventName, event);
          }
        };
      }
      unimplemented(msg = "not implemented") {
        return new Capacitor2.Exception(msg, ExceptionCode.Unimplemented);
      }
      unavailable(msg = "not available") {
        return new Capacitor2.Exception(msg, ExceptionCode.Unavailable);
      }
      async removeListener(eventName, listenerFunc) {
        const listeners = this.listeners[eventName];
        if (!listeners) {
          return;
        }
        const index = listeners.indexOf(listenerFunc);
        this.listeners[eventName].splice(index, 1);
        if (!this.listeners[eventName].length) {
          this.removeWindowListener(this.windowListeners[eventName]);
        }
      }
      addWindowListener(handle) {
        window.addEventListener(handle.windowEventName, handle.handler);
        handle.registered = true;
      }
      removeWindowListener(handle) {
        if (!handle) {
          return;
        }
        window.removeEventListener(handle.windowEventName, handle.handler);
        handle.registered = false;
      }
      sendRetainedArgumentsForEvent(eventName) {
        const args = this.retainedEventArguments[eventName];
        if (!args) {
          return;
        }
        delete this.retainedEventArguments[eventName];
        args.forEach((arg) => {
          this.notifyListeners(eventName, arg);
        });
      }
    };
    encode = (str) => encodeURIComponent(str).replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent).replace(/[()]/g, escape);
    decode = (str) => str.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent);
    CapacitorCookiesPluginWeb = class extends WebPlugin {
      async getCookies() {
        const cookies = document.cookie;
        const cookieMap = {};
        cookies.split(";").forEach((cookie) => {
          if (cookie.length <= 0)
            return;
          let [key, value] = cookie.replace(/=/, "CAP_COOKIE").split("CAP_COOKIE");
          key = decode(key).trim();
          value = decode(value).trim();
          cookieMap[key] = value;
        });
        return cookieMap;
      }
      async setCookie(options) {
        try {
          const encodedKey = encode(options.key);
          const encodedValue = encode(options.value);
          const expires = options.expires ? `; expires=${options.expires.replace("expires=", "")}` : "";
          const path = (options.path || "/").replace("path=", "");
          const domain = options.url != null && options.url.length > 0 ? `domain=${options.url}` : "";
          document.cookie = `${encodedKey}=${encodedValue || ""}${expires}; path=${path}; ${domain};`;
        } catch (error) {
          return Promise.reject(error);
        }
      }
      async deleteCookie(options) {
        try {
          document.cookie = `${options.key}=; Max-Age=0`;
        } catch (error) {
          return Promise.reject(error);
        }
      }
      async clearCookies() {
        try {
          const cookies = document.cookie.split(";") || [];
          for (const cookie of cookies) {
            document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, `=;expires=${(/* @__PURE__ */ new Date()).toUTCString()};path=/`);
          }
        } catch (error) {
          return Promise.reject(error);
        }
      }
      async clearAllCookies() {
        try {
          await this.clearCookies();
        } catch (error) {
          return Promise.reject(error);
        }
      }
    };
    CapacitorCookies = registerPlugin("CapacitorCookies", {
      web: () => new CapacitorCookiesPluginWeb()
    });
    readBlobAsBase64 = async (blob) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result;
        resolve(base64String.indexOf(",") >= 0 ? base64String.split(",")[1] : base64String);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(blob);
    });
    normalizeHttpHeaders = (headers = {}) => {
      const originalKeys = Object.keys(headers);
      const loweredKeys = Object.keys(headers).map((k) => k.toLocaleLowerCase());
      const normalized = loweredKeys.reduce((acc, key, index) => {
        acc[key] = headers[originalKeys[index]];
        return acc;
      }, {});
      return normalized;
    };
    buildUrlParams = (params, shouldEncode = true) => {
      if (!params)
        return null;
      const output = Object.entries(params).reduce((accumulator, entry) => {
        const [key, value] = entry;
        let encodedValue;
        let item;
        if (Array.isArray(value)) {
          item = "";
          value.forEach((str) => {
            encodedValue = shouldEncode ? encodeURIComponent(str) : str;
            item += `${key}=${encodedValue}&`;
          });
          item.slice(0, -1);
        } else {
          encodedValue = shouldEncode ? encodeURIComponent(value) : value;
          item = `${key}=${encodedValue}`;
        }
        return `${accumulator}&${item}`;
      }, "");
      return output.substr(1);
    };
    buildRequestInit = (options, extra = {}) => {
      const output = Object.assign({ method: options.method || "GET", headers: options.headers }, extra);
      const headers = normalizeHttpHeaders(options.headers);
      const type = headers["content-type"] || "";
      if (typeof options.data === "string") {
        output.body = options.data;
      } else if (type.includes("application/x-www-form-urlencoded")) {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(options.data || {})) {
          params.set(key, value);
        }
        output.body = params.toString();
      } else if (type.includes("multipart/form-data") || options.data instanceof FormData) {
        const form = new FormData();
        if (options.data instanceof FormData) {
          options.data.forEach((value, key) => {
            form.append(key, value);
          });
        } else {
          for (const key of Object.keys(options.data)) {
            form.append(key, options.data[key]);
          }
        }
        output.body = form;
        const headers2 = new Headers(output.headers);
        headers2.delete("content-type");
        output.headers = headers2;
      } else if (type.includes("application/json") || typeof options.data === "object") {
        output.body = JSON.stringify(options.data);
      }
      return output;
    };
    CapacitorHttpPluginWeb = class extends WebPlugin {
      /**
       * Perform an Http request given a set of options
       * @param options Options to build the HTTP request
       */
      async request(options) {
        const requestInit = buildRequestInit(options, options.webFetchExtra);
        const urlParams = buildUrlParams(options.params, options.shouldEncodeUrlParams);
        const url = urlParams ? `${options.url}?${urlParams}` : options.url;
        const response = await fetch(url, requestInit);
        const contentType = response.headers.get("content-type") || "";
        let { responseType = "text" } = response.ok ? options : {};
        if (contentType.includes("application/json")) {
          responseType = "json";
        }
        let data;
        let blob;
        switch (responseType) {
          case "arraybuffer":
          case "blob":
            blob = await response.blob();
            data = await readBlobAsBase64(blob);
            break;
          case "json":
            data = await response.json();
            break;
          case "document":
          case "text":
          default:
            data = await response.text();
        }
        const headers = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });
        return {
          data,
          headers,
          status: response.status,
          url: response.url
        };
      }
      /**
       * Perform an Http GET request given a set of options
       * @param options Options to build the HTTP request
       */
      async get(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: "GET" }));
      }
      /**
       * Perform an Http POST request given a set of options
       * @param options Options to build the HTTP request
       */
      async post(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: "POST" }));
      }
      /**
       * Perform an Http PUT request given a set of options
       * @param options Options to build the HTTP request
       */
      async put(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: "PUT" }));
      }
      /**
       * Perform an Http PATCH request given a set of options
       * @param options Options to build the HTTP request
       */
      async patch(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: "PATCH" }));
      }
      /**
       * Perform an Http DELETE request given a set of options
       * @param options Options to build the HTTP request
       */
      async delete(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: "DELETE" }));
      }
    };
    CapacitorHttp = registerPlugin("CapacitorHttp", {
      web: () => new CapacitorHttpPluginWeb()
    });
    (function(SystemBarsStyle2) {
      SystemBarsStyle2["Dark"] = "DARK";
      SystemBarsStyle2["Light"] = "LIGHT";
      SystemBarsStyle2["Default"] = "DEFAULT";
    })(SystemBarsStyle || (SystemBarsStyle = {}));
    (function(SystemBarType2) {
      SystemBarType2["StatusBar"] = "StatusBar";
      SystemBarType2["NavigationBar"] = "NavigationBar";
    })(SystemBarType || (SystemBarType = {}));
    SystemBarsPluginWeb = class extends WebPlugin {
      async setStyle() {
        this.unavailable("not available for web");
      }
      async setAnimation() {
        this.unavailable("not available for web");
      }
      async show() {
        this.unavailable("not available for web");
      }
      async hide() {
        this.unavailable("not available for web");
      }
    };
    SystemBars = registerPlugin("SystemBars", {
      web: () => new SystemBarsPluginWeb()
    });
  }
});

// node_modules/@capgo/capacitor-bluetooth-low-energy/dist/esm/definitions.js
var BluetoothLowEnergyUtils;
var init_definitions = __esm({
  "node_modules/@capgo/capacitor-bluetooth-low-energy/dist/esm/definitions.js"() {
    BluetoothLowEnergyUtils = class {
      /**
       * Convert a byte array to a hex string.
       *
       * @param bytes - The byte array to convert
       * @returns The hex string
       * @since 1.0.0
       * @example
       * ```typescript
       * const hex = BluetoothLowEnergyUtils.convertBytesToHex([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
       * console.log(hex); // "48656c6c6f"
       * ```
       */
      static convertBytesToHex(bytes) {
        return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
      }
      /**
       * Convert a hex string to a byte array.
       *
       * @param hex - The hex string to convert
       * @returns The byte array
       * @since 1.0.0
       * @example
       * ```typescript
       * const bytes = BluetoothLowEnergyUtils.convertHexToBytes("48656c6c6f");
       * console.log(bytes); // [72, 101, 108, 108, 111]
       * ```
       */
      static convertHexToBytes(hex) {
        const bytes = [];
        for (let i2 = 0; i2 < hex.length; i2 += 2) {
          bytes.push(parseInt(hex.substr(i2, 2), 16));
        }
        return bytes;
      }
      /**
       * Convert a string to a byte array (UTF-8).
       *
       * @param str - The string to convert
       * @returns The byte array
       * @since 1.0.0
       * @example
       * ```typescript
       * const bytes = BluetoothLowEnergyUtils.convertStringToBytes("Hello");
       * console.log(bytes); // [72, 101, 108, 108, 111]
       * ```
       */
      static convertStringToBytes(str) {
        return Array.from(new TextEncoder().encode(str));
      }
      /**
       * Convert a byte array to a string (UTF-8).
       *
       * @param bytes - The byte array to convert
       * @returns The string
       * @since 1.0.0
       * @example
       * ```typescript
       * const str = BluetoothLowEnergyUtils.convertBytesToString([72, 101, 108, 108, 111]);
       * console.log(str); // "Hello"
       * ```
       */
      static convertBytesToString(bytes) {
        return new TextDecoder().decode(new Uint8Array(bytes));
      }
    };
  }
});

// node_modules/@capgo/capacitor-bluetooth-low-energy/dist/esm/web.js
var web_exports = {};
__export(web_exports, {
  BluetoothLowEnergyWeb: () => BluetoothLowEnergyWeb
});
var BluetoothLowEnergyWeb;
var init_web = __esm({
  "node_modules/@capgo/capacitor-bluetooth-low-energy/dist/esm/web.js"() {
    init_dist2();
    BluetoothLowEnergyWeb = class extends WebPlugin {
      constructor() {
        super(...arguments);
        this.devices = /* @__PURE__ */ new Map();
        this.services = /* @__PURE__ */ new Map();
        this.characteristicListeners = /* @__PURE__ */ new Map();
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async initialize(_options) {
        if (!navigator.bluetooth) {
          throw new Error("Web Bluetooth API is not available");
        }
      }
      async isAvailable() {
        if (!navigator.bluetooth) {
          return { available: false };
        }
        try {
          const available = await navigator.bluetooth.getAvailability();
          return { available };
        } catch (_a) {
          return { available: false };
        }
      }
      async isEnabled() {
        const { available } = await this.isAvailable();
        return { enabled: available };
      }
      async isLocationEnabled() {
        return { enabled: true };
      }
      async openAppSettings() {
        throw new Error("openAppSettings is not supported on web");
      }
      async openBluetoothSettings() {
        throw new Error("openBluetoothSettings is not supported on web");
      }
      async openLocationSettings() {
        throw new Error("openLocationSettings is not supported on web");
      }
      async checkPermissions() {
        return {
          bluetooth: "prompt",
          location: "granted"
        };
      }
      async requestPermissions() {
        return {
          bluetooth: "granted",
          location: "granted"
        };
      }
      async startScan(options) {
        var _a;
        if (!navigator.bluetooth) {
          throw new Error("Web Bluetooth API is not available");
        }
        const requestOptions = {};
        if ((options === null || options === void 0 ? void 0 : options.services) && options.services.length > 0) {
          requestOptions.filters = [{ services: options.services }];
        } else {
          requestOptions.acceptAllDevices = true;
        }
        if (options === null || options === void 0 ? void 0 : options.services) {
          requestOptions.optionalServices = options.services;
        }
        try {
          const device = await navigator.bluetooth.requestDevice(requestOptions);
          const bleDevice = {
            deviceId: device.id,
            name: (_a = device.name) !== null && _a !== void 0 ? _a : null
          };
          this.devices.set(device.id, device);
          this.notifyListeners("deviceScanned", { device: bleDevice });
        } catch (error) {
          if (error instanceof Error && error.name === "NotFoundError") {
            return;
          }
          throw error;
        }
      }
      async stopScan() {
      }
      async connect(options) {
        const device = this.devices.get(options.deviceId);
        if (!device) {
          throw new Error(`Device ${options.deviceId} not found`);
        }
        if (!device.gatt) {
          throw new Error(`Device ${options.deviceId} does not support GATT`);
        }
        await device.gatt.connect();
        this.notifyListeners("deviceConnected", { deviceId: options.deviceId });
      }
      async disconnect(options) {
        var _a;
        const device = this.devices.get(options.deviceId);
        if (!device) {
          throw new Error(`Device ${options.deviceId} not found`);
        }
        if ((_a = device.gatt) === null || _a === void 0 ? void 0 : _a.connected) {
          device.gatt.disconnect();
        }
        this.notifyListeners("deviceDisconnected", { deviceId: options.deviceId });
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async createBond(_options) {
        throw new Error("createBond is not supported on web");
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async isBonded(_options) {
        throw new Error("isBonded is not supported on web");
      }
      async discoverServices(options) {
        var _a;
        const device = this.devices.get(options.deviceId);
        if (!((_a = device === null || device === void 0 ? void 0 : device.gatt) === null || _a === void 0 ? void 0 : _a.connected)) {
          throw new Error(`Device ${options.deviceId} is not connected`);
        }
        const gattServices = await device.gatt.getPrimaryServices();
        const services = [];
        for (const gattService of gattServices) {
          const characteristics = await gattService.getCharacteristics();
          const bleCharacteristics = await Promise.all(characteristics.map(async (char) => {
            const descriptors = await char.getDescriptors();
            return {
              uuid: char.uuid,
              properties: {
                broadcast: char.properties.broadcast,
                read: char.properties.read,
                writeWithoutResponse: char.properties.writeWithoutResponse,
                write: char.properties.write,
                notify: char.properties.notify,
                indicate: char.properties.indicate,
                authenticatedSignedWrites: char.properties.authenticatedSignedWrites,
                extendedProperties: false
              },
              descriptors: descriptors.map((desc) => ({ uuid: desc.uuid }))
            };
          }));
          services.push({
            uuid: gattService.uuid,
            characteristics: bleCharacteristics
          });
        }
        this.services.set(options.deviceId, services);
      }
      async getServices(options) {
        const services = this.services.get(options.deviceId);
        if (!services) {
          return { services: [] };
        }
        return { services };
      }
      async getConnectedDevices() {
        var _a, _b;
        const devices = [];
        for (const [deviceId, device] of this.devices) {
          if ((_a = device.gatt) === null || _a === void 0 ? void 0 : _a.connected) {
            devices.push({
              deviceId,
              name: (_b = device.name) !== null && _b !== void 0 ? _b : null
            });
          }
        }
        return { devices };
      }
      async readCharacteristic(options) {
        var _a;
        const device = this.devices.get(options.deviceId);
        if (!((_a = device === null || device === void 0 ? void 0 : device.gatt) === null || _a === void 0 ? void 0 : _a.connected)) {
          throw new Error(`Device ${options.deviceId} is not connected`);
        }
        const service = await device.gatt.getPrimaryService(options.service);
        const characteristic = await service.getCharacteristic(options.characteristic);
        const dataView = await characteristic.readValue();
        const value = [];
        for (let i2 = 0; i2 < dataView.byteLength; i2++) {
          value.push(dataView.getUint8(i2));
        }
        return { value };
      }
      async writeCharacteristic(options) {
        var _a;
        const device = this.devices.get(options.deviceId);
        if (!((_a = device === null || device === void 0 ? void 0 : device.gatt) === null || _a === void 0 ? void 0 : _a.connected)) {
          throw new Error(`Device ${options.deviceId} is not connected`);
        }
        const service = await device.gatt.getPrimaryService(options.service);
        const characteristic = await service.getCharacteristic(options.characteristic);
        const data = new Uint8Array(options.value);
        if (options.type === "withoutResponse") {
          await characteristic.writeValueWithoutResponse(data);
        } else {
          await characteristic.writeValueWithResponse(data);
        }
      }
      async startCharacteristicNotifications(options) {
        var _a;
        const device = this.devices.get(options.deviceId);
        if (!((_a = device === null || device === void 0 ? void 0 : device.gatt) === null || _a === void 0 ? void 0 : _a.connected)) {
          throw new Error(`Device ${options.deviceId} is not connected`);
        }
        const service = await device.gatt.getPrimaryService(options.service);
        const characteristic = await service.getCharacteristic(options.characteristic);
        const key = `${options.deviceId}-${options.service}-${options.characteristic}`;
        const listener = (event) => {
          const dataView = event.target.value;
          if (!dataView)
            return;
          const value = [];
          for (let i2 = 0; i2 < dataView.byteLength; i2++) {
            value.push(dataView.getUint8(i2));
          }
          this.notifyListeners("characteristicChanged", {
            deviceId: options.deviceId,
            service: options.service,
            characteristic: options.characteristic,
            value
          });
        };
        characteristic.addEventListener("characteristicvaluechanged", listener);
        this.characteristicListeners.set(key, listener);
        await characteristic.startNotifications();
      }
      async stopCharacteristicNotifications(options) {
        var _a;
        const device = this.devices.get(options.deviceId);
        if (!((_a = device === null || device === void 0 ? void 0 : device.gatt) === null || _a === void 0 ? void 0 : _a.connected)) {
          throw new Error(`Device ${options.deviceId} is not connected`);
        }
        const service = await device.gatt.getPrimaryService(options.service);
        const characteristic = await service.getCharacteristic(options.characteristic);
        const key = `${options.deviceId}-${options.service}-${options.characteristic}`;
        const listener = this.characteristicListeners.get(key);
        if (listener) {
          characteristic.removeEventListener("characteristicvaluechanged", listener);
          this.characteristicListeners.delete(key);
        }
        await characteristic.stopNotifications();
      }
      async readDescriptor(options) {
        var _a;
        const device = this.devices.get(options.deviceId);
        if (!((_a = device === null || device === void 0 ? void 0 : device.gatt) === null || _a === void 0 ? void 0 : _a.connected)) {
          throw new Error(`Device ${options.deviceId} is not connected`);
        }
        const service = await device.gatt.getPrimaryService(options.service);
        const characteristic = await service.getCharacteristic(options.characteristic);
        const descriptors = await characteristic.getDescriptors();
        const descriptor = descriptors.find((d) => d.uuid === options.descriptor);
        if (!descriptor) {
          throw new Error(`Descriptor ${options.descriptor} not found`);
        }
        const dataView = await descriptor.readValue();
        const value = [];
        for (let i2 = 0; i2 < dataView.byteLength; i2++) {
          value.push(dataView.getUint8(i2));
        }
        return { value };
      }
      async writeDescriptor(options) {
        var _a;
        const device = this.devices.get(options.deviceId);
        if (!((_a = device === null || device === void 0 ? void 0 : device.gatt) === null || _a === void 0 ? void 0 : _a.connected)) {
          throw new Error(`Device ${options.deviceId} is not connected`);
        }
        const service = await device.gatt.getPrimaryService(options.service);
        const characteristic = await service.getCharacteristic(options.characteristic);
        const descriptors = await characteristic.getDescriptors();
        const descriptor = descriptors.find((d) => d.uuid === options.descriptor);
        if (!descriptor) {
          throw new Error(`Descriptor ${options.descriptor} not found`);
        }
        const data = new Uint8Array(options.value);
        await descriptor.writeValue(data);
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async readRssi(_options) {
        throw new Error("readRssi is not supported on web");
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async requestMtu(_options) {
        throw new Error("requestMtu is not supported on web");
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async requestConnectionPriority(_options) {
        throw new Error("requestConnectionPriority is not supported on web");
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async startAdvertising(_options) {
        throw new Error("startAdvertising is not supported on web");
      }
      async stopAdvertising() {
        throw new Error("stopAdvertising is not supported on web");
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async startForegroundService(_options) {
        throw new Error("startForegroundService is not supported on web");
      }
      async stopForegroundService() {
        throw new Error("stopForegroundService is not supported on web");
      }
      async getPluginVersion() {
        return { version: "web" };
      }
    };
  }
});

// node_modules/@capgo/capacitor-bluetooth-low-energy/dist/esm/index.js
var esm_exports = {};
__export(esm_exports, {
  BluetoothLowEnergy: () => BluetoothLowEnergy,
  BluetoothLowEnergyUtils: () => BluetoothLowEnergyUtils
});
var BluetoothLowEnergy;
var init_esm = __esm({
  "node_modules/@capgo/capacitor-bluetooth-low-energy/dist/esm/index.js"() {
    init_dist2();
    init_definitions();
    BluetoothLowEnergy = registerPlugin("BluetoothLowEnergy", {
      web: () => Promise.resolve().then(() => (init_web(), web_exports)).then((m) => new m.BluetoothLowEnergyWeb())
    });
  }
});

// public/client.js
var require_client = __commonJS({
  "public/client.js"() {
    init_dist();
    var socket = io("http://localhost:3000");
    var myUsername = null;
    var myKeyPair = null;
    var peers = {};
    var receivingFile = null;
    var lastUserList = [];
    var bleEnabled = false;
    var bleAdvertising = false;
    var bleScanning = false;
    var bleConnectedDeviceId = null;
    var peerKeys = {};
    var BLE_SERVICE_UUID = "12345678-1234-1234-1234-123456789abc";
    var BLE_CHARACTERISTIC_UUID = "abcdef01-1234-1234-1234-123456789abc";
    var userWallet = null;
    var provider = null;
    var currentNetwork = { chainId: 11155111, name: "Sepolia", rpcUrl: "/rpc" };
    var loginDiv = document.getElementById("login");
    var chatDiv = document.getElementById("chat");
    var usernameInput = document.getElementById("username");
    var joinBtn = document.getElementById("joinBtn");
    var userList = document.getElementById("userList");
    var messagesDiv = document.getElementById("messages");
    var messageInput = document.getElementById("messageInput");
    var sendBtn = document.getElementById("sendBtn");
    var fileInput = document.getElementById("fileInput");
    var sendFileBtn = document.getElementById("sendFileBtn");
    var progressDiv = document.getElementById("progress");
    var enableBLEBtn = document.getElementById("enableBLEBtn");
    var disableBLEBtn = document.getElementById("disableBLEBtn");
    var nearbyDevicesDiv = document.getElementById("nearbyDevices");
    var walletAddressSpan = document.getElementById("wallet-address");
    var networkNameSpan = document.getElementById("network-name");
    var tokenSelect = document.getElementById("token-select");
    var paymentAmountInput = document.getElementById("payment-amount");
    var recipientAddressInput = document.getElementById("recipient-address");
    var sendPrivatePaymentBtn = document.getElementById("send-private-payment");
    var paymentStatusDiv = document.getElementById("payment-status");
    var balanceListDiv = document.getElementById("balance-list");
    var refreshBalancesBtn = document.getElementById("refresh-balances");
    var hyperswitchPayBtn = document.getElementById("hyperswitch-pay-button");
    var hyperswitchStatus = document.getElementById("hyperswitch-status");
    var hyperswitchElementDiv = document.getElementById("hyperswitch-payment-element");
    joinBtn.addEventListener("click", async () => {
      const name = usernameInput.value.trim();
      if (!name) return;
      myUsername = name;
      myKeyPair = await crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey", "deriveBits"]
      );
      try {
        userWallet = await deriveWalletFromMasterKey(myKeyPair.privateKey);
        walletAddressSpan.textContent = userWallet.address;
        networkNameSpan.textContent = currentNetwork.name;
        provider = new ethers.providers.JsonRpcProvider(currentNetwork.rpcUrl);
        await refreshBalances();
      } catch (err) {
        console.error("Wallet derivation failed:", err);
        walletAddressSpan.textContent = "Error";
      }
      const publicKeyBuffer = await crypto.subtle.exportKey("raw", myKeyPair.publicKey);
      const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)));
      socket.emit("join", { username: name, publicKey: publicKeyBase64 });
      loginDiv.style.display = "none";
      chatDiv.style.display = "block";
    });
    socket.on("user-list", (users) => {
      lastUserList = users;
      const others = users.filter((u) => u.id !== socket.id);
      userList.innerHTML = "";
      if (others.length === 0) {
        userList.innerHTML = "<li>No other users online</li>";
        return;
      }
      others.forEach((user) => {
        const li = document.createElement("li");
        li.textContent = user.username;
        li.setAttribute("data-id", user.id);
        li.setAttribute("data-publickey", user.publicKey);
        li.style.cursor = "pointer";
        li.addEventListener("click", () => startChat(user.id, user.username, user.publicKey));
        userList.appendChild(li);
      });
    });
    async function importPublicKey(base64Key) {
      const binary = atob(base64Key);
      const buffer = new Uint8Array(binary.length);
      for (let i2 = 0; i2 < binary.length; i2++) buffer[i2] = binary.charCodeAt(i2);
      return await crypto.subtle.importKey(
        "raw",
        buffer,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        []
      );
    }
    async function startChat(targetId, targetUsername, targetPublicKeyBase64) {
      if (peers[targetId]) {
        alert(`Already connected to ${targetUsername}`);
        return;
      }
      const targetPublicKey = await importPublicKey(targetPublicKeyBase64);
      const sharedSecretBits = await crypto.subtle.deriveBits(
        { name: "ECDH", public: targetPublicKey },
        myKeyPair.privateKey,
        256
      );
      const sharedSecretBase64 = btoa(String.fromCharCode(...new Uint8Array(sharedSecretBits)));
      peers[targetId] = { encryptionKey: sharedSecretBase64, dataChannel: null, peerConnection: null, walletAddress: null };
      const peer = createPeerConnection(targetId, false);
      try {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socket.emit("signal", { to: targetId, signal: offer });
      } catch (err) {
        console.error("Error creating offer:", err);
      }
    }
    socket.on("signal", async (data) => {
      const { from, signal } = data;
      if (!peers[from]) {
        let userInfo = lastUserList.find((u) => u.id === from);
        let retries = 0;
        while (!userInfo && retries < 10) {
          await new Promise((resolve) => setTimeout(resolve, 200));
          userInfo = lastUserList.find((u) => u.id === from);
          retries++;
        }
        if (userInfo && userInfo.publicKey) {
          const targetPublicKey = await importPublicKey(userInfo.publicKey);
          const sharedSecretBits = await crypto.subtle.deriveBits(
            { name: "ECDH", public: targetPublicKey },
            myKeyPair.privateKey,
            256
          );
          const sharedSecretBase64 = btoa(String.fromCharCode(...new Uint8Array(sharedSecretBits)));
          peers[from] = { encryptionKey: sharedSecretBase64, dataChannel: null, peerConnection: null, walletAddress: null };
          createPeerConnection(from, true);
        } else {
          console.warn("Cannot create peer: no public key for", from);
          return;
        }
      }
      const peer = peers[from].peerConnection;
      if (!peer) return;
      if (signal.type === "offer") {
        await peer.setRemoteDescription(new RTCSessionDescription(signal));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socket.emit("signal", { to: from, signal: answer });
      } else if (signal.type === "answer") {
        await peer.setRemoteDescription(new RTCSessionDescription(signal));
      } else if (signal.candidate) {
        await peer.addIceCandidate(new RTCIceCandidate(signal));
      }
    });
    function createPeerConnection(targetId, isReceiver) {
      const config = {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
          { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" }
        ]
      };
      const peer = new RTCPeerConnection(config);
      peer.onicecandidate = (event) => {
        if (event.candidate) socket.emit("signal", { to: targetId, signal: event.candidate });
      };
      if (!isReceiver) {
        const channel = peer.createDataChannel("chat");
        setupDataChannel(channel, targetId);
      } else {
        peer.ondatachannel = (event) => setupDataChannel(event.channel, targetId);
      }
      peers[targetId].peerConnection = peer;
      return peer;
    }
    function setupDataChannel(channel, targetId) {
      if (channel._messageHandlerAttached) {
        console.log(`\u26A0\uFE0F Handler already attached for ${targetId}, skipping`);
        return;
      }
      channel._messageHandlerAttached = true;
      channel.onopen = () => {
        peers[targetId].dataChannel = channel;
        if (userWallet) {
          channel.send(JSON.stringify({ type: "wallet-address", address: userWallet.address }));
        }
      };
      channel.onclose = () => {
        delete peers[targetId];
      };
      channel.onerror = (err) => console.error(`\u{1F525} Data channel ERROR with ${targetId}:`, err);
      const messageHandler = (event) => {
        const peer = peers[targetId];
        if (!peer) return;
        const encryptionKey = peer.encryptionKey;
        try {
          const obj = JSON.parse(event.data);
          if (obj.type === "file-meta") {
            receivingFile = { name: obj.name, size: obj.size, mime: obj.mime, received: 0, chunks: [] };
            progressDiv.innerHTML += `<div>Receiving file: ${obj.name} (${obj.size} bytes)</div>`;
          } else if (obj.type === "file-chunk") {
            const decrypted = CryptoJS.AES.decrypt(obj.data, encryptionKey);
            const decryptedBytes = new Uint8Array(decrypted.sigBytes);
            for (let i2 = 0; i2 < decrypted.sigBytes; i2++) {
              decryptedBytes[i2] = decrypted.words[i2 >>> 2] >>> 24 - i2 % 4 * 8 & 255;
            }
            receivingFile.chunks.push(decryptedBytes);
            receivingFile.received += decryptedBytes.length;
            const percent = Math.min(100, Math.round(receivingFile.received / receivingFile.size * 100));
            progressDiv.innerHTML = `Receiving ${receivingFile.name}: ${percent}%`;
            if (receivingFile.received >= receivingFile.size) {
              const blob = new Blob(receivingFile.chunks, { type: receivingFile.mime });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = receivingFile.name;
              a.click();
              URL.revokeObjectURL(url);
              progressDiv.innerHTML += `<div>File "${receivingFile.name}" received.</div>`;
              receivingFile = null;
            }
          } else if (obj.type === "wallet-address") {
            peer.walletAddress = obj.address;
            const msgDiv = document.createElement("div");
            msgDiv.textContent = `\u{1F517} Peer's wallet address received.`;
            messagesDiv.appendChild(msgDiv);
            updateRecipientField();
          } else {
            console.log("Unknown JSON type", obj.type);
          }
        } catch (e) {
          try {
            const bytes = CryptoJS.AES.decrypt(event.data, encryptionKey);
            const plaintext = bytes.toString(CryptoJS.enc.Utf8);
            if (plaintext) {
              const msgDiv = document.createElement("div");
              msgDiv.textContent = `Them: ${plaintext}`;
              messagesDiv.appendChild(msgDiv);
            } else {
              console.warn("Decryption failed \u2013 wrong key?");
            }
          } catch (decryptErr) {
            console.error("Decryption error:", decryptErr);
          }
        }
      };
      channel.addEventListener("message", messageHandler);
    }
    sendBtn.addEventListener("click", () => {
      const text = messageInput.value.trim();
      if (!text) return;
      for (let targetId in peers) {
        const channel = peers[targetId].dataChannel;
        const key = peers[targetId].encryptionKey;
        if (channel && channel.readyState === "open") {
          try {
            const encrypted = CryptoJS.AES.encrypt(text, key).toString();
            channel.send(encrypted);
          } catch (err) {
            console.error("Send error:", err);
          }
        } else {
          console.warn("\u274C Channel not open for", targetId);
        }
      }
      const msgDiv = document.createElement("div");
      msgDiv.textContent = `Me: ${text}`;
      messagesDiv.appendChild(msgDiv);
      messageInput.value = "";
    });
    messageInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendBtn.click();
    });
    sendFileBtn.addEventListener("click", () => {
      const file = fileInput.files[0];
      if (!file) {
        alert("Choose a file first");
        return;
      }
      for (let targetId in peers) {
        const channel = peers[targetId].dataChannel;
        const key = peers[targetId].encryptionKey;
        if (channel && channel.readyState === "open") sendFileViaChannel(channel, file, key);
      }
    });
    function sendFileViaChannel(channel, file, encryptionKey) {
      const CHUNK_SIZE = 64 * 1024;
      const reader = new FileReader();
      let offset = 0;
      const metadata = { type: "file-meta", name: file.name, size: file.size, mime: file.type };
      channel.send(JSON.stringify(metadata));
      reader.onload = (e) => {
        const chunkData = e.target.result;
        const wordArray = CryptoJS.lib.WordArray.create(chunkData);
        const encrypted = CryptoJS.AES.encrypt(wordArray, encryptionKey).toString();
        channel.send(JSON.stringify({ type: "file-chunk", data: encrypted, offset, total: file.size }));
        offset += CHUNK_SIZE;
        if (offset < file.size) readNext();
        else progressDiv.innerHTML += `<div>File "${file.name}" sent.</div>`;
        const percent = Math.min(100, Math.round(offset / file.size * 100));
        progressDiv.innerHTML = `Sending ${file.name}: ${percent}%`;
      };
      function readNext() {
        const slice = file.slice(offset, offset + CHUNK_SIZE);
        reader.readAsArrayBuffer(slice);
      }
      readNext();
    }
    async function getBLEPlugin() {
      if (typeof Capacitor === "undefined" || !Capacitor.isNative) return null;
      try {
        const module2 = await Promise.resolve().then(() => (init_esm(), esm_exports));
        return module2.BluetoothLowEnergy;
      } catch (err) {
        console.error("Failed to load BLE plugin:", err);
        return null;
      }
    }
    async function startBLEAdvert() {
      const ble = await getBLEPlugin();
      if (!ble || !myUsername || bleAdvertising) return;
      try {
        await ble.startAdvertising({
          deviceName: `Chat_${myUsername}`,
          services: [BLE_SERVICE_UUID],
          characteristics: [{
            uuid: BLE_CHARACTERISTIC_UUID,
            properties: ["Read", "Write", "Notify"],
            permissions: ["Readable", "Writable"],
            value: ""
          }]
        });
        bleAdvertising = true;
      } catch (err) {
        console.error("Start advertising failed:", err);
      }
    }
    async function stopBLEAdvert() {
      const ble = await getBLEPlugin();
      if (!ble || !bleAdvertising) return;
      try {
        await ble.stopAdvertising();
        bleAdvertising = false;
      } catch (err) {
        console.error("Stop advertising failed:", err);
      }
    }
    async function startBLEScan() {
      const ble = await getBLEPlugin();
      if (!ble || bleScanning) return;
      try {
        await ble.startScan({ services: [BLE_SERVICE_UUID] });
        bleScanning = true;
        ble.addListener("deviceScanned", (device) => addDeviceToList(device));
      } catch (err) {
        console.error("Start scan failed:", err);
      }
    }
    async function stopBLEScan() {
      const ble = await getBLEPlugin();
      if (!ble || !bleScanning) return;
      try {
        await ble.stopScan();
        bleScanning = false;
      } catch (err) {
        console.error("Stop scan failed:", err);
      }
    }
    function addDeviceToList(device) {
      if (!nearbyDevicesDiv) return;
      if (document.getElementById(`device-${device.deviceId}`)) return;
      const btn = document.createElement("button");
      btn.id = `device-${device.deviceId}`;
      btn.textContent = device.name || device.deviceId;
      btn.onclick = () => connectToBLEDevice(device.deviceId);
      nearbyDevicesDiv.appendChild(btn);
    }
    async function connectToBLEDevice(deviceId) {
      const ble = await getBLEPlugin();
      if (!ble || bleConnectedDeviceId) return;
      try {
        await ble.connect({ deviceId });
        bleConnectedDeviceId = deviceId;
        await ble.discoverServices({ deviceId });
        ble.addListener("characteristicChanged", ({ characteristic, value }) => {
          if (characteristic === BLE_CHARACTERISTIC_UUID) {
            const encrypted = new TextDecoder().decode(value);
            const key = getKeyForPeer(deviceId);
            if (key) {
              const bytes = CryptoJS.AES.decrypt(encrypted, key);
              const plaintext = bytes.toString(CryptoJS.enc.Utf8);
              displayBLEChatMessage(deviceId, plaintext, "them");
            }
          }
        });
      } catch (err) {
        console.error("BLE connect error:", err);
      }
    }
    async function disconnectBLEDevice() {
      const ble = await getBLEPlugin();
      if (!ble || !bleConnectedDeviceId) return;
      try {
        await ble.disconnect({ deviceId: bleConnectedDeviceId });
        bleConnectedDeviceId = null;
      } catch (err) {
        console.error("Disconnect error:", err);
      }
    }
    function getKeyForPeer(peerId) {
      return peerKeys[peerId];
    }
    function displayBLEChatMessage(peerId, text, sender) {
      const shortId = peerId.substring(0, 6);
      const msgDiv = document.createElement("div");
      msgDiv.textContent = `[BLE ${shortId}] ${sender}: ${text}`;
      messagesDiv.appendChild(msgDiv);
    }
    if (enableBLEBtn) {
      enableBLEBtn.addEventListener("click", async () => {
        if (!myUsername) {
          alert("Please join the chat first.");
          return;
        }
        const ble = await getBLEPlugin();
        if (!ble) {
          alert("BLE only works on real devices (not in browser)");
          return;
        }
        const perm = await ble.requestPermissions();
        if (!perm) {
          alert("Bluetooth permissions required");
          return;
        }
        await startBLEAdvert();
        await startBLEScan();
        enableBLEBtn.disabled = true;
        if (disableBLEBtn) disableBLEBtn.disabled = false;
        bleEnabled = true;
      });
    }
    if (disableBLEBtn) {
      disableBLEBtn.addEventListener("click", async () => {
        await stopBLEAdvert();
        await stopBLEScan();
        await disconnectBLEDevice();
        enableBLEBtn.disabled = false;
        disableBLEBtn.disabled = true;
        bleEnabled = false;
      });
    }
    async function deriveWalletFromMasterKey(privateKey) {
      const jwk = await crypto.subtle.exportKey("jwk", privateKey);
      const privateBase64Url = jwk.d;
      const privateBase64 = privateBase64Url.replace(/-/g, "+").replace(/_/g, "/");
      const privateKeyRaw = Uint8Array.from(atob(privateBase64), (c) => c.charCodeAt(0));
      const seed = await crypto.subtle.digest("SHA-256", privateKeyRaw);
      const privateKeyHex = Array.from(new Uint8Array(seed.slice(0, 32))).map((b) => b.toString(16).padStart(2, "0")).join("");
      return new ethers.Wallet("0x" + privateKeyHex);
    }
    function getTokenAddress(token, chainId) {
      if (chainId === 11155111) {
        const addresses2 = { usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", usdt: "", dai: "" };
        return addresses2[token];
      }
      const addresses = {
        usdc: "0x07865c6E87B9F70255377e024ace6630C1Eaa37F",
        usdt: "0x7D4CcE7fB4cDBb702F134e284FfDC8D80B0BF720",
        dai: "0x11fE4B6AE13d2a6055C8D9cF65c55bac32B5a5e8"
      };
      return addresses[token];
    }
    function updateRecipientField() {
      const connected = Object.keys(peers).filter((id) => peers[id]?.walletAddress);
      if (connected.length > 0) recipientAddressInput.value = peers[connected[0]].walletAddress;
    }
    async function refreshBalances() {
      if (!provider || !userWallet || !balanceListDiv) return;
      balanceListDiv.innerHTML = "Loading balances...";
      const tokens = [
        { symbol: "USDC", address: getTokenAddress("usdc", currentNetwork.chainId) },
        { symbol: "USDT", address: getTokenAddress("usdt", currentNetwork.chainId) },
        { symbol: "DAI", address: getTokenAddress("dai", currentNetwork.chainId) }
      ];
      for (const token of tokens) {
        if (!token.address) continue;
        try {
          const tokenContract = new ethers.Contract(
            token.address,
            ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"],
            provider
          );
          const balance = await tokenContract.balanceOf(userWallet.address);
          const decimals = await tokenContract.decimals();
          const formatted = ethers.utils.formatUnits(balance, decimals);
          balanceListDiv.appendChild(Object.assign(document.createElement("div"), { textContent: `${token.symbol}: ${formatted}` }));
        } catch (err) {
          balanceListDiv.appendChild(Object.assign(document.createElement("div"), { textContent: `${token.symbol}: Error` }));
        }
      }
      try {
        const ethBalance = await provider.getBalance(userWallet.address);
        const ethFormatted = ethers.utils.formatEther(ethBalance);
        balanceListDiv.appendChild(Object.assign(document.createElement("div"), { textContent: `ETH: ${ethFormatted}` }));
      } catch (err) {
        console.error("Error fetching ETH balance:", err);
      }
    }
    if (sendPrivatePaymentBtn) {
      sendPrivatePaymentBtn.addEventListener("click", async () => {
        const amount = paymentAmountInput.value;
        const token = tokenSelect.value;
        const recipient = recipientAddressInput.value;
        if (!amount || !recipient) {
          alert("Please fill all fields");
          return;
        }
        if (!provider || !userWallet) {
          paymentStatusDiv.textContent = "Wallet not initialized";
          return;
        }
        try {
          const decimals = token === "usdc" ? 6 : 18;
          const parsedAmount = ethers.utils.parseUnits(amount, decimals);
          const tokenAddress = getTokenAddress(token, currentNetwork.chainId);
          const signer = userWallet.connect(provider);
          const abi = [
            "function transfer(address to, uint256 amount) returns (bool)",
            "function decimals() view returns (uint8)"
          ];
          const tokenContract = new ethers.Contract(tokenAddress, abi, signer);
          const tx = await tokenContract.transfer(recipient, parsedAmount);
          paymentStatusDiv.innerHTML = `\u23F3 Transaction sent: <a href="https://sepolia.etherscan.io/tx/${tx.hash}" target="_blank">${tx.hash}</a>`;
          await tx.wait();
          paymentStatusDiv.innerHTML = `\u2705 Payment confirmed! <a href="https://sepolia.etherscan.io/tx/${tx.hash}" target="_blank">View</a>`;
          setTimeout(refreshBalances, 5e3);
        } catch (err) {
          console.error("Payment error:", err);
          paymentStatusDiv.textContent = `\u274C Error: ${err.message}`;
        }
      });
    }
    if (refreshBalancesBtn) refreshBalancesBtn.addEventListener("click", refreshBalances);
    if (hyperswitchPayBtn) {
      hyperswitchPayBtn.addEventListener("click", async () => {
        const amount = parseFloat(prompt("Enter amount in USD (e.g., 10):"));
        if (!amount || amount <= 0) {
          alert("Please enter a valid amount");
          return;
        }
        if (!userWallet) {
          alert("Wallet not initialized");
          return;
        }
        try {
          hyperswitchStatus.textContent = "Creating payment...";
          const oldConfirm = document.getElementById("hyperswitch-confirm-button");
          if (oldConfirm) oldConfirm.remove();
          hyperswitchElementDiv.innerHTML = "";
          const response = await fetch("/api/create-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount,
              currency: "USD",
              customerId: `wallet_${userWallet.address}`,
              email: `${userWallet.address}@example.com`
            })
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Payment creation failed");
          }
          const data = await response.json();
          if (!data.clientSecret) throw new Error("No client secret received");
          console.log("\u{1F535} CLIENT SECRET:", data.clientSecret);
          hyperswitchStatus.textContent = "";
          console.log("\u{1F7E2} 1. Loading Hyper SDK with loadHyper...");
          const hyper = await Y({
            clientSecret: data.clientSecret,
            customBackendUrl: "/api",
            fonts: [{ cssSrc: "https://fonts.googleapis.com/css?family=Roboto" }]
          });
          console.log("\u2705 Hyper instance created");
          console.log("\u{1F7E2} 2. Creating elements...");
          const elements = hyper.elements();
          console.log("\u2705 Elements created");
          console.log("\u{1F7E2} 3. Creating payment element...");
          const paymentElement = elements.create("payment");
          console.log("\u2705 Payment element created");
          console.log("\u{1F7E2} 4. Mounting element...");
          paymentElement.mount("#hyperswitch-payment-element");
          console.log("\u2705 Mount succeeded \u2013 payment form should appear.");
          const confirmBtn = document.createElement("button");
          confirmBtn.id = "hyperswitch-confirm-button";
          confirmBtn.textContent = "Confirm Payment";
          confirmBtn.style.marginTop = "10px";
          hyperswitchElementDiv.after(confirmBtn);
          confirmBtn.addEventListener("click", async function confirmHandler() {
            confirmBtn.disabled = true;
            hyperswitchStatus.textContent = "Processing...";
            try {
              const { error } = await hyper.confirmPayment({
                elements,
                confirmParams: { return_url: window.location.origin + "/payment-success.html" }
              });
              if (error) {
                console.error("Payment error:", error);
                hyperswitchStatus.textContent = "\u274C Payment failed: " + error.message;
                confirmBtn.disabled = false;
              } else {
                hyperswitchStatus.textContent = "\u2705 Payment successful!";
                confirmBtn.remove();
              }
            } catch (err) {
              console.error("Confirmation error:", err);
              hyperswitchStatus.textContent = "\u274C Error: " + err.message;
              confirmBtn.disabled = false;
            }
          });
        } catch (err) {
          console.error("\u274C Hyperswitch init error:", err);
          hyperswitchStatus.textContent = "\u274C Error: " + err.message;
        }
      });
    }
  }
});
export default require_client();
/*! Bundled license information:

@capacitor/core/dist/index.js:
  (*! Capacitor: https://capacitorjs.com/ - MIT License *)
*/
