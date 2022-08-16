import firebase from "firebase";
import NDP from "NDP-lib";
import React from "react";
import { SocketReturnData } from "NDP-lib/NSocket";
import { setIsPenControlOwner } from "../store/reducers/ndpClient";
const ndp = new NDP({
  appName : "GRIDABOARD",
  clientAutoConnect : true
});
ndp.setShare();

(window as any).ndp = ndp;


ndp.Client.autoOn("penControlOwner",(data: SocketReturnData)=>{
  if(data.result){
    setIsPenControlOwner(data.data.owned);
  }
});
ndp.Client.autoOn("penListUpdate",(data: SocketReturnData)=>{
  if(data.result){
    setIsPenControlOwner(data.data.penList);
  }
})


export const signInWithNDPC = async () => {

  NDP.getInstance().Client.getToken();
}
export default firebase;