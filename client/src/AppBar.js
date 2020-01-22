import React, { Component } from 'react';

import axios from "axios";

export default class AppBar extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoggedIn : false
    };

  }

  async componentDidMount() {
    this.eventSource.addEventListener('loginEvent', (e) => this.updateLogin(JSON.parse(e.data)));

  }

  updateLogin(data) {
    this.setState(prevState => ({
          isLoggedIn: true
        }))
  }

  async login(agent) {
    const response = await axios.get("/login")
    //console.log(response.data)
  }


  render() {
    return (
      <a href="#" onClick={() => this.login()}>Login</a>
    );
  }
}
