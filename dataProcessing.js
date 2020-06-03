import trilat from "trilat";
import * as Params from "./params.js";

export function processLocationData(beaconLocations, jsonLocData) {
    const inputArrForTrilat = [];
    for (const key in jsonLocData)
        inputArrForTrilat.push([beaconLocations[key][0], beaconLocations[key][1], jsonLocData[key]])
    return trilat(inputArrForTrilat)
}

export function sendLocationData(socket, deviceId, coords) {
    socket.emit('locData', {'deviceId': deviceId, 'coords': coords})
}

export function sendSensorData(socket, deviceId, data) {
    socket.emit('sensData', {'deviceId': deviceId} + data)
}

export function sendAlarm(socket, deviceId) {
    socket.emit('alarm', {'deviceId': deviceId})
}

export function addNewDataToSample(sample, data) {
    sample.value = ((sample.value * sample.count) + data) / (sample.count + 1)
    sample.count++;
}

const samples = new Map();

export function processSensorData(socket, deviceId, jsonSensData) {
    const heartRate = jsonSensData['hr'];
    const oxygenSaturation = jsonSensData['spo2'];
    let s;
    if (samples.has(deviceId)) {
        s = samples.get(deviceId)
        addNewDataToSample(s, heartRate)
        addNewDataToSample(s, oxygenSaturation)
    } else {
        samples.set(deviceId, {hr: {count: 1, value: heartRate}, spo2: {count: 1, value: oxygenSaturation}})
        s = samples.get(deviceId)
    }
    if ((heartRate >= Math.min(Params.CRIT_PULSE, (s.hr + s.hr * Params.BORDER_PULSE))) ||
        (oxygenSaturation <= Math.max(Params.CRIT_SPO2, s.spo2 - s.spo2 * Params.BORDER_SPO2)))
        sendAlarm(socket, deviceId) // !!! ALARM !!! Swimmer is drowning !!!
    return {hr: heartRate, spo2: oxygenSaturation}
}

export const getDeviceId = (topic) => topic.split('/')[0]