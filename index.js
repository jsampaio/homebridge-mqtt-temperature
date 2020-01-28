var Service, Characteristic;
var mqtt    = require('mqtt');

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-mqtt-temperatureAndHumidity", "mqtt-temperatureAndHumidity", TemperatureAndHumidityAccessory);
}

function TemperatureAndHumidityAccessory(log, config) {
  this.log = log;
  this.name = config["name"];
  this.url = config['url'];
  this.topic = config['topic'];
  this.client_Id = 'mqttjs_' + Math.random().toString(16).substr(2, 8);
  this.options = {
    keepalive: 10,
    clientId: this.client_Id,
		protocolId: 'MQTT',
    protocolVersion: 4,
		clean: true,
		reconnectPeriod: 1000,
		connectTimeout: 30 * 1000,
    serialnumber: config["serial"] || this.client_Id,
		username: config["username"],
		password: config["password"],
		rejectUnauthorized: false
    };

  this.temperatureService = new Service.TemperatureSensor(this.name);
  this.humidityService = new Service.HumiditySensor(this.name);

  this.temperatureService
    .getCharacteristic(Characteristic.CurrentTemperature)
    .setProps({minValue: -10, maxValue: 50})
    .on('get', this.getStateTemperature.bind(this));

  this.humidityService
    .getCharacteristic(Characteristic.CurrentRelativeHumidity)
    .setProps({ minValue: 0, maxValue: 100 })
    .on("get", this.getStateHumidity.bind(this));

  this.client  = mqtt.connect(this.url, this.options);
  this.client.subscribe(this.topic);

  var that = this;
  this.client.on('message', function (topic, message) {
    try {
      data = JSON.parse(message);
      that.temperature = data.temperature; that.humidity = data.humidity;
    } catch (e) {
      that.log.debug('mqtt message not understood:'+message.toString());
      return null;
    }
    that.temperatureService
      .getCharacteristic(Characteristic.CurrentTemperature).updateValue(that.temperature);
    that.humidityService
      .getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(that.humidity);
  });
}


TemperatureAndHumidityAccessory.prototype.getStateTemperature = function(callback) {
  this.log.debug("Get Temperature Called: " + this.temperature);
  callback(null, this.temperature);
  return;
}

TemperatureAndHumidityAccessory.prototype.getStateHumidity = function(callback) {
  this.log.debug("Get Humidity Called: " + this.humidity);
  callback(null, this.humidity);
  return;
}


TemperatureAndHumidityAccessory.prototype.getServices = function() {
  // you can OPTIONALLY create an information service if you wish to override
  // the default values for things like serial number, model, etc.

  var informationService = new Service.AccessoryInformation();
  informationService
    .setCharacteristic(Characteristic.Manufacturer, "MQTT Sensor")
    .setCharacteristic(Characteristic.Model, "MQTT Temperature")
    .setCharacteristic(Characteristic.SerialNumber, this.options["serialnumber"]);

  return [informationService, this.temperatureService, this.humidityService];
}
