'use strict';

var utils = require('./pouch-utils');

module.exports = function (Pouch) {

  var ALL_DBS_NAME = 'pouch__all_dbs__';
  var pouch;

  function normalize(name) {
    return name.replace(/^_pouch_/, ''); // TODO: remove when fixed in Pouch
  }

  function setup() {
    if (!pouch) {
      pouch = new Pouch(ALL_DBS_NAME);
    }
  }

  function init() {
    Pouch.on('created', function (dbName) {
      setup();
      dbName = normalize(dbName);

      if (dbName === ALL_DBS_NAME) {
        return;
      }
      pouch.get('db_' + dbName).then(function () {
        // db exists, nothing to do
      }).catch(function (err) {
        if (err.name !== 'not_found') {
          console.error(err);
          return;
        }
        pouch.put({_id: 'db_' + dbName}).catch(function (err) {
          console.error(err);
        });
      });
    });

    Pouch.on('destroyed', function (dbName) {
      setup();
      dbName = normalize(dbName);

      pouch.get('db_' + dbName).then(function (doc) {
        pouch.remove(doc).catch(function (err) {
          console.error(err);
        });
      }).catch(function (err) {
        // normally a not_found error; nothing to do
        if (err.name !== 'not_found') {
          console.error(err);
        }
      });
    });
  }

  Pouch.allDbs = utils.toPromise(function (callback) {
    setup();
    pouch.allDocs().then(function (res) {
      var dbs = res.rows.map(function (row) {
        return row.key.replace(/^db_/, '');
      }).filter(function (dbname) {
          return dbname !== ALL_DBS_NAME;
        });
      callback(null, dbs);
    }).catch(function (err) {
      callback(err);
    });
  });

  Pouch.allDbName = function () {
    return ALL_DBS_NAME;
  };

  init();
};

/* istanbul ignore next */
if (typeof window !== 'undefined' && window.PouchDB) {
  exports.sayHello(window.PouchDB);
}
