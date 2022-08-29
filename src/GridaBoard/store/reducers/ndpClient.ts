import { store } from "../../client/pages/GridaBoard";

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

export const setPenList = (penList) => {
  store.dispatch({
    type: UrlActionType.PEN_LIST,
    penList,
  });
}
export const setIsPenControlOwner = (isOwner:boolean) => {
  store.dispatch({
    type: UrlActionType.PEN_CONTROL_OWNER,
    isOwner
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
  penList : [],
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
        isPenControlOwner: action.isOwner,
      };
    }
    case UrlActionType.PEN_LIST: {
      return {
        ...state,
        penList: action.penList,
      };
    }
    case UrlActionType.BLUETOOTH_ON: {
      return {
        ...state,
        bluetoothOn: action.isOn,
      };
    }
    default: {
      return state;
    }
  }
};
//]
