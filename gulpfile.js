import browserSyncLib from "browser-sync";

import { src, dest, watch, parallel, series } from "gulp";
import gulpSass from "gulp-sass";
import * as dartSass from "sass";
import autoprefixer from "gulp-autoprefixer";
import cleanCSS from "gulp-clean-css";
import htmlMin from "gulp-htmlmin";
import changed from "gulp-changed";
import sourcemaps from "gulp-sourcemaps";
import concat from "gulp-concat";
import gulpIf from "gulp-if";
import urlAdjuster from "gulp-css-url-adjuster";
import imagemin, { mozjpeg, svgo, optipng } from "gulp-imagemin";
import imageminPngquant from "imagemin-pngquant";
import { deleteAsync } from "del";
import chalk from "chalk";

const devServer = browserSyncLib.create("coffee-shop-ui");
const sass = gulpSass(dartSass);

const isProd = process.env.NODE_ENV === "production";
const PORT = 9000;

const paths = {
  scripts: {},
  html: {
    src: "src/*.html",
    dest: "dist/",
  },
  styles: {
    src: "src/scss/main.scss",
    watch: "src/scss/**/*.scss",
    dest: "dist/css/",
  },
  images: {
    src: "src/images/**/*.{png,svg,jpeg,jpg}",
    dest: "dist/images/",
  },
  fonts: {
    src: "src/fonts/*",
    dest: "dist/fonts/",
  },
};

export function clean() {
  return deleteAsync(["dist/**", "!dist"]);
}

export function serve() {
  devServer.init(
    {
      open: false,
      notify: false,
      port: 9000,
      server: {
        baseDir: "dist/",
      },
      logLevel: "warn",
      logPrefix: chalk.blue.bold("coffee-shop-ui".toUpperCase()),
      browser: ["google chrome", "firefox"],
      reloadDelay: 2000,
    },
    () => {
      console.log(chalk.blue.bold(`Сервер успешно запущен на порту ${PORT}`));
    }
  );
  watch(paths.html.src, html);
  watch(paths.styles.watch, styles);
  watch(paths.images.src, images);
}

export function html() {
  return src(paths.html.src)
    .pipe(
      htmlMin({
        collapseWhitespace: true,
      })
    )
    .pipe(dest(paths.html.dest))
    .pipe(devServer.stream());
}

export function styles() {
  return src(paths.styles.src)
    .pipe(changed(paths.styles.dest))
    .pipe(gulpIf(!isProd, sourcemaps.init()))
    .pipe(sass().on("error", sass.logError))
    .pipe(
      urlAdjuster({
        replace: ["../../fonts/", "../fonts/"],
      })
    )
    .pipe(concat("style.min.css"))
    .pipe(gulpIf(isProd, autoprefixer({ cascade: false })))
    .pipe(gulpIf(isProd, cleanCSS({ level: 2 })))
    .pipe(gulpIf(!isProd, sourcemaps.write(".")))
    .pipe(dest(paths.styles.dest))
    .pipe(devServer.stream());
}

export function images() {
  return src(paths.images.src, { encoding: false })
    .pipe(changed(paths.images.dest))
    .pipe(
      gulpIf(
        isProd,
        imagemin([
          mozjpeg({ quality: 60, progressive: true }),
          imageminPngquant({
            speed: 2,
            quality: [0.6, 0.8],
            strip: true,
            dithering: 0.5,
          }),
          optipng({
            optimizationLevel: 7,
            bitDepthReduction: true,
            colorTypeReduction: true,
            paletteReduction: true,
          }),
          svgo({
            plugins: [{ name: "removeViewBox", active: false }],
          }),
        ])
      )
    )
    .pipe(dest(paths.images.dest))
    .pipe(devServer.stream());
}

export function copyFonts() {
  return src(paths.fonts.src, { encoding: false }).pipe(dest(paths.fonts.dest));
}

export const build = series(clean, parallel(html, styles, images, copyFonts));

export default parallel(serve);
