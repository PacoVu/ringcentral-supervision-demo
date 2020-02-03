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

  async deleteSubscriptions() {
    await axios.get("/delete_subscriptions")
    //console.log(response.data)
  }

  render() {
    return (
      <div>
        <a onClick={() => this.deleteSubscriptions()}>Delete all notifications</a>
      </div>
    );
  }
}
