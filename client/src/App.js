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

//import mylib from "myscript";

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
        id: 0,
        customer : {
          sentenceSentimentScore: 0,
          wordCount: 0,
          sentimentScore: 0,
          sadnessScore: 0,
          joyScore: 0,
          fearScore: 0,
          disgustScore: 0,
          angerScore: 0
        },
        agent: {
          sentenceSentimentScore: 0,
          wordCount: 0,
          sentimentScore: 0,
          sadnessScore: 0,
          joyScore: 0,
          fearScore: 0,
          disgustScore: 0,
          angerScore: 0
        }
      },
      agent2: {
        cannotRecord: true,
        recordingButtonName: 'Start Recording',
        isRecording: false,
        buttonName: 'Enable Translation',
        doTranslation:  false,
        dialogue: [],
        phoneStatus: "idle",
        id: 0,
        customer : {
          sentenceSentimentScore: 0,
          wordCount: 0,
          sentimentScore: 0,
          sadnessScore: 0,
          joyScore: 0,
          fearScore: 0,
          disgustScore: 0,
          angerScore: 0
        },
        agent: {
          sentenceSentimentScore: 0,
          wordCount: 0,
          sentimentScore: 0,
          sadnessScore: 0,
          joyScore: 0,
          fearScore: 0,
          disgustScore: 0,
          angerScore: 0
        }
      }
    };
    this.isLoggedIn = false;
    //this.eventSource = new EventSource('http://localhost:5000/events');
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
      this.update = true
      // this is for just updating interim results from watson
      for (let i = 0; i < this.state.agent1.dialogue.length; i++) {
        if (this.state.agent1.dialogue[i].index === data.index){
          let items = [...this.state.agent1.dialogue];
          let item = {...items[i]};
          item.text = data.text;
          item.translation = data.translation;
          item.sentiment = data.sentenceSentimentScore;
          items[i] = item;

          this.setState(prevState => ({
              agent1: {                   // object that we want to update
                  ...prevState.agent1,    // keep all other key-value pairs
                  dialogue: items,         // update the value of specific key
                  id: data.id
              }
          }))
          this.update = false
          break
        }
      }
      // if the data is a new sentence, add to the dialog array
      if (this.update){
        this.state.agent1.dialogue.unshift(data)
        this.setState(prevState => ({
            agent1: {                   // object that we want to update
                ...prevState.agent1,    // keep all other key-value pairs
                dialogue: this.state.agent1.dialogue,       // update the value of specific key
                id: data.id
            }
        }))
      }
      if (data.final /*&& data.analysis.hasOwnProperty("sentimentScore")*/){
        if (data.id == 0){
          this.setState(prevState => ({
              agent1: {                   // object that we want to update
                  ...prevState.agent1,    // keep all other key-value pairs
                  customer : {
                    wordCount: data.wordCount,
                    sentimentScore: data.analysis.sentimentScore,
                    sadnessScore: data.analysis.sadnessScore,
                    joyScore: data.analysis.joyScore,
                    fearScore: data.analysis.fearScore,
                    disgustScore: data.analysis.disgustScore,
                    angerScore: data.analysis.angerScore
                  }
              }
          }))
        }else{
          this.setState(prevState => ({
              agent1: {                   // object that we want to update
                  ...prevState.agent1,    // keep all other key-value pairs
                  agent : {
                    wordCount: data.wordCount,
                    sentimentScore: data.analysis.sentimentScore,
                    sadnessScore: data.analysis.sadnessScore,
                    joyScore: data.analysis.joyScore,
                    fearScore: data.analysis.fearScore,
                    disgustScore: data.analysis.disgustScore,
                    angerScore: data.analysis.angerScore
                  }
              }
          }))
        }
      }
    }else if (data.agent === "122") {
      this.update = true
      for (let i = 0; i < this.state.agent2.dialogue.length; i++) {
        if (this.state.agent2.dialogue[i].index === data.index){
          let items = [...this.state.agent2.dialogue];
          let item = {...items[i]};
          //console.log("before: " + item.text)
          item.text = data.text;
          item.translation = data.translation;
          //item.sentenceSentimentScore = data.sentenceSentimentScore
          items[i] = item;

          //this.setState(Object.assign({}, {dialogue: items}));
          this.setState(prevState => ({
              agent2: {                   // object that we want to update
                  ...prevState.agent2,    // keep all other key-value pairs
                  dialogue: items,       // update the value of specific key
                  id: data.id
              }
          }))
          this.update = false
          break
        }
      }
      if (this.update){
        this.state.agent2.dialogue.unshift(data)
        //this.setState(Object.assign({}, {dialogue: this.state.agent2.dialogue}));
        this.setState(prevState => ({
            agent2: {                   // object that we want to update
                ...prevState.agent2,    // keep all other key-value pairs
                dialogue: this.state.agent2.dialogue,       // update the value of specific key
                id: data.id
            }
        }))
      }

      if (data.final /*&& data.analysis.hasOwnProperty("sentimentScore")*/){
        if (data.id == 0){
          this.setState(prevState => ({
              agent2: {                   // object that we want to update
                  ...prevState.agent2,    // keep all other key-value pairs
                  customer : {
                    wordCount: data.wordCount,
                    sentimentScore: data.analysis.sentimentScore,
                    sadnessScore: data.analysis.sadnessScore,
                    joyScore: data.analysis.joyScore,
                    fearScore: data.analysis.fearScore,
                    disgustScore: data.analysis.disgustScore,
                    angerScore: data.analysis.angerScore
                  }
              }
          }))
        }else{
          this.setState(prevState => ({
              agent2: {                   // object that we want to update
                  ...prevState.agent2,    // keep all other key-value pairs
                  agent : {
                    wordCount: data.wordCount,
                    sentimentScore: data.analysis.sentimentScore,
                    sadnessScore: data.analysis.sadnessScore,
                    joyScore: data.analysis.joyScore,
                    fearScore: data.analysis.fearScore,
                    disgustScore: data.analysis.disgustScore,
                    angerScore: data.analysis.angerScore
                  }
              }
          }))
        }
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
              id:0,
              customer: {
                wordCount: 0,
                sentimentScore: 0,
                sadnessScore: 0,
                joyScore: 0,
                fearScore: 0,
                disgustScore: 0,
                angerScore: 0
              },
              agent : {
                wordCount: 0,
                sentimentScore: 0,
                sadnessScore: 0,
                joyScore: 0,
                fearScore: 0,
                disgustScore: 0,
                angerScore: 0
              }
          }
      }))
    }else{
      this.setState(prevState => ({
          agent2: {
              ...prevState.agent2,
              dialogue: [],
              id: 0,
              customer: {
                wordCount: 0,
                sentimentScore: 0,
                sadnessScore: 0,
                joyScore: 0,
                fearScore: 0,
                disgustScore: 0,
                angerScore: 0
              },
              agent : {
                wordCount: 0,
                sentimentScore: 0,
                sadnessScore: 0,
                joyScore: 0,
                fearScore: 0,
                disgustScore: 0,
                angerScore: 0
              }
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
    if (this.state.agent1.doTranslation){
      this.agent1Items = this.state.agent1.dialogue.map(item =>
        {
        if (item.sentiment > 0.4)
          return <div><div className="positive">{item.index}. {item.name}: {item.text}</div><div className="translation">{item.index}. Translated: {item.translation}</div></div>
        else if (item.sentiment < -0.4)
          return <div><div className="negative">{item.index}. {item.name}: {item.text}</div><div className="translation">{item.index}. Translated: {item.translation}</div></div>
        else
          return <div><div>{item.index}. {item.name}: {item.text}</div><div className="translation">{item.index}. Translated: {item.translation}</div></div>
        }
      );
    }else{
      this.agent1Items = this.state.agent1.dialogue.map(item =>
        {
        if (item.sentiment > 0.4)
          return <div><div className="positive">{item.index}. {item.name}: {item.text}</div></div>
        else if (item.sentiment < -0.4)
          return <div><div className="negative">{item.index}. {item.name}: {item.text}</div></div>
        else
          return <div><div>{item.index}. {item.name}: {item.text}</div></div>
        }
      );
    }
    if (this.state.agent2.doTranslation){
      this.agent2Items = this.state.agent2.dialogue.map(item =>
        {
        if (item.sentiment > 0.4)
          return <div><div className="positive">{item.index}. {item.name}: {item.text}</div><div className="translation">{item.index}. Translated: {item.translation}</div></div>
        else if (item.sentiment < -0.4)
          return <div><div className="negative">{item.index}. {item.name}: {item.text}</div><div className="translation">{item.index}. Translated: {item.translation}</div></div>
        else
          return <div><div>{item.index}. {item.name}: {item.text}</div><div className="translation">{item.index}. Translated: {item.translation}</div></div>
        }
      );
    }else{
      this.agent2Items = this.state.agent2.dialogue.map(item =>
        {
        if (item.sentiment > 0.4)
          return <div><div className="positive">{item.index}. {item.name}: {item.text}</div></div>
        else if (item.sentiment < -0.4)
          return <div><div className="negative">{item.index}. {item.name}: {item.text}</div></div>
        else
          return <div><div>{item.index}. {item.name}: {item.text}</div></div>
        }
      );
    }
    // calculate speaking %
    const a1TotalWord = this.state.agent1.customer.wordCount + this.state.agent1.agent.wordCount
    this.a1Customer = (this.state.agent1.customer.wordCount / a1TotalWord) * 100
    this.a1Agent = (this.state.agent1.agent.wordCount / a1TotalWord) * 100

    const a2TotalWord = this.state.agent2.customer.wordCount + this.state.agent2.agent.wordCount
    this.a2Customer = (this.state.agent2.customer.wordCount / a2TotalWord) * 100
    this.a2Agent = (this.state.agent2.agent.wordCount / a2TotalWord) * 100

    return (
      <div className="App">
        <div className="columns">
          <span>Phone status: {this.state.agent1.phoneStatus} </span> &nbsp;
          <button onClick={() => this.clearTranscript("120")}>Clear Transcript</button> &nbsp;
          <button disabled={this.state.agent1.cannotRecord} onClick={() => this.recordingCall("120")}>{this.state.agent1.recordingButtonName}</button> &nbsp;
          <button onClick={() => this.enableTranslation("120")}>{this.state.agent1.buttonName}</button> &nbsp;
          <br/><br/>
          <div className="conversations">
            {this.agent1Items}
          </div>
          <span>Phone status: {this.state.agent2.phoneStatus} </span> &nbsp;
          <button onClick={() => this.clearTranscript("122")}>Clear Transcript</button> &nbsp;
          <button disabled={this.state.agent2.cannotRecord} onClick={() => this.recordingCall("122")}>{this.state.agent2.recordingButtonName}</button> &nbsp;
          <button onClick={() => this.enableTranslation("122")}>{this.state.agent2.buttonName}</button> &nbsp;
          <br/><br/>
          <div className="conversations">
            {this.agent2Items}
          </div>
        </div>
        <div className="columns">
          <div>
            <div><span className="reportHeader"> Customer: (Speaking chance => {this.a1Customer.toFixed(1)}% - Spoken => {this.state.agent1.customer.wordCount} words)</span>
              <div className="infoColumn">
                  <div>Sentiment: {this.state.agent1.customer.sentimentScore}</div>
                  <div>Sadness: {this.state.agent1.customer.sadnessScore}</div>
                  <div>Joy: {this.state.agent1.customer.joyScore}</div>
                  <div>Fear: {this.state.agent1.customer.fearScore}</div>
                  <div>Disgust: {this.state.agent1.customer.disgustScore}</div>
                  <div>Anger: {this.state.agent1.customer.angerScore}</div>
              </div>
            </div>
            <div><span className="reportHeader"> Agent: (Speaking chance => {this.a1Agent.toFixed(1)}% - Spoken => {this.state.agent1.agent.wordCount} words)</span>
              <div className="infoColumn">
                  <div>Sentiment: {this.state.agent1.agent.sentimentScore}</div>
                  <div>Sadness: {this.state.agent1.agent.sadnessScore}</div>
                  <div>Joy: {this.state.agent1.agent.joyScore}</div>
                  <div>Fear: {this.state.agent1.agent.fearScore}</div>
                  <div>Disgust: {this.state.agent1.agent.disgustScore}</div>
                  <div>Anger: {this.state.agent1.agent.angerScore}</div>
              </div>
            </div>
          </div>
          <div>
            <div><span className="reportHeader"> Customer: (Speaking chance => {this.a2Customer.toFixed(1)}% - Spoken => {this.state.agent2.customer.wordCount} words)</span>
              <div className="infoColumn">
                  <div>Sentiment: {this.state.agent2.customer.sentimentScore} </div>
                  <div>Sadness: {this.state.agent2.customer.sadnessScore} </div>
                  <div>Joy: {this.state.agent2.customer.joyScore} </div>
                  <div>Fear: {this.state.agent2.customer.fearScore} </div>
                  <div>Disgust: {this.state.agent2.customer.disgustScore} </div>
                  <div>Anger: {this.state.agent2.customer.angerScore} </div>
              </div>
            </div>
            <div><span className="reportHeader"> Agent: (Speaking chance => {this.a2Agent.toFixed(1)}% - Spoken => {this.state.agent2.agent.wordCount} words)</span>
              <div className="infoColumn">
                  <div>Sentiment: {this.state.agent2.customer.sentimentScore} </div>
                  <div>Sadness: {this.state.agent2.customer.sadnessScore} </div>
                  <div>Joy: {this.state.agent2.customer.joyScore} </div>
                  <div>Fear: {this.state.agent2.customer.fearScore} </div>
                  <div>Disgust: {this.state.agent2.customer.disgustScore} </div>
                  <div>Anger: {this.state.agent2.customer.angerScore} </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
