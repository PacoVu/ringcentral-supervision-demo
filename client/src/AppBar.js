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
    //this.eventSource.addEventListener('loginEvent', (e) => this.updateLogin(JSON.parse(e.data)));
  }

  updateLogin(data) {
    this.setState(prevState => ({
          isLoggedIn: true
        }))
  }

  async login() {
    await axios.get("/login")
    //console.log(response.data)
  }

  async logout() {
    await axios.get("/logout")
    //console.log(response.data)
  }

  render() {
    return (
      <div>
        <a onClick={() => this.login()}>Login</a> &nbsp; &nbsp;
        <a onClick={() => this.logout()}>Logout</a>
      </div>
    );
  }
}
