//@ts-check
import ChatPaneItem from "./ChatPaneItem.js";

export default {
  template: `
  <div>
    <svg
      v-for="(message, idx) in messagesLast"
      :key="message._id"
      viewBox="0 0 300 150"
      width="150"
      height="75"
      touch-action="none"
      style="transition: all ease 1s;position: absolute; right: 0; background: rgba(255,255,255,0.8); border: 1px solid #CCC; border-radius: 4px;"
      :style="{'bottom': idx * 80 + 150 + 'px'}"
      @touchend.prevent
    >
      <chat-pane-item :text="message.text"></chat-pane-item>
    </svg>

    <svg
      width="300"
      height="150"
      touch-action="none"
      style="position: absolute; right: 0; bottom: 0; border: 1px solid #333; background: white;"
      @pointerdown="chatDown"
      @pointermove="chatMove"
      @pointerup="chatUp"
      @touchend.prevent="chatUp"
    >
      <polyline
        :points="pointsString"
        stroke="black"
        stroke-width="2px"
        fill="none"
      />
      <polyline
        v-for="line in lines"
        :points="lineToString(line)"
        stroke="black"
        stroke-width="2px"
        fill="none"
      />
    </svg>
    <button
      class="chat__clear"
      @pointerdown="clearChat"
      @touchend.prevent
      touch-action="none"
    >
      Clear
    </button>
    <button
      class="chat__send"
      @pointerdown="sendChat"
      @touchend.prevent
      touch-action="none"
    >
      Send
    </button>
  </div>
  `,
  props: {
    messages: Array
  },
  components: {
    ChatPaneItem
  },
  data() {
    return {
      chatFlag: false,
      points: [],
      lines: []
    };
  },
  computed: {
    messagesLast() {
      return this.messages
        .slice()
        .reverse()
        .slice(0, 10);
    },
    pointsString() {
      return this.points.map(p => p.join(" ")).join(" ");
    }
  },

  methods: {
    chatDown(e) {
      if (!e.isPrimary) {
        return;
      }
      const bound = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - bound.left;
      const y = e.clientY - bound.top;
      this.chatFlag = true;
      this.points.push([x, y]);
    },
    chatMove(e) {
      if (!e.isPrimary) {
        return;
      }
      if (this.chatFlag) {
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
      this.chatFlag = false;
      this.lines.push(this.points);
      this.points = [];
    },
    lineToString(line) {
      return line.map(p => p.join(" ")).join(" ");
    },

    sendChat() {
      this.$emit("send", this.lines.map(l => l.join(" ")).join("\n"));
      this.lines = [];
    },
    clearChat() {
      this.$emit("clear");
      this.lines = [];
    }
  }
};
