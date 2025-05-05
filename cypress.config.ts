import { defineConfig } from "cypress";

export default defineConfig({
  projectId: "j5dpf1",
  component: {
    devServer: {
      framework: "next",
      bundler: "webpack",
    },
  },
});

