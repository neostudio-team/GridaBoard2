import { store } from "../../client/pages/GridaBoard";
import GridaDoc from "../../GridaDoc";
import { INeoSmartpen } from "nl-lib/common/neopen";

import { IPrintOption, MappingState } from "nl-lib/common/structures";
import { g_defaultPrintOption } from "nl-lib/ncodepod";
import { NeoSmartpen } from "nl-lib/neosmartpen";
//[Define Action Types
const ActionGroup = "APP_CONFIG";

const ACTION_TYPE = Object.freeze({
  SET: `${ActionGroup}.SET`,
  SET_PRINTOPTION: `${ActionGroup}.SET_PRINTOPTION`,
  SET_PENS: `${ActionGroup}.SET_PENS`,
  UPDATE_BOARDLIST: `${ActionGroup}.UPDATE_BOARDLIST`,
  GET: `${ActionGroup}.GET`,
  SET_MAPPING_STATE: `${ActionGroup}.SET_MAPPING_STATE`,
});
//]

//[Action Methods

export const setPrintOption = async (printOption: IPrintOption) => {
  store.dispatch({
    type: ACTION_TYPE.SET_PRINTOPTION,
    value: printOption,
  });
};

export const setPens = async (pens: INeoSmartpen[]) => {
  store.dispatch({
    type: ACTION_TYPE.SET_PENS,
    value: pens,
  })
}

export const forceUpdateBoardList = () => (
  store.dispatch({
    type: ACTION_TYPE.UPDATE_BOARDLIST,
    value: 1,
  })
)

export const setMappingState = async (state: string) => {
  store.dispatch({
    type: ACTION_TYPE.SET_MAPPING_STATE,
    value: state,
  })
}
//]


//[Reducer
const initialState = {
  printOption: g_defaultPrintOption,
  pens: [] as INeoSmartpen[],
  num_pens: 0,
  updateCount: 1,
  mappingState: undefined as MappingState,
};

export type IAppConfig = typeof initialState;

export default (state = initialState, action) => {
  // console.log(action);

  switch (action.type) {
    case ACTION_TYPE.SET_PENS: {
      return {
        ...state,
        pens: action.value,
        num_pens: action.value.length,
      };

    }
    case ACTION_TYPE.SET_PRINTOPTION: {
      return {
        ...state,
        printOption: action.value,
      };
    }
    case ACTION_TYPE.UPDATE_BOARDLIST: {
      const cnt = state.updateCount;
      return {
        ...state,
        updateCount: cnt + action.value,
      };
    }
    case ACTION_TYPE.SET_MAPPING_STATE: {
      return {
        ...state,
        mappingState: action.value,
      };
    }
    default: {
      return state;
    }
  }
};
//]


GridaDoc.getInstance();
