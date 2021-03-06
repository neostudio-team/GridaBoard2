import React, { useCallback, useEffect, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress } from '@material-ui/core';
import getText from "GridaBoard/language/language";

const useStyles = makeStyles({
  root: {
    width: '100%',
  },
});
type Props = {
  /** 0 ~ 100 */
  progress: number,

  open: boolean,

  title: string,

  cancelCallback: (e) => void,
}


export function useForceUpdate() {
  const [, setTick] = useState(0);
  const update = useCallback(() => {
    setTick(tick => tick + 1);
  }, [])
  return update;
}


export default function ProgressDialog(props: Props) {
  const { progress: propsProgress, open: propsOpen, title, cancelCallback, ...rest } = props;

  const classes = useStyles();
  const [progress, setProgress] = useState(props.progress);
  const [open, setOpen] = useState(props.open);

  const handleClose = (e) => {
    setOpen(false);
    if (props.cancelCallback) {
      props.cancelCallback(e);
    }
  }
  const forceUpdate = useForceUpdate();


  useEffect(() => {
    setProgress(props.progress);
    forceUpdate();
    // forceUpdate();
  }, [props.progress]);

  useEffect(() => {
    setOpen(propsOpen);
  }, [propsOpen]);

  const percent = Math.ceil(progress);
  const buffered = Math.ceil(progress / 10) * 10;

  useEffect(() => {
    // console.log(`dlg progress >> ${progress}, percent=${percent}, buffered=${buffered}`)
  }, [progress]);

  return (
    <Dialog open={open} {...rest} onClose={handleClose} >
      <DialogTitle id="form-dialog-title" style={{ float: "left", width: "500px" }}>
        <Box fontSize={20} fontWeight="fontWeightBold" >{props.title}</Box>
      </DialogTitle>

      <DialogContent>
        <div className={classes.root}>
          <LinearProgress variant="buffer" value={percent} valueBuffer={buffered} />
        </div>
        <div className={classes.root}>
          <Box fontSize={16} fontWeight="fontWeightRegular" >{getText("print_processing")} {percent}%</Box>
        </div>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} color="primary">
          {getText("print_processing_cancel")}
          </Button>
      </DialogActions>
    </Dialog>
  );
}