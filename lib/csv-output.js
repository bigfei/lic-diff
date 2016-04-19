"use strict"

var json2csv = require('json2csv'),
  _ = require('underscore'),
  XLSX = require('XLSX');

var fieldNames = ['Component Name', 'Version', 'directory', 'Download URL', 'License Type', 'License Terms', 'Package.json', 'README'];

var fieldNamesVersionChanges = ['Component Name', 'Old Version', 'New Version', 'directory', 'Download URL', 'License Type', 'License Terms', 'Package.json', 'README'];

var fields = ['name', 'version', 'directory', 'repository', 'summary', 'licenseText', 'packageJson', 'readmeText'];

function recordToPlainJSON(moduleRecord) {
  if (moduleRecord.licenseSources) { //nlf returns for added.
    var license = _.first(moduleRecord.licenseSources.license.sources);
    var packageJson = _.first(moduleRecord.licenseSources.package.sources);
    var packageLicense = packageJson && packageJson.license;
    var packageJsonUrl = packageJson && packageJson.url;
    var readme = _.first(moduleRecord.licenseSources.readme.sources);
    return {
      'name': moduleRecord.name,
      'version': moduleRecord.version,
      'directory': moduleRecord.directory,
      'repository': moduleRecord.repository,
      'summary': moduleRecord.summary().join(';'),
      'licenseText': license ? license.text : "",
      'packageJson': (packageLicense ? packageLicense : "(NULL)" + "-" + packageJsonUrl ? packageJsonUrl : "(NULL)") || '',
      'readmeText': "" //readme ? readme.text : ""
    }

  } else {//delted content from cc.csv
    return {
      'name': moduleRecord[0],
      'version': moduleRecord[1],
      'directory': "",
      'repository': "",
      'summary': "",
      'licenseText': "",
      'packageJson': '',
      'readmeText': ""
    }
  }
}

function changedRecordToPlainJSON(newRec, oldRec){
  if (newRec.licenseSources) { //nlf returns for added.
    var license = _.first(newRec.licenseSources.license.sources);
    var packageJson = _.first(newRec.licenseSources.package.sources);
    var packageLicense = packageJson && packageJson.license;
    var packageJsonUrl = packageJson && packageJson.url;
    var readme = _.first(newRec.licenseSources.readme.sources);
    return {
      'name': newRec.name,
      'old-version': oldRec[1] || oldRec.version,
      'new-version': newRec.version,
      'directory': newRec.directory,
      'repository': newRec.repository,
      'summary': newRec.summary().join(';'),
      'licenseText': license ? license.text : "",
      'packageJson': (packageLicense ? packageLicense : "(NULL)" + "-" + packageJsonUrl ? packageJsonUrl : "(NULL)") || '',
      'readmeText': "" //readme ? readme.text : ""
    }

  }
}

function datenum(v, date1904) {
  if (date1904) v += 1462;
  var epoch = Date.parse(v);
  return (epoch - new Date(Date.UTC(1899, 11, 30))) / (24 * 60 * 60 * 1000);
}

function sheet_from_array_of_arrays(data, opts) {
  var ws = {};

  var range = {s: {c: 10000000, r: 10000000 }, e: {c: 0, r: 0 }};
  for (var R = 0; R != data.length; ++R) {
    for (var C = 0; C != data[R].length; ++C) {
      if (range.s.r > R) range.s.r = R;
      if (range.s.c > C) range.s.c = C;
      if (range.e.r < R) range.e.r = R;
      if (range.e.c < C) range.e.c = C;

      var cell = {v: data[R][C] };
      if (cell.v == null) continue;

      var cell_ref = XLSX.utils.encode_cell({c: C, r: R });

      if (typeof cell.v === 'number') cell.t = 'n';
      else if (typeof cell.v === 'boolean') cell.t = 'b';
      else if (cell.v instanceof Date) {
        cell.t = 'n';
        cell.z = XLSX.SSF._table[14];
        cell.v = datenum(cell.v);
      } else cell.t = 's';

      ws[cell_ref] = cell;
    }
  }
  if (range.s.c < 10000000) ws['!ref'] = XLSX.utils.encode_range(range);
  return ws;
};
function render(t, ws_name, wb, cb) {
  var recs = [];
  if (ws_name === 'Changed') {
    recs.push(fieldNamesVersionChanges);
    _.each(t, function(change, name) {
      recs.push(_.values(changedRecordToPlainJSON(change.new, change.old)));
    });
  } else if (ws_name === 'Added') {
    recs.push(fieldNames);
    _.each(t, function(version, name) {
      recs.push(_.values(recordToPlainJSON(version)));
    });
  } else {
    recs.push(fieldNames);
    _.each(t, function(versions, name) {
      _.each(versions, function(rec, ver) {
        //recs.push(recordToPlainJSON(rec));
        recs.push(_.values(recordToPlainJSON(rec)));
      })
    });
  }
  //recs.push(_.values(changedRecordToPlainJSON(rec)));
  var opts = {
    data: recs,
    fields: fields,
    fieldNames: fieldNames,
    eol: '\r\n'
  };

  var ws = sheet_from_array_of_arrays(recs);
  wb.SheetNames.push(ws_name);
  wb.Sheets[ws_name] = ws;

  cb(null, wb);
};
module.exports = {
  render: render
};