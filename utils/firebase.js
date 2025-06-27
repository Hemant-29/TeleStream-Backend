const admin = require('firebase-admin');
const serviceAccount = require('../telestreamvideo-4c5d7-firebase-adminsdk-fbsvc-3b56d6cc95.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: '<your-firebase-bucket>.appspot.com'
});

const bucket = admin.storage.bucket();

module.exports = bucket;