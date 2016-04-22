"use strict"

var fs = require('fs'),
  nlf = require('nlf'),
  _ = require('underscore'),
  async = require('async'),
  path = require('path'),
  semver = require('semver'),
  XLSX = require('XLSX'),
  format = require('./csv-output.js');

var f1 = function(directory, callback) {
  var t1 = {};
  nlf.find({
    directory: directory || process.cwd(),
    production: true
  }, function(err, data) {
    _.each(data, function(d) {
      if (!_.has(t1, d.name)) {
        t1[d.name] = {};
        t1[d.name]['@' + d.version] = d;
      } else {
        t1[d.name]['@' + d.version] = d;
      }
    })
    callback(null, t1);
  });
};

var f2 = function(filename, callback) {
  var t2 = {};
  fs.readFile(path.resolve(process.cwd(), filename), {
    encoding: 'utf-8'
  }, function(err, data) {
    var lines = data.split('\n');
    _.each(lines, function(l) {
      var s = l.split(',');
      var name = s[0],
        version = s[1];
      if (!_.has(t2, name)) {
        t2[name] = {};
        t2[name]['@' + version] = s;
      } else {
        t2[name]['@' + version] = s;
      }
    });
    callback(null, t2);
  })
};

var Workbook = function() {
  if (!(this instanceof Workbook)) return new Workbook();
  this.SheetNames = [];
  this.Sheets = {};
};

var outputDiff = function(newDir, oldDir, xlsxName) {
  async.series([f1.bind(undefined, newDir), f1.bind(undefined, oldDir)], function(err, results) {
    if (err) {
      console.log("Error")
    } else {
      var t1 = results[0];
      var t2 = results[1];

      var wb = new Workbook();

      var added = {},
        deleted = {},
        changes = {};

      _.each(t1, function(versions, name) {
        var versionsT1 = _.keys(t1[name]).map(function(e) {
          return e.slice(1)
        });
        var maxt1 = _.first(versionsT1.sort(function(a, b) {
          return semver.rcompare(a, b)
        }));

        if (!_.has(t2, name)) {
          added[name] = versions['@' + maxt1];
        } else { //version might get changed
          var versionsT2 = _.keys(t2[name]).map(function(e) {
            return e.slice(1)
          });
          var maxt2 = _.first(versionsT2.sort(function(a, b) {
            return semver.rcompare(a, b)
          }));
          if (semver.gt(maxt1, maxt2)) {
            changes[name] = {};
            changes[name]['new'] = versions['@' + maxt1];
            changes[name]['old'] = t2[name]['@' + maxt2];
          }
        }
      })

      _.each(t2, function(versions, name) {
        if (!_.has(t1, name)) {
          deleted[name] = versions;
        }
      });

      var res = {"Added": added, "Deleted": deleted, "Changed": changes };

      async.forEachOfSeries(res, function(r, ws_name, callback) {
        format.render(r, ws_name, wb, callback);
      }, function(err) {
        if (err) {
          console.err("errors occurred.")
        } else {
          XLSX.writeFile(wb, xlsxName);
          console.log(xlsxName + ' generated.');
        }
      });

      /*format.render(added, "Added", wb, function(err, wb) {
        format.render(deleted, "Deleted", wb, function(err, wb) {
          format.render(changes, "Changed", wb, function(err, wb) {

          })
        })
      })*/

      /*format.render(added, function(err, csv){
        fs.writeFile('added.csv', csv, function(err) {
          if (err) throw err;
          console.log('It\'s saved!');
        });
      })*/
    }
  });
};

if (require.main === module) {
  var args = process.argv.slice(2);
  diff(args[0], args[1], 'test.xlsx');
}

module.exports = {
  outputDiff: outputDiff
};
