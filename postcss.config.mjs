const config = {
  plugins: {
    // No Tailwind minify: in production it folds `rounded-full`'s
    // `calc(infinity * 1px)` to `3.40282e38px`, and pxtorem below then reads
    // the `38px` tail as a length, leaving an elliptical `340px .375rem`
    // radius. Next minifies the CSS after PostCSS anyway, as dev already runs.
    "@tailwindcss/postcss": { optimize: false },
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
