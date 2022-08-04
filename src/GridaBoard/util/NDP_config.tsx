import firebase from "firebase";
import NDP from "NDP-lib";
import React from "react";
const ndp = new NDP({
  // clientAutoConnect : true
});
ndp.setShare();


type FirebaseConfig = {
  apiKey: string,
  authDomain: string,
  projectId: string,
  databaseURL: string,
  storageBucket: string,
  messagingSenderId: string,
  appId: string,
  measurementId?: string
}
let cloudfunctionsUrl = "";

export const signInWithNDPC = async () => {
  console.log(12312312);
}
export default firebase;