const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    // Rewrites every px length Tailwind emits, the `text-[13px]` arbitrary
    // values included, as rem, so `--ui-scale` in globals.css scales the whole
    // UI from one place. Under 2px stays px so hairline borders stay crisp.
    // Media queries are left alone, so breakpoints stay put.
    "postcss-pxtorem": {
      rootValue: 16,
      propList: ["*"],
      minPixelValue: 2,
      exclude: "node_modules",
    },
  },
};

export default config;
