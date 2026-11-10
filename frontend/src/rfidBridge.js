const MAX_CHARS = 20000;
const RETRY_DELAY_MS = 80;
const MAX_RETRY = 8;
const TEXT_INPUT_TYPES = new Set(["text", "search", ""]);

const setters = {
  TEXTAREA: Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set,
  INPUT: Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set,
};

let queue = "";
let retries = 0;
let timer = null;
let port = null;

function focusedField() {
  const el = document.activeElement;
  if (!el || !setters[el.tagName] || el.readOnly || el.disabled) return null;
  if (el.tagName === "INPUT" && !TEXT_INPUT_TYPES.has((el.getAttribute("type") || "").toLowerCase())) return null;
  return el;
}

function flush() {
  timer = null;
  if (!queue) return;
  const el = focusedField();
  if (!el) {
    if (retries++ < MAX_RETRY) {
      timer = setTimeout(flush, RETRY_DELAY_MS);
    } else {
      queue = "";
      retries = 0;
    }
    return;
  }
  retries = 0;
  let next = el.value + queue;
  queue = "";
  if (next.length > MAX_CHARS) next = next.slice(next.indexOf("\n", next.length - MAX_CHARS) + 1);
  setters[el.tagName].call(el, next);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  followCaret(el);
}

// Gán value bằng code thì trình duyệt không tự cuộn theo con trỏ như khi gõ phím:
// ô nhập đứng yên ở đầu, mã mới nằm khuất bên dưới. Đưa con trỏ về cuối rồi cuộn tới đó.
// Gọi lại ở frame sau vì React có thể vẽ lại ô nhập sau sự kiện input.
function followCaret(el) {
  const go = () => {
    if (!el.isConnected) return;
    const end = el.value.length;
    try {
      el.setSelectionRange(end, end);
    } catch {
      // một số loại input không hỗ trợ selection
    }
    if (el.tagName === "TEXTAREA") el.scrollTop = el.scrollHeight;
    else el.scrollLeft = el.scrollWidth;
  };
  go();
  requestAnimationFrame(go);
}

function receive(data) {
  if (typeof data !== "string" || data.length === 0) return;
  queue += data;
  if (!timer) flush();
}

function onPortMessage(event) {
  receive(event.data);
}

const APP_ORIGIN = "android-app://" + window.location.hostname;

window.addEventListener("message", (event) => {
  if (!event.isTrusted || event.origin !== APP_ORIGIN || event.source !== null) return;
  if (!event.ports || !event.ports[0]) return;
  if (event.ports[0] !== port) {
    if (port) {
      port.onmessage = null;
      port.close();
    }
    port = event.ports[0];
    port.onmessage = onPortMessage;
    port.postMessage("ready");
  }
  receive(event.data);
});
