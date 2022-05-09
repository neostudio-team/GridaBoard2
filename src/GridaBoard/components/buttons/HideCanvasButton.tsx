import React from "react";
import '../../styles/buttons.css';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/rootReducer';
import { IconButton, makeStyles, SvgIcon } from '@material-ui/core';
import getText from "GridaBoard/language/language";
import SimpleTooltip from "../SimpleTooltip";
import { setHideCanvasMode } from "GridaBoard/store/reducers/gestureReducer";
import { firebaseAnalytics } from "../../util/firebase_config";

const useStyle = props => makeStyles((theme => ({
  hideCanvasStyle: {
    marginLeft: "16px",
    padding: "8px",
    background: props.hideCanvasMode ? theme.custom.icon.blue[3] : "none",
    borderRadius: "8px"
  },
  hideCanvasIcon: {
    color: props.hideCanvasMode ? theme.palette.primary.main : theme.custom.icon.blue[1]
  }
})));

const HideCanvasButton = () => {
  const hideCanvasMode = useSelector((state: RootState) => state.gesture.hideCanvasMode)
  const classes = useStyle({hideCanvasMode: hideCanvasMode})();
  const onToggleHideCanvas = () => {
    firebaseAnalytics.logEvent(`hide_mouse`, {
      event_name: `hide_mouse`
    });
    setHideCanvasMode(!hideCanvasMode);
  }
  
  return (
    <IconButton className={classes.hideCanvasStyle} onClick={() => onToggleHideCanvas()}>
      <SimpleTooltip title={getText("nav_hideCanvas")}>
        <SvgIcon id="hidecanvas_svg_icon" className={classes.hideCanvasIcon}>
          {hideCanvasMode ? 
            <path
              d="M19.97 21.385l-3.356-3.356c-1.448.66-3.023.991-4.614.973-1.64.02-3.263-.334-4.746-1.035a10.073 10.073 0 01-3.041-2.282A10.498 10.498 0 012.1 12.316l-.1-.314.105-.316a10.786 10.786 0 013.516-4.651L3 4.414l1.413-1.412 16.969 16.969-1.41 1.414h-.002zM7.036 8.451a8.574 8.574 0 00-2.919 3.551 8.308 8.308 0 007.883 5 9.308 9.308 0 003.087-.5l-1.8-1.8c-.4.196-.84.299-1.287.3a3.02 3.02 0 01-3-3c0-.447.103-.888.3-1.29L7.036 8.451zm12.816 7.161l-1.392-1.391a8.596 8.596 0 001.423-2.219 8.3 8.3 0 00-7.883-5c-.247 0-.495.009-.735.026L9.5 5.261c.822-.176 1.66-.263 2.5-.259 1.64-.02 3.263.334 4.746 1.035 1.15.56 2.181 1.335 3.041 2.282.912.977 1.63 2.12 2.113 3.365l.1.318-.105.316a10.427 10.427 0 01-2.042 3.3l-.001-.006z"
            /> :  
            <path
              d="M2.052 11.684C2.073 11.617 4.367 5 12 5c7.633 0 9.927 6.617 9.949 6.684l.105.316-.106.316C21.927 12.383 19.633 19 12 19c-7.633 0-9.927-6.617-9.949-6.684L1.946 12l.106-.316zM4.074 12c.502 1.154 2.575 5 7.926 5 5.348 0 7.422-3.842 7.926-5-.502-1.154-2.575-5-7.926-5-5.348 0-7.422 3.842-7.926 5zm5.81-2.116A3.02 3.02 0 0112 9c1.641 0 3 1.359 3 3 0 1.642-1.359 3-3 3a3.02 3.02 0 01-3-3 3.02 3.02 0 01.884-2.116z"
            />}
        </SvgIcon>
      </SimpleTooltip>
    </IconButton>
  );
}
export default HideCanvasButton;