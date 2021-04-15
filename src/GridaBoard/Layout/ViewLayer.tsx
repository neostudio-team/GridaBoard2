import React, {useState} from "react";
import HeaderLayer from "./HeaderLayer";
import NavLayer from "./NavLayer";
import LeftSideLayer from "./LeftSideLayer";
import ContentsLayer from "./ContentsLayer";
import { ButtonProps, AppBar, makeStyles, Collapse } from "@material-ui/core";
import { IFileBrowserReturn } from "nl-lib/common/structures";
 
/**
 *
 */
interface Props extends ButtonProps {
  handlePdfOpen: (event: IFileBrowserReturn) => void,
}

const useStyles = makeStyles((theme) => {
  return ({
    wrap : {
      display: "flex",
      flexDirection: "column",
      height: "100%"
    },
    main : {display: "flex", 
      flex: 1, 
      flexDirection: "row-reverse", 
      justifyContent: "flex-start", 
      height:"calc(100% - 300px)"
    }
  })
});


// style={{"--appBar-height":"0px"}}
const ViewLayer = (props: Props) => {
  const classes = useStyles();
  const [isView, setHeaderView] = useState(true);

  return (
    <div className={classes.wrap}>
      <Collapse in={isView} timeout={0}>
        <AppBar position="relative" color="transparent" elevation={0}> 
          <HeaderLayer {...props}/>
          <NavLayer {...props} />
        </AppBar>
      </Collapse>
      <div className={classes.main}>
        <ContentsLayer {...props} setHeaderView={setHeaderView} />
        <LeftSideLayer {...props}/>
      </div>
    </div>
  );
}

export default ViewLayer;
