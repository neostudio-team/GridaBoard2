import React from 'react';
import { NavLink } from 'react-router-dom';
import { turnOnGlobalKeyShortCut } from "../../GlobalFunctions";


const About = () => {
    const activeStyle = {
        color: 'green',
        fontSize: '2rem'
    };
    turnOnGlobalKeyShortCut(false);

    return (
        <div>About
            <ul>
                <li><NavLink exact to="/" activeStyle={activeStyle}>Home</NavLink></li>
                <li><NavLink to="/app" activeStyle={activeStyle}>app</NavLink></li>
            </ul>
            <hr/>
        </div>
    );
};

export default About;