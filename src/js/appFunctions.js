const { ipcRenderer } = require("electron");

const ipc = ipcRenderer;

// const closeBtn = document.getElementById("closeBtnElect");

// const closeBtn = document.getElementById("closeBtnElect");
ipc.on("arrow-navigation", (_, navigation) => {
  if (navigation.canGoBack) {
    backBtnElect.classList.add("allowed");
  } else {
    backBtnElect.classList.remove("allowed");
  }
  if (navigation.canGoForward) {
    forwardBtnElect.classList.add("allowed");
  } else {
    forwardBtnElect.classList.remove("allowed");
  }
});
backBtnElect.addEventListener("click", () => {
  if (backBtnElect.classList.contains("allowed")) ipc.send("backApp");
});
forwardBtnElect.addEventListener("click", () => {
  if (forwardBtnElect.classList.contains("allowed")) ipc.send("forwardApp");
});
ipc.on("isLoading", (_, isLoading) => {
  if (isLoading) {
    reloadBtnElect.classList.add("loading");
    logoElect.classList.add("loading");
  } else {
    reloadBtnElect.classList.remove("loading");
    logoElect.classList.remove("loading");
  }
});
reloadBtnElect.addEventListener("click", () => {
  ipc.send("reloadApp");
});
// reinicializeBtnElect.addEventListener("click", () => {
//   ipc.send("reinicializeApp");
// });

minimizeBtnElect.addEventListener("click", () => {
  ipc.send("minimizeApp");
});

function changeMaxResBtn(isMaximizeApp) {
  if (isMaximizeApp) {
    maxResBtnElect.title = "Restore";
    // document.getElementById("maxResBtnElect").innerHTML = restoreIcon;
    // maxResBtnElect.innerHtml = restoreIcon;
    maximizeIconElect.style.display = "none";
    restoreIconElect.style.display = "inline-block";
    maxResBtnElect.classList.remove("maximizeBtn");
    maxResBtnElect.classList.add("restoreBtn");
  } else {
    maxResBtnElect.title = "Maximize";
    // document.getElementById("maxResBtnElect").innerHTML = maximizeIcon;
    maximizeIconElect.style.display = "inline-block";
    restoreIconElect.style.display = "none";
    // maxResBtnElect.innerHtml = maximizeIcon;
    maxResBtnElect.classList.add("maximizeBtn");
    maxResBtnElect.classList.remove("restoreBtn");
  }
}
maxResBtnElect.addEventListener("click", () => {
  ipc.send("maximizeApp");
});

ipc.on("isMaximized", () => changeMaxResBtn(true));
ipc.on("isRestored", () => changeMaxResBtn(false));

closeBtnElect.addEventListener("click", () => {
  ipc.send("closeApp");
});
window.addEventListener("keydown", (e) => {
  if (e.code === "F5") ipc.send("reloadApp");
});
