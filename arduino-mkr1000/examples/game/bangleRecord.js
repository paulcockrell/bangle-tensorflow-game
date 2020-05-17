/* On Linux, BLE normally needs admin right to be able to access BLE
 *
 * sudo setcap cap_net_raw+eip $(eval readlink -f `which node`)
 */

var noble = require('noble');

var ADDRESS = "ff:a0:c7:07:8c:29";
var COMMAND = "\x03\x10clearInterval()\n\x10setInterval(function() {LED.toggle()}, 500);\n\x10print('Hello World')\n";

var btDevice;
var txCharacteristic;
var rxCharacteristic;

noble.on('stateChange', function(state) {
 console.log("Noble: stateChange -> "+state);
  if (state=="poweredOn")
    noble.startScanning([], true);
});

noble.on('discover', function(dev) {
  console.log("Found device: ",dev.address);
  if (dev.address != ADDRESS) return;
  noble.stopScanning();
  connect(dev, function() {
    // Connected!
    write(COMMAND, function() {
      btDevice.disconnect();
    });
  });
});



function connect(dev, callback) {
  btDevice = dev;
  console.log("BT> Connecting");
  btDevice.on('disconnect', function() {
    console.log("Disconnected");
  });
  btDevice.connect(function (error) {
    if (error) {
      console.log("BT> ERROR Connecting",error);
      btDevice = undefined;
      return;
    }
    console.log("BT> Connected");
    btDevice.discoverAllServicesAndCharacteristics(function(error, services, characteristics) {
      function findByUUID(list, uuid) {
        for (var i=0;i<list.length;i++)
          if (list[i].uuid==uuid) return list[i];
        return undefined;
      }

      var btUARTService = findByUUID(services, "6e400001b5a3f393e0a9e50e24dcca9e");
      txCharacteristic = findByUUID(characteristics, "6e400002b5a3f393e0a9e50e24dcca9e");
      rxCharacteristic = findByUUID(characteristics, "6e400003b5a3f393e0a9e50e24dcca9e");
      if (error || !btUARTService || !txCharacteristic || !rxCharacteristic) {
        console.log("BT> ERROR getting services/characteristics");
        console.log("Service "+btUARTService);
        console.log("TX "+txCharacteristic);
        console.log("RX "+rxCharacteristic);
        btDevice.disconnect();
        txCharacteristic = undefined;
        rxCharacteristic = undefined;
        btDevice = undefined;
        return openCallback();
      }

      rxCharacteristic.on('data', function (data) {
        var s = "";
        for (var i=0;i<data.length;i++) s+=String.fromCharCode(data[i]);
        console.log("Received", JSON.stringify(s));
      });
      rxCharacteristic.subscribe(function() {
        callback();
      });
    });
  });
};

function write(data, callback) {  
  function writeAgain() {
    if (!data.length) return callback();
    var d = data.substr(0,20);
    data = data.substr(20);
    var buf = new Buffer(d.length);
    for (var i = 0; i < buf.length; i++)
      buf.writeUInt8(d.charCodeAt(i), i);
    txCharacteristic.write(buf, false, writeAgain);
  }
  writeAgain();
}

function disconnect() {
  btDevice.disconnect();
}
