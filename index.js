'use strict';
import * as DP from "./dataProcessing.js";
import {mqttOptions, socketIOPort, loggingLevel} from "./params.js";

import mqtt from "mqtt";
import fs from "fs";
import express from "express";
import {Server} from "http";
import socket from "socket.io";
import log4js from "log4js";

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
})
client.on('message', function (topic, message) {
    if (topic.endsWith("location_data"))
        DP.sendLocationData(socket, DP.getDeviceId(topic), DP.processLocationData(beaconLocations, JSON.parse(message.toString())));
    if (topic.endsWith("sensor_data")) {
        const dId = DP.getDeviceId(topic);
        DP.sendSensorData(socket, dId, DP.processSensorData(socket, dId, JSON.parse(message.toString())));
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
    //DP.sendAlarm(socket, "yhaaaaa")
});