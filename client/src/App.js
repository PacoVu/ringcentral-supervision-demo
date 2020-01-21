import React, { Component } from 'react';
//import { StyleSheet, Text, View, FlatList } from 'react-flatlist';
//import { getInitialCallTranscript } from './DataProvider';
//import 'react-table/react-table.css';
//import ajax from './service/FetchData';
// , LinearGauge, RadialGauge
import {
    ArcGauge
} from '@progress/kendo-react-gauges';

import axios from "axios";

export default class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      agent1:{
        cannotRecord: true,
        recordingButtonName: 'Start Recording',
        isRecording: false,
        buttonName: 'Enable Translation',
        doTranslation:  false,
        dialogue: [],
        phoneStatus: "idle",
        sentimentScore: 0,
        sadnessScore: 0,
        joyScore: 0,
        fearScore: 0,
        disgustScore: 0,
        angerScore: 0
      },
      agent2: {
        cannotRecord: true,
        recordingButtonName: 'Start Recording',
        isRecording: false,
        buttonName: 'Enable Translation',
        doTranslation:  false,
        dialogue: [],
        phoneStatus: "idle",
        sentimentScore: 0,
        sadnessScore: 0,
        joyScore: 0,
        fearScore: 0,
        disgustScore: 0,
        angerScore: 0
      }
    };
    this.eventSource = new EventSource('/events');
  }

  async componentDidMount() {
    this.eventSource.addEventListener('transcriptUpdate', (e) => this.updateTranscript(JSON.parse(e.data)));
    this.eventSource.addEventListener('phoneEvent', (e) => this.updatePhoneStatus(JSON.parse(e.data)));
    this.eventSource.addEventListener('closedConnection', () => this.stopUpdates());
  }

  updateTranscript(data) {
    // identify agents
    if (data.agent === "120"){
      this.update = false
      for (let i = 0; i < this.state.agent1.dialogue.length; i++) {
        if (this.state.agent1.dialogue[i].index === data.index){
          let items = [...this.state.agent1.dialogue];
          let item = {...items[i]};
          //console.log("before: " + item.text)
          item.text = data.text;
          item.translation = data.translation;
          items[i] = item;

          //this.setState(Object.assign({}, {dialogue: items}));
          this.setState(prevState => ({
              agent1: {                   // object that we want to update
                  ...prevState.agent1,    // keep all other key-value pairs
                  dialogue: items       // update the value of specific key
              }
          }))
          this.update = true
          break
        }
      }
      if (!this.update){
        this.state.agent1.dialogue.unshift(data)
        //this.setState(Object.assign({}, {dialogue: this.state.agent1.dialogue}));
        this.setState(prevState => ({
            agent1: {                   // object that we want to update
                ...prevState.agent1,    // keep all other key-value pairs
                dialogue: this.state.agent1.dialogue       // update the value of specific key
            }
        }))
      }
      if (data.status && data.analysis.hasOwnProperty("sentimentScore")){
        this.setState(prevState => ({
            agent1: {                   // object that we want to update
                ...prevState.agent1,    // keep all other key-value pairs
                sentimentScore: data.analysis.sentimentScore,
                sadnessScore: data.analysis.sadnessScore,
                joyScore: data.analysis.joyScore,
                fearScore: data.analysis.fearScore,
                disgustScore: data.analysis.disgustScore,
                angerScore: data.analysis.angerScore
            }
        }))
        /*
        this.setState({agent1.sentimentScore: data.analysis.sentimentScore})
        this.setState({agent1.sadnessScore: data.analysis.sadnessScore})
        this.setState({agent1.joyScore: data.analysis.joyScore})
        this.setState({agent1.fearScore: data.analysis.fearScore})
        this.setState({agent1.disgustScore: data.analysis.disgustScore})
        this.setState({agent1.angerScore: data.analysis.angerScore})
        */
      }
    }else if (data.agent === "122") {
      this.update = false
      for (let i = 0; i < this.state.agent2.dialogue.length; i++) {
        if (this.state.agent2.dialogue[i].index === data.index){
          let items = [...this.state.agent2.dialogue];
          let item = {...items[i]};
          //console.log("before: " + item.text)
          item.text = data.text;
          item.translation = data.translation;
          items[i] = item;

          //this.setState(Object.assign({}, {dialogue: items}));
          this.setState(prevState => ({
              agent2: {                   // object that we want to update
                  ...prevState.agent2,    // keep all other key-value pairs
                  dialogue: items       // update the value of specific key
              }
          }))
          this.update = true
          break
        }
      }
      if (!this.update){
        this.state.agent2.dialogue.unshift(data)
        //this.setState(Object.assign({}, {dialogue: this.state.agent2.dialogue}));
        this.setState(prevState => ({
            agent2: {                   // object that we want to update
                ...prevState.agent2,    // keep all other key-value pairs
                dialogue: this.state.agent2.dialogue       // update the value of specific key
            }
        }))
      }

      if (data.status && data.analysis.hasOwnProperty("sentimentScore")){
        this.setState(prevState => ({
            agent2: {                   // object that we want to update
                ...prevState.agent2,    // keep all other key-value pairs
                sentimentScore: data.analysis.sentimentScore,
                sadnessScore: data.analysis.sadnessScore,
                joyScore: data.analysis.joyScore,
                fearScore: data.analysis.fearScore,
                disgustScore: data.analysis.disgustScore,
                angerScore: data.analysis.angerScore
            }
        }))
        /*
        this.setState({sentimentScore: data.analysis.sentimentScore})
        this.setState({sadnessScore: data.analysis.sadnessScore})
        this.setState({joyScore: data.analysis.joyScore})
        this.setState({fearScore: data.analysis.fearScore})
        this.setState({disgustScore: data.analysis.disgustScore})
        this.setState({angerScore: data.analysis.angerScore})
        */
      }

    }

  }

  updatePhoneStatus(phoneStatus) {
    var cannotRecord = true
    if (phoneStatus.agent === "120"){
      if (phoneStatus.status === "connected"){
        this.clearTranscript(phoneStatus.agent)
        cannotRecord = false
      }

      this.setState(prevState => ({
          agent1: {
              ...prevState.agent1,
              cannotRecord: cannotRecord,
              phoneStatus: phoneStatus.status
          }
      }))
    }else{
      if (phoneStatus.status === "connected"){
        this.clearTranscript(phoneStatus.agent)
        cannotRecord = false
      }

      this.setState(prevState => ({
          agent2: {
              ...prevState.agent2,
              cannotRecord: cannotRecord,
              phoneStatus: phoneStatus.status
          }
      }))
    }
  }

  stopUpdates() {
    this.eventSource.close();
  }

  clearTranscript(agent) {
    if (agent === "120"){
      this.setState(prevState => ({
          agent1: {
              ...prevState.agent1,
              dialogue: [],
              sentimentScore: 0,
              sadnessScore: 0,
              joyScore: 0,
              fearScore: 0,
              disgustScore: 0,
              angerScore: 0
          }
      }))
    }else{
      this.setState(prevState => ({
          agent2: {
              ...prevState.agent2,
              dialogue: [],
              sentimentScore: 0,
              sadnessScore: 0,
              joyScore: 0,
              fearScore: 0,
              disgustScore: 0,
              angerScore: 0
          }
      }))
    }
  }

  async recordingCall(agent) {
    var isRecording = false
    if (agent === "120"){
      if (this.state.agent1.isRecording){
        isRecording = false
        this.setState(prevState => ({
            agent1: {
                ...prevState.agent1,
                isRecording: isRecording,
                recordingButtonName: 'Start Recording'
            }
        }))
      }else{
        isRecording = true
        this.setState(prevState => ({
            agent1: {
                ...prevState.agent1,
                isRecording: isRecording,
                recordingButtonName: 'Stop Recording'
            }
        }))
      }
    }else{
      if (this.state.agent2.isRecording){
        isRecording = false
        this.setState(prevState => ({
            agent2: {
                ...prevState.agent2,
                isRecording: isRecording,
                recordingButtonName: 'Start Recording'
            }
        }))
      }else{
        isRecording = true
        this.setState(prevState => ({
            agent2: {
                ...prevState.agent2,
                isRecording: isRecording,
                recordingButtonName: 'Stop Recording'
            }
        }))
      }
    }
    const response =
      await axios.get("/recording",
          { params: {agent: agent, enable: isRecording}}
      )
    console.log(response.data)
  }

  async enableTranslation(agent) {
    var doTranslation = false
    if (agent === "120"){
      if (this.state.agent1.doTranslation){
        doTranslation = false
        this.setState(prevState => ({
            agent1: {
                ...prevState.agent1,
                doTranslation: doTranslation,
                buttonName: 'Enable Translation'
            }
        }))
      }else{
        doTranslation = true
        this.setState(prevState => ({
            agent1: {
                ...prevState.agent1,
                doTranslation: doTranslation,
                buttonName: 'Disable Translation'
            }
        }))
      }
    }else{
      if (this.state.agent2.doTranslation){
        doTranslation = false
        this.setState(prevState => ({
            agent2: {
                ...prevState.agent2,
                doTranslation: doTranslation,
                buttonName: 'Enable Translation'
            }
        }))
      }else{
        doTranslation = true
        this.setState(prevState => ({
            agent2: {
                ...prevState.agent2,
                doTranslation: doTranslation,
                buttonName: 'Disable Translation'
            }
        }))
      }
    }
    const response =
      await axios.get("/enable_translation",
          { params: {agent: agent, enable: doTranslation}}
      )
    console.log(response.data)
  }

  async superviseAgents(agent){
    const response =
      await axios.get("/supervise",
          { params: {agent: agent}}
      )
    console.log(response.data)
  }

  async getDataAxios(){
    /*
      const response =
        await axios.get("http://localhost:5000/login",
            { params: {name: 'bruno'}}
        )
      this.buttonName = 'Logout'
      console.log(response.data)
      */
  }

  render() {
    if (this.doTranslation){
      this.agent1Items = this.state.agent1.dialogue.map((item, key) =>
        <div key={item.index} >
          <div> Speaker {item.speaker}: {item.text} </div>
          <div className="translation"> Translated: {item.translation} </div>
        </div>
      );
    }else{
      this.agent1Items = this.state.agent1.dialogue.map((item, key) =>
        <div key={item.index} >
          <div> Speaker {item.speaker}: {item.text} </div>
        </div>
      );
    }
    if (this.doTranslation){
      this.agent2Items = this.state.agent2.dialogue.map((item, key) =>
        <div key={item.index} >
          <div> Speaker {item.speaker}: {item.text} </div>
          <div className="translation"> Translated: {item.translation} </div>
        </div>
      );
    }else{
      this.agent2Items = this.state.agent2.dialogue.map((item, key) =>
        <div key={item.index} >
          <div> Speaker {item.speaker}: {item.text} </div>
        </div>
      );
    }
    const colors = [
                { from: 0, to: 50, color: 'red' },
                { from: 50, to: 100, color: 'lime' }
            ];

    const a1_sentimentOptions = {value: this.state.agent1.sentimentScore, colors};
    const a2_sentimentOptions = {value: this.state.agent2.sentimentScore, colors};

    const arcCenterRenderer = (value, color) => {
        return (<h3 style={{ color: color }}>{value}%</h3>);
    };

    const a1_sadnessOptions = {
        value: this.state.agent1.sadnessScore,
        colors: [
                    { from: 0, to: 50, color: 'lime' },
                    { from: 50, to: 100, color: 'red' }
                ]
    };
    const a2_sadnessOptions = {
        value: this.state.agent2.sadnessScore,
        colors: [
                    { from: 0, to: 50, color: 'lime' },
                    { from: 50, to: 100, color: 'red' }
                ]
    };

    const a1_joyOptions = {
            value: this.state.agent1.joyScore,
            colors: [
                        { from: 0, to: 30, color: 'red' },
                        { from: 30, to: 100, color: 'lime' }
                    ]
    };
    const a2_joyOptions = {
            value: this.state.agent2.joyScore,
            colors: [
                        { from: 0, to: 30, color: 'red' },
                        { from: 30, to: 100, color: 'lime' }
                    ]
    };

    const a1_fearOptions = {
            value: this.state.agent1.fearScore,
            colors: [
                        { from: 0, to: 30, color: 'yellow' },
                        { from: 30, to: 60, color: 'orange' },
                        { from: 60, to: 100, color: 'red' }
                    ]
    };
    const a2_fearOptions = {
            value: this.state.agent2.fearScore,
            colors: [
                        { from: 0, to: 30, color: 'yellow' },
                        { from: 30, to: 60, color: 'orange' },
                        { from: 60, to: 100, color: 'red' }
                    ]
    };

    const a1_disgustOptions = {
            value: this.state.agent1.disgustScore,
            colors: [
                        { from: 0, to: 30, color: 'yellow' },
                        { from: 30, to: 60, color: 'orange' },
                        { from: 60, to: 100, color: 'red' }
                    ]
    };
    const a2_disgustOptions = {
            value: this.state.agent2.disgustScore,
            colors: [
                        { from: 0, to: 30, color: 'yellow' },
                        { from: 30, to: 60, color: 'orange' },
                        { from: 60, to: 100, color: 'red' }
                    ]
    };

    const a1_angerOptions = {
            value: this.state.agent1.angerScore,
            colors: [
                        { from: 0, to: 30, color: 'yellow' },
                        { from: 30, to: 60, color: 'orange' },
                        { from: 60, to: 100, color: 'red' }
                    ]
    };
    const a2_angerOptions = {
            value: this.state.agent2.angerScore,
            colors: [
                        { from: 0, to: 30, color: 'yellow' },
                        { from: 30, to: 60, color: 'orange' },
                        { from: 60, to: 100, color: 'red' }
                    ]
    };

    return (
      <div className="App">
        <div className="columns">
          <span>Phone status: {this.state.agent1.phoneStatus} </span> &nbsp;
          <button onClick={() => this.clearTranscript("120")}>Clear Transcript</button> &nbsp;
          <button disabled={this.state.agent1.cannotRecord} onClick={() => this.recordingCall("120")}>{this.state.agent1.recordingButtonName}</button> &nbsp;
          <button onClick={() => this.enableTranslation("120")}>{this.state.agent1.buttonName}</button> &nbsp;
          <button onClick={() => this.superviseAgents("120")}>Monitor 120</button> &nbsp;
          <br/><br/>
          <div className="conversations">
            {this.agent1Items}
          </div>
          <span>Phone status: {this.state.agent2.phoneStatus} </span> &nbsp;
          <button onClick={() => this.clearTranscript("122")}>Clear Transcript</button> &nbsp;
          <button disabled={this.state.agent2.cannotRecord} onClick={() => this.recordingCall("122")}>{this.state.agent2.recordingButtonName}</button> &nbsp;
          <button onClick={() => this.enableTranslation("122")}>{this.state.agent2.buttonName}</button> &nbsp;
          <button onClick={() => this.superviseAgents("122")}>Monitor 122</button> &nbsp;
          <br/><br/>
          <div className="conversations">
            {this.agent2Items}
          </div>
        </div>
        <div className="columns">
          <div className="infoColumn">
              <div>
              <ArcGauge {...a1_sentimentOptions} arcCenterRender={arcCenterRenderer} />
              Sentiment
              </div>
              <div>
              <ArcGauge {...a1_sadnessOptions} arcCenterRender={arcCenterRenderer} />
              Sadness
              </div>
              <div>
              <ArcGauge {...a1_joyOptions} arcCenterRender={arcCenterRenderer} />
              Joy
              </div>
              <div>
              <ArcGauge {...a1_fearOptions} arcCenterRender={arcCenterRenderer} />
              Fear
              </div>
              <div>
                <ArcGauge {...a1_disgustOptions} arcCenterRender={arcCenterRenderer} />
              Disgust
              </div>
              <div>
                <ArcGauge {...a1_angerOptions} arcCenterRender={arcCenterRenderer} />
              Anger
              </div>
          </div>
          <div className="infoColumn">
              <div>
              <ArcGauge {...a2_sentimentOptions} arcCenterRender={arcCenterRenderer} />
              Sentiment
              </div>
              <div>
              <ArcGauge {...a2_sadnessOptions} arcCenterRender={arcCenterRenderer} />
              Sadness
              </div>
              <div>
              <ArcGauge {...a2_joyOptions} arcCenterRender={arcCenterRenderer} />
              Joy
              </div>
              <div>
              <ArcGauge {...a2_fearOptions} arcCenterRender={arcCenterRenderer} />
              Fear
              </div>
              <div>
                <ArcGauge {...a2_disgustOptions} arcCenterRender={arcCenterRenderer} />
              Disgust
              </div>
              <div>
                <ArcGauge {...a2_angerOptions} arcCenterRender={arcCenterRenderer} />
              Anger
              </div>
          </div>
        </div>
      </div>
    );
  }
}
