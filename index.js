'use strict';

const fs = require('fs');
const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const mqtt = require('mqtt');
const trilat = require('trilat');

let mqttOptions = {
    port: 1883,
    host: 'mqtt://192.168.1.38'
};
let client = mqtt.connect(mqttOptions.host, mqttOptions);

client.on('connect', function () {
    client.subscribe('#');
})

const beaconLocations = JSON.parse(fs.readFileSync('configs/beaconLocations_config.json', 'utf8'));

function processLocationData(jsonLocData) {
    const inputArrForTrilat = [];
    for (const key in jsonLocData)
        inputArrForTrilat.push([beaconLocations[key][0], beaconLocations[key][1], jsonLocData[key]])
    return trilat(inputArrForTrilat)
}


server.listen(8090);
const webUIConfiguration = JSON.parse(fs.readFileSync('configs/webUI_config.json', 'utf8'));
io.on('connection', (socket) => {

    function sendData(deviceId, coords) {
        socket.emit('data', {'deviceId': deviceId, 'coords': coords})
    }

    function sendAlarm(deviceId) {
        socket.emit('alarm', deviceId)
    }


    client.on('message', function (topic, message) {
        if (topic.endsWith("location_data"))
            sendData(topic.split('/')[0], processLocationData(JSON.parse(message.toString())));
    })

    sendAlarm("dsffs")
    console.log('New connection from address ' + socket.request.connection.remoteAddress +
        " (port " + socket.request.connection.remotePort + ")");
    socket.emit('config', webUIConfiguration);
    socket.on('isSwimmingAllowedChangeEvent', (data) => {
        client.publish('isSwimmingAllowed', data)
    });
});