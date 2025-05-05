import { defineConfig } from "cypress";

export default defineConfig({
  projectId: 'ge415s',
  component: {
    devServer: {
      framework: "next",
      bundler: "webpack",
    },
  },

});

