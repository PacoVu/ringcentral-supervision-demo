import React, { Component } from 'react';

import axios from "axios";

export default class AppBar extends Component {

  constructor(props) {
    super(props);
    this.state = {
      showAbout: false,
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
  }

  displayAbout(){
    if (this.state.showAbout == false){
      this.setState(prevState => ({
          showAbout: true
        }))
    } else {
      this.setState(prevState => ({
          showAbout: false
        }))
    }
  }

  render() {
    if (this.state.showAbout) {
      this.about = <div className="show">THIS IS A POPUP BLOCK</div>
    }else{
      this.about = <div className="hide">THIS IS A POPUP BLOCK</div>
    }
    return (
      <div>
        <nav id="menu_header">
            <ul class="nav navbar-nav navbar-left left-align-nav">
              <a onClick={() => this.deleteSubscriptions()}>Delete all notifications</a>
            </ul>
            <ul class="nav navbar-nav navbar-right middle-align">
              <li><a onClick={() => this.displayAbout()}>About</a></li>
            </ul>
        </nav>
        <div id="about"> {this.about} </div>
      </div>
    );
  }
}
