const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("ryangames", {
  platform: "desktop",
  isApp: true
});
