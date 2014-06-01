'use strict';

var utils = require('./pouch-utils');
var TaskQueue = require('./taskqueue');

module.exports = function (Pouch) {

  var ALL_DBS_NAME = 'pouch__all_dbs__';
  var pouch = new Pouch(ALL_DBS_NAME);
  var queue = new TaskQueue();

  function normalize(name) {
    return name.replace(/^_pouch_/, ''); // TODO: remove when fixed in Pouch
  }

  Pouch.on('created', function (dbName) {
    dbName = normalize(dbName);

    if (dbName === ALL_DBS_NAME) {
      return;
    }
    queue.add(function (callback) {
      pouch.get(dbName).then(function () {
        // db exists, nothing to do
      }).catch(function (err) {
        if (err.name !== 'not_found') {
          console.error(err);
          return;
        }
        pouch.put({_id: dbName}).catch(function (err) {
          console.error(err);
        });
      }).then(function () {
        callback();
      });
    });
  });

  Pouch.on('destroyed', function (dbName) {
    dbName = normalize(dbName);
    if (dbName === ALL_DBS_NAME) {
      return;
    }
    queue.add(function (callback) {
      pouch.get(dbName).then(function (doc) {
        pouch.remove(doc).catch(function (err) {
          console.error(err);
        });
      }).catch(function (err) {
        // normally a not_found error; nothing to do
        if (err.name !== 'not_found') {
          console.error(err);
        }
      }).then(function () {
        callback();
      });
    });
  });

  Pouch.allDbs = utils.toPromise(function (callback) {
    console.log('adding to queue');
    queue.add(function (callback) {
      console.log('being called');
      pouch.allDocs().then(function (res) {
        var dbs = res.rows.map(function (row) {
          return row.key;
        });
        callback(null, dbs);
      }).catch(function (err) {
        callback(err);
      });
    }, callback);
  });

  Pouch.allDbsName = function () {
    return ALL_DBS_NAME;
  };

};

/* istanbul ignore next */
if (typeof window !== 'undefined' && window.PouchDB) {
  module.exports(window.PouchDB);
}
