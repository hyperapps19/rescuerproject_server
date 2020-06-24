'use strict';
import * as DP from "./dataProcessing.js";
import {loggingLevel, mqttOptions, socketIOPort} from "./params.js";

import mqtt from "mqtt";
import fs from "fs";
import express from "express";
import {Server} from "http";
import socket from "socket.io";
import log4js from "log4js";
import microtime from "microtime";
import trilat from "trilat";

const logger = log4js.getLogger();
logger.level = loggingLevel;

const app = express();
const server = Server(app);
const io = socket(server);
server.listen(socketIOPort);

const beaconLocations = JSON.parse(fs.readFileSync('configs/beaconLocations_config.json', 'utf8'));
const webUIConfiguration = JSON.parse(fs.readFileSync('configs/webUI_config.json', 'utf8'));
const client = mqtt.connect(mqttOptions.host, mqttOptions);

client.on('connect', function () {
    client.subscribe('#');
    setInterval(() => {
        client.publish("time", microtime.now().toString())
    }, 1)
})

let alarm, receive;
let inputTrilat = new Map();
let coords;
let needSend = false;

function updateLocation() {

    if (inputTrilat.has('2') && inputTrilat.has('4') && inputTrilat.has('1')) {
        const inputArrForTrilat = [];
        inputTrilat.forEach((v, k) => {
            inputArrForTrilat.push([beaconLocations[k][0], beaconLocations[k][1], v]);
        })
        coords = trilat(inputArrForTrilat)
        needSend = true;
    }
}

client.on('message', function (topic, message) {

    if (topic.endsWith("location_data"))
        DP.sendLocationData(socket, DP.getDeviceId(topic), DP.processLocationData(beaconLocations, JSON.parse(message.toString())));
    else if (topic.endsWith("sensor_data")) {
        const dId = DP.getDeviceId(topic);
        DP.sendSensorData(socket, dId, DP.processSensorData(socket, dId, JSON.parse(message.toString())));
    } else if (topic.endsWith("sync_time"))
        client.publish("time", microtime.now().toString())
    else if (topic.endsWith("alarm")) {
        console.log("alarm")
        alarm = microtime.now();
    } else if (topic.endsWith("receive")) {
        console.log("receive")
        receive = microtime.now();
        console.log(receive - alarm)
    } else if (topic.startsWith("distances")) {
        inputTrilat.set(topic.split('/')[1], parseFloat(message.toString()))
        updateLocation();
        console.log(inputTrilat)
    }

})

io.on('connection', (socket) => {
    socket.emit('config', webUIConfiguration);
    logger.debug('New connection from WebUI: address ' + socket.request.connection.remoteAddress +
        " port " + socket.request.connection.remotePort);
    socket.on('isSwimmingAllowedChangeEvent', (data) => {
        client.publish('isSwimmingAllowed', data)
        logger.debug('isSwimmingAllowed change: new value = ' + data);
    });
    setInterval(() => {
        if (needSend) {
            DP.sendLocationData(socket, "device", coords)
            needSend = false;
            console.log(coords)
            console.log("data sent")
        }
    }, 100)
});