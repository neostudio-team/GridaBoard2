import React, { useEffect, useState } from "react";
import { makeStyles, CircularProgress } from '@material-ui/core';
import { useSelector } from 'react-redux';
import { RootState } from '../store/rootReducer';
const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    position : "absolute",
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10000
  },
  background : {
    position : "absolute",
    width: "100%",
    height: "100%",
    background: "gray",
    opacity: 0.5
  },
  hidden : {
    visibility : "hidden"
  }
}));


const BoardLoadingCircle = (props:{checked:boolean}) => { 
  const isVisible = useSelector((state: RootState) => state.loadingCircle.visible);
  const classes = useStyles();

  let visible = false
  if (isVisible && props.checked) {
    visible = true;
  }

  return (<div className={`${classes.root} ${visible? "": classes.hidden}`}>
      <div className={classes.background}></div>
      <CircularProgress />
    </div>);
  
}

export default BoardLoadingCircle;