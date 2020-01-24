import firebase from 'firebase'
// const config = require('../config')()
// const fireConfig = config.fireConfig


const fireConfig = {
    apiKey: "AIzaSyAwNgE_xGkR0c0WBFRDa8ezbv_KTBOSI5M",
    authDomain: "osaka20190110-4aaf6.firebaseapp.com",
    databaseURL: "https://osaka20190110-4aaf6.firebaseio.com",
    projectId: "osaka20190110-4aaf6",
    storageBucket: "osaka20190110-4aaf6.appspot.com",
    messagingSenderId: "404147877397",
    appId: "1:404147877397:web:1c71ed0fabfc8a7ee9c01c",
    measurementId: "G-EP6148QRC5"
  }

let fireApp, adminApp 

if (!fireApp && !firebase.apps.length) {
  fireApp = firebase.initializeApp(fireConfig)
  adminApp = firebase.initializeApp(fireConfig, 'fireAdmin')
} else {
  fireApp = firebase.app()
  adminApp = firebase.app('fireAdmin')
}

export { fireApp, adminApp }