import { store } from "../../client/pages/GridaBoard";

//[Define Action Types

const ActionGroup = "DOC_CONFIG";

const ACTION_TYPE = Object.freeze({
  SET: `${ActionGroup}.SET`,
  GET: `${ActionGroup}.GET`,
});
//]

//[Action Methods

export const setDocName = async (docName: string) => {
  store.dispatch({
    type: ACTION_TYPE.SET,
    value: { docName: docName } as ActionValue,
  });
};

export const setDocId = (docId:string) => {
  store.dispatch({
    type: ACTION_TYPE.SET,
    value: { docId: docId } as ActionValue,
  });
}

export const setDate = async (date: string) => {
  store.dispatch({
    type: ACTION_TYPE.SET,
    value: { date: date } as ActionValue,
  });
};

export const setIsNewDoc = async (isNew: boolean) => {
  store.dispatch({
    type: ACTION_TYPE.SET,
    value: { isNewDoc: isNew } as ActionValue,
  });
};

export const setIsPdfEdited = async (isEdited: boolean) => {
  store.dispatch({
    type: ACTION_TYPE.SET,
    value: { isPdfEdited: isEdited } as ActionValue,
  });
};

export const setOnLassoShift = async (onLassoShift: boolean) => {
  store.dispatch({
    type: ACTION_TYPE.SET,
    value: { onLassoShift: onLassoShift } as ActionValue,
  });
}

export const setOnLassoGroup = async (onLassoGroup: boolean) => {
  store.dispatch({
    type: ACTION_TYPE.SET,
    value: { onLassoGroup: onLassoGroup } as ActionValue,
  });
}

export const setLassoModalPoint = async (lassoPoint: {x:number, y:number}) => {
  store.dispatch({
    type: ACTION_TYPE.SET,
    value: { lassoModalPoint: lassoPoint } as ActionValue,
  });
}
type ActionValue = {
  docName: string,
  isNewDoc: boolean,
  date: string,
  docId : string,
  isPdfEdited: boolean,
  onLassoShift: boolean,
  onLassoGroup: boolean,
  lassoModalPoint: {x: number, y: number},
}
//]

//[Reducer
const initialState = {
  docName: 'undefined',
  isNewDoc: true,
  isPdfEdited: false,
  date: '',
  docId : "undefined",
  onLassoShift: false,
  onLassoGroup: false,
  lassoModalPoint: { x: 0, y: 0 },
};

export default (state = initialState, action) => {
  switch (action.type) {
    case ACTION_TYPE.SET: {
      const value = action.value as typeof initialState;
      return {
        ...state,
        ...value
      };
    }
    default: {
      return state;
    }
  }
};
//]
