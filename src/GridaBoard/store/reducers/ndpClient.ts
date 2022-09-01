import { store } from "../../client/pages/GridaBoard";
import {penControlOwner, PenListData} from "NDP-lib/enum";

//[Define Action Types
const ActionGroup = "NDP_CLIENT";

const UrlActionType = Object.freeze({
  PEN_LIST: `${ActionGroup}.PEN_LIST`,
  PEN_CONTROL_OWNER: `${ActionGroup}.PEN_CONTROL_OWNER`,
  BLUETOOTH_ON : `${ActionGroup}.BLUETOOTH_ON`,
  SEARCH_ON : `${ActionGroup}.SEARCH_ON`
  // PEN_LIST: `${ActionGroup}.PEN_LIST`,
  // PEN_LIST: `${ActionGroup}.PEN_LIST`,
});
//]

export const setPenList = (penList:Array<PenListData>) => {
  store.dispatch({
    type: UrlActionType.PEN_LIST,
    penList,
  });
}
export const setIsPenControlOwner = (penOwner:penControlOwner) => {
  store.dispatch({
    type: UrlActionType.PEN_CONTROL_OWNER,
    isOwner : penOwner.owned,
    penOwner
  });
}
export const setBluetoothOn = (isOn:boolean) => {
  store.dispatch({
    type: UrlActionType.BLUETOOTH_ON,
    isOn
  });
}


(window as any).test2 = setBluetoothOn;


const initialState = {
  isPenControlOwner : false,
  penControlOwnerData : {
    ownerName : "GRIDABOARD",
    owned : false
  } as penControlOwner,
  penList : [] as Array<PenListData>,
  bluetoothOn : true
};


export type IActivePageState = typeof initialState;

//[Reducer
export default (state = initialState, action) => {
  // console.log(action);

  switch (action.type) {
    case UrlActionType.PEN_CONTROL_OWNER: {
      return {
        ...state,
        isPenControlOwner: action.isOwner as boolean,
        penControlOwnerData: action.penOwner as penControlOwner,
      };
    }
    case UrlActionType.PEN_LIST: {
      return {
        ...state,
        penList: action.penList as Array<PenListData>,
      };
    }
    case UrlActionType.BLUETOOTH_ON: {
      return {
        ...state,
        bluetoothOn: action.isOn as boolean,
      };
    }
    default: {
      return state;
    }
  }
};
//]
