/*jshint expr:true */
'use strict';

var PouchDB = require('pouchdb');

//
// your plugin goes here
//
var plugin = require('../');
plugin(PouchDB);

var chai = require('chai');
chai.use(require("chai-as-promised"));

//
// more variables you might want
//
chai.should(); // var should = chai.should();
var Promise = require('bluebird'); // var Promise = require('bluebird');

var dbs;
if (process.browser) {
  dbs = 'testdb' + Math.random();
} else {
  dbs = process.env.TEST_DB;
}

dbs.split(',').forEach(function (db) {
  var dbType = /^http/.test(db) ? 'http' : 'local';
  tests(db, dbType);
});

function tests(dbName) {
  describe('allDbs', function () {
    this.timeout(10000);

    var dbs = [];

    afterEach(function () {
      // Remove old allDbs to prevent DOM exception
      return Promise.all(dbs.map(function (db) {
        return new PouchDB(db).destroy();
      })).then(function () {
        return PouchDB.resetAllDbs();
      });
    });

    it('new Pouch registered in allDbs', function (done) {
      this.timeout(15000);
      var pouchName = dbName;
      dbs = [dbName];
      function after(err) {
        new PouchDB(pouchName).destroy(function (er) {
          if (er) {
            done(er);
          } else {
            done(err);
          }
        });
      }
      // create db
      var newPouch = new PouchDB(pouchName);
      newPouch.info().then(function() {
        PouchDB.allDbs(function (err, dbs) {
          if (err) {
            return after(err);
          }
          // check if pouchName exists in _all_db
          dbs.some(function (dbname) {
            return dbname === pouchName;
          }).should.equal(true, 'pouch exists in allDbs database, dbs are ' +
            JSON.stringify(dbs) + ', tested against ' + pouchName);
          after();
        });
      });
    });

    it('new Pouch registered in allDbs with a promise', function (done) {
      this.timeout(15000);
      var pouchName = dbName;
      dbs = [dbName];
      function after(err) {
        new PouchDB(pouchName).destroy(function (er) {
          if (er) {
            done(er);
          } else {
            done(err);
          }
        });
      }
      // create db

      var newPouch = new PouchDB(pouchName);
      newPouch.info().then(function() {
        PouchDB.allDbs().then(function (dbs) {
          // check if pouchName exists in _all_db
          dbs.some(function (dbname) {
            return dbname === pouchName;
          }).should.equal(true, 'pouch exists in allDbs database, dbs are ' +
              JSON.stringify(dbs) + ', tested against ' + pouchName);
          after();
        }).catch(after);
      });
    });


    it('Pouch.destroy removes pouch from allDbs', function (done) {
      var pouchName = dbName;
      dbs = [dbName];
      // create db
      var newPouch = new PouchDB(pouchName);
      newPouch.info().then(function() {
        PouchDB.allDbs(function (err, dbs) {
          if (err) {
            return done(err);
          }
          // check if pouchName exists in _all_db
          dbs.some(function (dbname) {
            return dbname === pouchName;
          }).should.equal(true, 'pouch exists in allDbs database, dbs are ' +
              JSON.stringify(dbs) + ', tested against ' + pouchName);
          // remove db
          new PouchDB(pouchName).destroy(function (err) {
            if (err) {
              return done(err);
            }
            PouchDB.allDbs(function (err, dbs) {
              if (err) {
                return done(err);
              }
              // check if pouchName still exists in _all_db
              dbs.some(function (dbname) {
                return dbname === pouchName;
              }).should.equal(false,
                  'pouch no longer exists in allDbs database, dbs are ' +
                  JSON.stringify(dbs) + ', tested against ' + pouchName);
              done();
            });
          });
        });
      });
    });
    it('Create Multiple Pouches', function (done) {
      var pouchNames = [dbName + '_1', dbName + '_2'];
      dbs = pouchNames;
      
      Promise.all(pouchNames.map(function (pouch) {
        var newPouch = new PouchDB(pouch);
        return newPouch.info();
      })).then(function () {
        PouchDB.allDbs(function (err, dbs) {
          if (err) {
            return done(err);
          }
          pouchNames.forEach(function (pouch) {
            // check if pouchName exists in _all_db
            dbs.some(function (dbname) {
              return dbname === pouch;
            }).should.equal(true, 'pouch name not found in allDbs, dbs are ' +
                JSON.stringify(dbs) + ', tested against ' + pouch);
          });
          // destroy remaining pouches
          Promise.all(pouchNames.map(function (pouch) {
            return new PouchDB(pouch).destroy();
          })).then(function() {
            done();
          }).catch(function (err) {
            done(err);
          });
        });
      }).catch(function (err) {
        done(err);
      });
    });
    it('Create and Destroy Multiple Pouches', function (done) {
      var pouchNames = [dbName + '_1', dbName + '_2'];
      dbs = pouchNames;

      Promise.all(pouchNames.map(function (pouch) {
        var newPouch = new PouchDB(pouch);
        return newPouch.info();
      })).then(function () {
        PouchDB.allDbs(function (err, dbs) {
          if (err) {
            return done(err);
          }
          // check if pouchName exists in _all_db
          pouchNames.forEach(function (pouch) {
            dbs.some(function (dbname) {
              return dbname === pouch;
            }).should.equal(true);
          });
          //
          // Destroy all Pouches
          //
          Promise.all(pouchNames.map(function (pouch) {
            return new PouchDB(pouch).destroy();
          })).then(function() {
            PouchDB.allDbs(function (err, dbs) {
              if (err) {
                return done(err);
              }
              // check if pouchName exists in _all_db
              pouchNames.forEach(function (pouch) {
                dbs.some(function (dbname) {
                  return dbname === pouch;
                }).should.equal(false,
                    'pouch name found in allDbs after its destroyed, dbs are ' +
                    JSON.stringify(dbs) + ', tested against ' + pouch);
              });
              done();
            });
          }).catch(function (err) {
            done(err);
          });
        });
      }).catch(function (err) {
        done(err);
      });
    });
    it('doesn\'t return the mapreduce db', function (done) {
      var pouchName = dbName;
      dbs = [dbName];
      // create db
      var db = new PouchDB(pouchName);
      db.info().then(function() {
        var ddoc = {
          _id: "_design/foo",
          views: {
            foo: {
              map: function () {}.toString()
            }
          }
        };
        db.put(ddoc).then(function (info) {
          ddoc._rev = info.rev;
          return db.query('foo');
        }).then(function () {
          return PouchDB.allDbs();
        }).then(function (dbs) {
          dbs.should.have.length(1);
          return db.remove(ddoc);
        }).then(function () {
          return db.viewCleanup();
        }).then(function () {
          return PouchDB.allDbs();
        }).then(function (dbs) {
          dbs.should.have.length(1);
        }).then(function () { done(); }, done);
      }).catch(function(err) {
        done(err);
      });
    });

    // Test for return value of allDbs
    // The format should follow the following rules:
    // 1. if an adapter is specified upon Pouch creation, the dbname will
    // include the adapter prefix
    //   - eg. "idb://testdb"
    // 2. Otherwise, the dbname will just contain the dbname (without the
    // adapter prefix)
    it('Create and Destroy Pouches with and without adapter prefixes',
        function (done) {
      var pouchNames = [dbName + '_1', dbName + '_2'];
      dbs = pouchNames;
      Promise.all(pouchNames.map(function (pouch) {
        var newPouch = new PouchDB(pouch);
        return newPouch.info();
      })).then(function () {
        // check allDbs output
        PouchDB.allDbs(function (err, dbs) {
          if (err) {
            return done(err);
          }
          pouchNames.forEach(function (pouch) {
            // check if pouchName exists in allDbs
            dbs.some(function (dbname) {
              return dbname === pouch;
            }).should.equal(true, 'pouch name not found in allDbs, dbs are ' +
                JSON.stringify(dbs) + ', tested against ' + pouch);
          });
          // destroy pouches
          Promise.all(pouchNames.map(function (pouch) {
            return new PouchDB(pouch).destroy();
          })).then(function() {
            if (err) {
              return done(err);
            }
            // Check that pouches no longer exist in allDbs
            PouchDB.allDbs(function (err, dbs) {
              if (err) {
                return done(err);
              }
              // check if pouchName exists in _all_db
              pouchNames.forEach(function (pouch) {
                dbs.some(function (dbname) {
                  return dbname === pouch;
                }).should.equal(false,
                    'pouch name found in allDbs after its destroyed, dbs are ' +
                    JSON.stringify(dbs) + ', tested against ' + pouch);
              });
              done();
            });
          }).catch(function (err) {
            done(err);
          });
        });
      }).catch(function (err) {
        done(err);
      });
    });

    it('saves databases with names starting with an underscore.', function (done) {
      var pouchName = "_" + dbName;
      dbs = [pouchName];
      // create db

      var db = new PouchDB(pouchName);
      db.info().then(function() {
        PouchDB.allDbs(function (err, allDbs) {
          if (err) {
            return done(err);
          }
          allDbs.should.deep.equal(dbs);
          done();
        });
      }).catch(function(err) {
        done(err);
      });
    });
  });
}
