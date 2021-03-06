//@ts-check
//@ts-ignore
import Vue from "https://cdn.jsdelivr.net/npm/vue@2.6.8/dist/vue.esm.browser.js";
import { palette, penWidthList } from "./config.js";
import ChatPane from "./components/ChatPane.js";

// client side socket
//@ts-ignore
const socket = io();

let id;
let handle;

// drawing
let canvas;

let ctx;
let flag = false;
let prevX = 0;
let prevY = 0;
let currX = 0;
let currY = 0;
let width = 2;
let color = "black";

function updateXY(e) {
  const mouseX = applyZoomX(e.clientX - canvas.offsetLeft);
  const mouseY = applyZoomY(e.clientY - canvas.offsetTop);
  if (e.type === "pointerdown") {
    prevX = mouseX;
    prevY = mouseY;
    currX = mouseX;
    currY = mouseY;
  } else if (e.type === "pointermove") {
    prevX = currX;
    prevY = currY;
    currX = mouseX;
    currY = mouseY;
  }
}

function applyZoomX(x) {
  return (x - offset.x) / scale;
}
function applyZoomY(x) {
  return (x - offset.y) / scale;
}

function emitMouse(type, e) {
  const mouseX = e.clientX - canvas.offsetLeft;
  const mouseY = e.clientY - canvas.offsetTop;
  socket.emit("draw", {
    type,
    color,
    width,
    id,
    canvasX: applyZoomX(mouseX),
    canvasY: applyZoomY(mouseY)
  });
}

function draw(stroke) {
  ctx.beginPath();
  ctx.moveTo(stroke.prevX, stroke.prevY);
  ctx.lineTo(stroke.currX, stroke.currY);
  ctx.lineWidth = stroke.width;
  ctx.strokeStyle = stroke.color;
  ctx.stroke();
  ctx.closePath();
}

let scale = 1;
let offset = { x: 0, y: 0 };

function translate() {
  let s = `translate(${offset.x}px, ${offset.y}px) scale(${scale})`;
  const el = document.querySelector("#whiteboard");
  if (el instanceof HTMLCanvasElement) {
    el.style.transform = s;
  }
}

new Vue({
  el: "#app",
  components: { ChatPane },
  data() {
    return {
      count: 0,
      discord: {
        members: []
      },
      palette: palette,
      selectedColor: color,
      selectedWidth: width,
      messages: [],
      penWidthList: penWidthList
    };
  },
  methods: {
    clearCanvas() {
      if (confirm("Clear Whiteboard?")) {
        socket.emit("clear");
      }
    },
    zoom(s) {
      scale *= s;
      translate();
      return false;
    },
    move(x, y) {
      offset.x += x;
      offset.y += y;
      translate();
      return false;
    },
    reset() {
      offset.x = 0;
      offset.y = 0;
      scale = 1;
      translate();
    },

    onPointerMove(e) {
      if (!e.isPrimary) {
        return;
      }
      if (flag) {
        updateXY(e);
        draw({ prevX, prevY, currX, currY, width, color });
        emitMouse("move", e);
      }
    },
    onPointerDown(e) {
      if (!e.isPrimary) {
        return;
      }
      flag = true;
      canvas.setPointerCapture(e.pointerId);
      updateXY(e);
      draw({ prevX, prevY, currX, currY, width, color });
      emitMouse("down", e);
    },
    onPointerUp(e) {
      if (!e.isPrimary) {
        return;
      }
      flag = false;
    },

    initCanvas() {
      canvas = this.$refs.mainCanvas;
      ctx = canvas.getContext("2d");
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    },
    selectColor(c) {
      this.selectedColor = c;
      color = c;
    },
    setPenWidth(w) {
      this.selectedWidth = w;
      width = w;
    },
    sendChat(payload) {
      socket.emit("chat", {
        handle,
        text: payload
      });
    },
    appendMessage(chat) {
      this.messages.push(chat);
    }
  },
  computed: {},
  mounted() {
    socket.on(
      "load",
      ({ connectionId, userCount, strokeHistory, chatHistory }) => {
        id = connectionId;
        handle = `Client ${id}`;
        // load global state: canvas, chat messages, & user count
        for (const stroke of strokeHistory) draw(stroke);
        for (const chat of chatHistory) this.appendMessage(chat);

        this.count = userCount;
      }
    );

    socket.on("draw", ({ stroke }) => {
      draw(stroke);
    });

    socket.on("clear", () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    socket.on("chat", message => {
      this.appendMessage(message);
    });

    socket.on("count", userCount => {
      this.count = userCount;
    });

    this.initCanvas();

    fetch("https://discordapp.com/api/guilds/556500807508557825/widget.json")
      .then(i => i.json())
      .then(body => {
        this.discord = body;
      });
  }
});
