import firebase from "firebase";
import NDP from "NDP-lib";
import React from "react";
const ndp = new NDP({
  appName : "GRIDABOARD",
  clientAutoConnect : true
});
ndp.setShare();

(window as any).ndp = ndp;

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

  NDP.getInstance().Client.getToken();
}
export default firebase;