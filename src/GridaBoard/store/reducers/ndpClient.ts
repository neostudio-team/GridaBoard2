import { store } from "../../client/pages/GridaBoard";

//[Define Action Types
const ActionGroup = "NDP_CLIENT";

const UrlActionType = Object.freeze({
  PEN_LIST: `${ActionGroup}.PEN_LIST`,
  PEN_CONTROL_OWNER: `${ActionGroup}.PEN_CONTROL_OWNER`,
  // PEN_LIST: `${ActionGroup}.PEN_LIST`,
  // PEN_LIST: `${ActionGroup}.PEN_LIST`,
});
//]

export const setPenList = async (penList) => {
  store.dispatch({
    type: UrlActionType.PEN_LIST,
    penList,
  });
}
export const setIsPenControlOwner = async (isOwner:boolean) => {
  store.dispatch({
    type: UrlActionType.PEN_CONTROL_OWNER,
    isOwner
  });
}


const initialState = {
  isPenControlOwner : false,
  penList : []
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
    default: {
      return state;
    }
  }
};
//]
