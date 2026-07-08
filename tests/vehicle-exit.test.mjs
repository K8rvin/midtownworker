// Regression: body.enable must be set unconditionally on exit
let enable = false;

function enterVehicle() {
  enable = false;
}

function exitVehicleBuggy() {
  enable && (enable = true);
}

function exitVehicleFixed() {
  enable = true;
}

enterVehicle();
exitVehicleBuggy();
if (enable !== false) throw new Error('Buggy exit should leave body disabled');

enable = false;
enterVehicle();
exitVehicleFixed();
if (enable !== true) throw new Error('Fixed exit should enable body');

console.log('Vehicle exit body enable test passed');