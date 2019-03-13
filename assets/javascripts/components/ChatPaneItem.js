export default {
  template: `
  <g>
    <polyline
      v-for="line in lines"
      :points="line"
      stroke="black"
      stroke-width="2px"
      fill="none"
    />
  </g>
  `,
  props: {
    text: String
  },
  computed: {
    lines() {
      return this.text.split("\n");
    }
  }
};
