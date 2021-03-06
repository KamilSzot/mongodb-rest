'use strict';

//
// Integration tests for mongodb-rest.
//

var testDbName = 'mongodb_rest_test'
var testCollectionName = 'mongodb_test_collection'

var url = 'http://localhost:3000/';
var dbsUrl = url + 'dbs';
var collectionsUrl = url + testDbName;
var collectionUrl = collectionsUrl + '/' + testCollectionName;

var utils = require('./testutils');

var request = require('request');
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;

var load = utils.loadFixture;
var dropAndLoad = utils.dropDatabaseAndLoadFixture;
var dropDatabase = utils.dropDatabase;
var requestHttp = utils.requestHttp;
var requestJson = utils.requestJson;
var collectionJson = utils.collectionJson;
var itemJson = utils.itemJson;
var itemHttp = utils.itemHttp;
var post = utils.post;
var put = utils.put;
var del = utils.del;
var Q = require('q');


describe('mongodb-rest', function () {

    var restServer = require('../server');

    beforeEach(function () {

        // Open the rest server for each test.        
        restServer.startServer();
    });

    afterEach(function () {

        // Close the rest server after each test.
        restServer.stopServer();
    });

    it('can retrieve names of databases', function (done) {

        dropDatabase(testDbName)
            .then(function () {
                return requestJson(dbsUrl);
            })
            .then(function (result) {                
                expect(result.data).not.toContain(testDbName);
            })
            .then(function () {
                return dropAndLoad(testDbName, testCollectionName, []);
            })
            .then(function () {
                return requestJson(dbsUrl);
            })
            .then(function (result) {
                expect(result.data).toContain(testDbName);
                done();
            })
            .catch(function (err) {
                done(err);
            });
    });

    it('can retrieve names of collections', function (done) {

        var testcol1 = "testcol1";
        var testcol2 = "testcol2";

        dropDatabase(testDbName)
            .then(function () {
                return requestJson(collectionsUrl);
            })
            .then(function (result) {                
                expect(result.data.length).toBe(0);
            })
            .then(function () {
                return load(testDbName, testcol1, [ { blah: 1 } ]);
            })
            .then(function () {
                return load(testDbName, testcol2, [ { blah: 2 } ]);
            })
            .then(function () {
                return requestJson(collectionsUrl);
            })
            .then(function (result) {
                var collectionNames = result.data;
                expect(collectionNames.length).toBeGreaterThan(1);
                expect(collectionNames).toContain(testcol1);
                expect(collectionNames).toContain(testcol2);
                done();
            })
            .catch(function (err) {
                done(err);
            });
    });

    it('should retreive empty array from empty db collection', function (done) {

        dropAndLoad(testDbName, testCollectionName, [])
            .then(function () {
                return collectionJson(collectionUrl);
            })
            .then(function (result) {
                expect(result.data).toEqual([])
                done();
            })
            .catch(function (err) {
                done(err);
            });
    });

    it('can retreive array from db collection', function (done) {

        var testData = [
            {
                item: 1,
            },
            {
                item: 2,
            },
            {
                item: 3,
            },
        ];

        dropAndLoad(testDbName, testCollectionName, testData)
            .then(function () {
                return collectionJson(collectionUrl);
            })
            .then(function (result) {
                var data = result.data;
                expect(data.length).toBe(3);
                data.sort(function (a, b) { return a.item-b.item; }); // Sort results, can't guarantee order otherwise.
                expect(data[0].item).toBe(1);
                expect(data[1].item).toBe(2);
                expect(data[2].item).toBe(3);
                done();
            })
            .catch(function (err) {
                done(err);
            });
    });

    it('can handle retreiving document from empty db collection', function (done) {

        dropAndLoad(testDbName, testCollectionName, [])
            .then(function () {
                var itemID = ObjectID();
                return itemJson(collectionUrl, itemID);
            })
            .then(function (result) {
                expect(result.response.statusCode).toBe(404);
                done();
            })
            .catch(function (err) {
                done(err);
            });
    });

    it('can handle retreiving non-existent document from non-empty db collection', function (done) {

        var itemID = ObjectID();

        var testData = [
            {
                _id: ObjectID(),
                item: 1,
            },
            {
                _id: ObjectID(),
                item: 2,
            },
            {
                _id: ObjectID(),
                item: 3,
            },
        ];

        dropAndLoad(testDbName, testCollectionName, [])
            .then(function () {
                return itemHttp(collectionUrl, itemID);
            })
            .then(function (result) {
                expect(result.response.statusCode).toBe(404);
                done();
            })
            .catch(function (err) {
                done(err);
            });
    });

    it('can retreive single document from db collection', function (done) {

        var itemID = ObjectID();

        var testData = [
            {
                _id: ObjectID(),
                item: 1,
            },
            {
                _id: itemID,
                item: 2,
            },
            {
                _id: ObjectID(),
                item: 3,
            },
        ];

        dropAndLoad(testDbName, testCollectionName, testData)
            .then(function () {
                return itemJson(collectionUrl, itemID);
            })
            .then(function (result) {
                expect(result.data._id).toEqual(itemID.toString());
                expect(result.data.item).toBe(2);
                done();
            })
            .catch(function (err) {
                done(err);
            });
    });

    it('can insert single document into collection', function (done) {

        var postData = {
            value: "hi there",
        };

        dropDatabase(testDbName)
            .then(function () {
                return post(collectionUrl, postData);
            })
            .then(function (result) {
                expect(result.response.statusCode).toBe(201);
                expect(result.data).toEqual({ ok: 1 });

                return collectionJson(collectionUrl);
            })
            .then(function (result) {
                expect(result.data.length).toBe(1);
                expect(result.data[0].value).toBe(postData.value);
                done();
            })
            .catch(function (err) {
                done(err);
            });
    });

    it('can update single document in db collection', function (done) {

        var itemID = ObjectID();

        var testData = [
            {
                _id: ObjectID(),
                item: 1,
            },
            {
                _id: itemID,
                item: 2,
            },
            {
                _id: ObjectID(),
                item: 3,
            },
        ];

        dropAndLoad(testDbName, testCollectionName, testData)
            .then(function () {

                var newData = {
                    item: 50,
                };

                return put(collectionUrl, itemID, newData);
            })
            .then(function (result) {
                expect(result.response.statusCode).toBe(200);
                expect(result.data).toEqual({ ok: 1 });

                return itemJson(collectionUrl, itemID);
            })
            .then(function (result) {
                expect(result.data._id).toEqual(itemID.toString());
                expect(result.data.item).toBe(50);
                done();
            })
            .catch(function (err) {
                done(err);
            });
    });

    it('can delete single document in db collection', function (done) {

        var itemID = ObjectID();

        var testData = [
            {
                _id: ObjectID(),
                item: 1,
            },
            {
                _id: itemID,
                item: 2,
            },
            {
                _id: ObjectID(),
                item: 3,
            },
        ];

        dropAndLoad(testDbName, testCollectionName, testData)
            .then(function () {
                return del(collectionUrl, itemID);
            })
            .then(function (result) {
                expect(result.response.statusCode).toBe(200);
                expect(JSON.parse(result.data)).toEqual({ ok: 1 });

                return itemJson(collectionUrl, itemID);
            })
            .then(function (result) {
                //todo: expect(result.response.statusCode).toBe(404);
                expect(result.data).toEqual({ ok: 0 });

                return collectionJson(collectionUrl);
            })
            .then(function (result) {
                expect(result.data.length).toBe(2);
                done();
            })
            .catch(function (err) {
                done(err);
            });
    });
});