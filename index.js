'use strict';

var utils = require('./pouch-utils');
var TaskQueue = require('./taskqueue');

module.exports = function (Pouch) {

  var ALL_DBS_NAME = 'pouch__all_dbs__';
  var pouch;
  var queue = new TaskQueue();

  function log(err) {
    if (err) {
      console.error(err); // shouldn't happen
    }
  }
  
  function init() {
    queue.add(function (callback) {
      if (pouch) {
        return callback();
      }
      new Pouch(ALL_DBS_NAME).then(function (db) {
        pouch = db;
        callback();
      }).catch(function (err) {
        console.error(err);
        callback(err);
      });
    });
  }

  function normalize(name) {
    return name.replace(/^_pouch_/, ''); // TODO: remove when fixed in Pouch
  }

  Pouch.on('created', function (dbName) {
    dbName = normalize(dbName);

    if (dbName === ALL_DBS_NAME) {
      return;
    } else if (dbName.indexOf('-mrview-') !== -1) {
      // HACK: get rid of this when we have a real 'onDependentDbRegistered'
      // event (pouchdb/pouchdb#2438)
      return;
    }
    init();
    queue.add(function (callback) {
      pouch.get(dbName).then(function () {
        // db exists, nothing to do
      }).catch(function (err) {
        if (err.name !== 'not_found') {
          throw err;
        }
        return pouch.put({_id: dbName});
      }).then(function () {
        callback();
      }, callback);
    }, log);
  });

  Pouch.on('destroyed', function (dbName) {
    dbName = normalize(dbName);
    if (dbName === ALL_DBS_NAME) {
      return;
    }
    init();
    queue.add(function (callback) {
      pouch.get(dbName).then(function (doc) {
        return pouch.remove(doc);
      }).catch(function (err) {
        // normally a not_found error; nothing to do
        if (err.name !== 'not_found') {
          throw err;
        }
      }).then(function () {
        callback();
      }, callback);
    }, log);
  });

  Pouch.allDbs = utils.toPromise(function (callback) {
    init();
    queue.add(function (callback) {
      pouch.allDocs().then(function (res) {
        var dbs = res.rows.map(function (row) {
          return row.key;
        });
        callback(null, dbs);
      }).catch(function (err) {
        console.error(err);
        callback(err);
      });
    }, callback);
  });

  Pouch.resetAllDbs = utils.toPromise(function (callback) {
    queue.add(function (callback) {
      pouch.destroy().then(function () {
        pouch = null;
        callback();
      }).catch(function (err) {
        console.error(err);
        callback(err);
      });
    }, callback);
  });
};

/* istanbul ignore next */
if (typeof window !== 'undefined' && window.PouchDB) {
  module.exports(window.PouchDB);
}
