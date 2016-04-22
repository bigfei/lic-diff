var gulp = require('gulp');
var install = require("gulp-install");
var del = require('del');
var minimist = require('minimist');
var diff = require('./lib/diff.js');

gulp.task('default',['clean', 'install']);

gulp.task('clean', function() {
  return del([ 'dist/*', 'new/**/*', 'old/**/*',
      '!new/package.json', '!new/npm-shrinkwrap.json',
      '!old/package.json', '!old/npm-shrinkwrap.json'
    ]);
})

gulp.task('install', ['clean'], function() {
  return gulp.src(['./new/package.json', './old/package.json'])
    .pipe(install({ production: true, ignoreScripts: true}));
})

var options = minimist(process.argv.slice(2), {
   string: ['newDir', 'oldDir'],
  default: {newDir:'./new', oldDir: './old'}
});

gulp.task('diff', function(){
  return diff.outputDiff(options.newDir, options.oldDir, './res.xlsx');
});
