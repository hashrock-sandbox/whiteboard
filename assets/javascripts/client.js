//@ts-check

// client side socket

const socket = io();

let id;
let handle;

// drawing

var canvas;

var ctx;
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

var scale = 1;
var offset = { x: 0, y: 0 };

function translate() {
  var s = `translate(${offset.x}px, ${offset.y}px) scale(${scale})`;
  const el = document.querySelector("#whiteboard");
  if (el instanceof HTMLCanvasElement) {
    el.style.transform = s;
  }
}

const palette = [
  "#000000",
  "#FFFFFF",
  "#5f5750",
  "#82759a",
  "#c0c1c5",
  "#fff0e7",
  "#7d2953",
  "#ff074e",
  "#ff76a6",
  "#a95238",
  "#ffa108",
  "#feeb2c",
  "#ffcaa8",
  "#008551",
  "#00e339",
  "#222e53",
  "#2cabfe"
];

const penWidthList = [1, 2, 3, 5, 10, 20, 30, 50];

var chatFlag = false;
var chatPp = { x: 0, y: 0 };

//@ts-ignore
new Vue({
  el: "#app",
  data() {
    return {
      count: 0,
      palette: palette,
      selectedColor: color,
      selectedWidth: width,
      points: [],
      lines: [],
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
    chatDown(e) {
      if (!e.isPrimary) {
        return;
      }
      const bound = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - bound.left;
      const y = e.clientY - bound.top;
      chatFlag = true;
      this.points.push([x, y]);
    },
    chatMove(e) {
      if (!e.isPrimary) {
        return;
      }
      if (chatFlag) {
        const bound = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - bound.left;
        const y = e.clientY - bound.top;
        this.points.push([x, y]);
      }
    },
    chatUp(e) {
      if (!e.isPrimary) {
        return;
      }
      chatFlag = false;
      this.lines.push(this.points);
      this.points = [];
    },
    lineToString(line) {
      return line.map(p => p.join(" ")).join(" ");
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
    sendChat() {
      socket.emit("chat", {
        handle,
        text: this.lines.map(l => l.join(" ")).join("\n")
      });
      this.lines = [];
    },
    clearChat() {
      this.lines = [];
    },
    appendMessage(chat) {
      this.messages.push(chat);
    }
  },
  computed: {
    pointsString() {
      return this.points.map(p => p.join(" ")).join(" ");
    },
    messagesLast() {
      return this.messages
        .slice()
        .reverse()
        .slice(0, 10);
    }
  },
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
  }
});
