//  gulp

import gulp from "gulp";
import gulpIf from "gulp-if";
import browserSync from "browser-sync";
import plumber from "gulp-plumber";
import { deleteAsync } from "del";
import rename from "gulp-rename";

// html

import htmlMin from "gulp-htmlmin";

// css

import sass from "sass";
import gulpSass from "gulp-sass";
const scssToCss = gulpSass(sass);

import sourcemaps from "gulp-sourcemaps";
import autoprefixer from "gulp-autoprefixer";
import cleanCSS from "gulp-clean-css";
import gcmq from "gulp-group-css-media-queries";
import { stream as critical } from "critical";

// js
import webpack from "webpack-stream";
import terser from "gulp-terser";

// image
import gulpImage from "gulp-image";
import gulpWebp from "gulp-webp";
import gulpAvif from "gulp-avif";
// server

// по умолчанию
let dev = false;

const path = {
  src: {
    base: "src/",
    html: "src/*.html",
    scss: "src/scss/**/*.scss",

    // 1 айл js, потому что через вебпак будем
    js: "src/js/index.js",
    // обязательно без пробелов после запятой
    img: "src/img/**/*.{jpg,svg,jpeg,png,gif}",
    imgF: "src/img/**/*.{jpg,jpeg,png}",
    // ассетсы это файлы, которые не обрабатываются, а просто переносятся.
    // тут добавлять пути к папкам, которые могут появится в проекте
    assets: ["src/fonts/**/*.*", "src/icons/**/*.*"],
  },
  dist: {
    base: "dist/",
    html: "dist/",
    css: "dist/css/",
    js: "dist/js/",
    img: "dist/img/",  
  },
  watch: {
    html: "src/*.html",
    scss: "src/scss/**/*.scss",
    // следим за всеми файлами js
    js: "src/js/**/*.*",
    img: "src/img/**/*.{jpg,svg,jpeg,png,gif}",
    imgF: "src/img/**/*.{jpg,jpeg,png}",
  },
};

export const html = () =>
  gulp
    .src(path.src.html)
    .pipe(
      gulpIf(
        !dev,
        htmlMin({
          // удаляем все комменты  и лишние пробелы при отправлении в продакшн
          removeComments: true,
          collapseWhitespace: true,
        })
      )
    )
    // показывае куда положить
    .pipe(gulp.dest(path.dist.html))
    .pipe(browserSync.stream());

export const scss = () =>
  gulp
    .src(path.src.scss)
    .pipe(gulpIf(dev, sourcemaps.init()))
    .pipe(scssToCss().on("error", scssToCss.logError))
    .pipe(
      gulpIf(
        !dev,
        autoprefixer({
          cascade: false,
        })
      )
    )
    .pipe(gulpIf(!dev, gcmq()))
    .pipe(gulpIf(!dev, gulp.dest(path.dist.css)))
    .pipe(
      gulpIf(
        !dev,
        cleanCSS({
          2: {
            specialComments: 0,
          },
        })
      )
    )
    .pipe(rename({ suffix: ".min" }))
    .pipe(gulpIf(dev, sourcemaps.write()))
    .pipe(gulp.dest(path.dist.css))
    .pipe(browserSync.stream());

// if (!dev) {
//   configWebpack.module.rules.push({
//     test: /\.(js)$/,
//     exclude: /(node_modules)/,
//     loader: "babel-loader",
//     options: {
//       presets: ["@babel/preset-env"],
//       plugins: ["@babel/plugin-transform-runtime"],
//     },
//   });
// }

const configWebpack = {
  mode: dev ? "development" : "production",
  devtool: dev ? "eval-source-map" : false,
  optimization: {
    minimize: false,
  },
  output: {
    filename: "index.js",
  },
  module: {
    rules: [],
  },
};

if (!dev) {
  configWebpack.module.rules.push({
    // здесть перечисляем все js файлы,  такие как файлы тайпскрипта, реакта и тд. пока у нас тощько js чистфый- оставляем так
    test: /\.(js)$/,
    exclude: /(node_modules)/,
    loader: "babel-loader",
    options: {
      presets: ["@babel/preset-env"],
      // без этого плагина не будет работать  асинк авэйт
      plugins: ["@babel/plugin-transform-runtime"],
    },
  });
}

export const js = () =>
  gulp
    .src(path.src.js)
    .pipe(plumber())
    .pipe(webpack(configWebpack))
    .pipe(gulpIf(!dev, gulp.dest(path.dist.js)))
    .pipe(gulpIf(!dev, terser()))
    .pipe(
      rename({
        suffix: ".min",
      })
    )
    .pipe(gulpIf(!dev, gulp.dest(path.dist.js)))
    .pipe(gulp.dest(path.dist.js))
    .pipe(browserSync.stream());

const image = () =>
  gulp
    .src(path.src.img)
    .pipe(
      gulpIf(
        !dev,
        gulpImage({
          optipng: ["-i 1", "-strip all", "-fix", "-o7", "-force"],
          pngquant: ["--speed=1", "--force", 256],
          zopflipng: ["-y", "--lossy_8bit", "--lossy_transparent"],
          jpegRecompress: [
            "--strip",
            "--quality",
            "medium",
            "--min",
            40,
            "--max",
            80,
          ],
          mozjpeg: ["-optimize", "-progressive"],
          gifsicle: ["--optimize"],
          svgo: ["--enable", "cleanupIDs", "--disable", "convertColors"],
        })
      )
    )
    .pipe(gulp.dest(path.dist.img))
    .pipe(
      browserSync.stream({
        once: true,
      })
    );

const webp = () =>
  gulp
    .src(path.src.imgF)
    .pipe(
      gulpWebp({
        quality: dev ? 100 : 70,
      })
    )
    .pipe(gulp.dest(path.dist.img))
    .pipe(
      browserSync.stream({
        once: true,
      })
    );

export const avif = () =>
  gulp
    .src(path.src.imgF)
    .pipe(
      gulpAvif({
        quality: dev ? 100 : 50,
      })
    )
    .pipe(gulp.dest(path.dist.img))
    .pipe(
      browserSync.stream({
        once: true,
      })
    );

export const copy = () =>
  gulp
    .src(path.src.assets, {
      base: path.dist.base,
    })
    .pipe(gulp.dest(path.dist.base))
    .pipe(
      browserSync.stream({
        once: true,
      })
    );

export const server = () => {
  browserSync.init({
    ui: false,
    notify: false,
    host: "localhost",
    tunnel: true,
    server: {
      baseDir: path.dist.base,
    },
  });

  gulp.watch(path.watch.html, html);
  gulp.watch(path.watch.scss, scss);
  gulp.watch(path.watch.js, js);
  gulp.watch(path.watch.img, image);
  gulp.watch(path.watch.imgF, gulp.parallel(webp, avif));
  gulp.watch(path.src.assets, copy);
};

export const clear = () =>
  deleteAsync(path.dist.base, {
    force: true,
  });

const develop = (ready) => {
  dev = true;
  ready();
};

// что бы одновременно запускать несколько тасков и передавать их в  исполнение дальше
export const base = gulp.parallel(html, scss, js, image, avif, webp, copy);


// это продакшн сборка (запуск  gulp build) сначала очищаем дист, потом заполняем по новой
export const build = gulp.series(clear, base);

// сначала запустим режим девелопера, потом base, где у нас все таски,
//  которыми заполняем в итоге dist, потом сервер    (запуск просто gulp)
export default gulp.series(develop, base, server);
