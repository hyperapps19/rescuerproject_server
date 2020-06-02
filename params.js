// Critical values
export const CRIT_SPO2 = 90; // (%)
export const CRIT_PULSE = 140; // (beats per minute)

// Normal deviations
export const BORDER_SPO2 = 20 / 100; // (%)
export const BORDER_PULSE = 20 / 100; // (%)

export const mqttOptions = {
    port: 1883,
    host: 'mqtt://192.168.1.38'
};

export const socketIOPort = 8090;
export const loggingLevel = "debug";