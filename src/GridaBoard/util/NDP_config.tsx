import firebase from "firebase";
import NDP from "NDP-lib";
import React from "react";
import { SocketReturnData } from "NDP-lib/NSocket";
import { setIsPenControlOwner, setPenList } from "../store/reducers/ndpClient";
import { penControlOwner } from "NDP-lib/enum";
import { showAlert } from "../store/reducers/listReducer";
const ndp = new NDP({
  appName : "GRIDABOARD"
});
ndp.setShare();

(window as any).ndp = ndp;
(window as any).test3 = showAlert;


ndp.Client.autoOn("penControlOwner",(res: SocketReturnData)=>{
  if(res.result){
    const data = res.data as penControlOwner;
    setIsPenControlOwner(data);
    if(!data.owned){
      showAlert({type : "lostPenOwner"});
    }
  }
});
ndp.Client.autoOn("penListUpdate",(res: SocketReturnData)=>{
  if(res.result){
    const data = res.data;
    setPenList(data.penList);
  }
})

ndp.Client.autoConnectStart();

NDP.getInstance().onAuthStateChanged(async userId => {
  // user.email
  const data = await NDP.getInstance().Client.localClient.emitCmd("getPenList");
  if(data.result){
    setPenList(data.data.penList);
  }
});
export const signInWithNDPC = async () => {

  NDP.getInstance().Client.getToken();
}
export default firebase;