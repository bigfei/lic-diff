var gulp = require('gulp'),
 install = require("gulp-install");

gulp.task('default', function() {
});

gulp.task('clean', function() {

})

gulp.task('install', function() {
  gulp.src(['./new/package.json', './old/package.json'])
    .pipe(install({
      production: true,
      ignoreScripts: true
    }));
})
